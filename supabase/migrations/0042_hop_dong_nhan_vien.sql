-- ============================================================================
-- Hop dong nhan vien (hop dong lao dong) — cung mo hinh voi hop_dong_khach_hang
-- (0026, 0030): tu dong sinh dong "Chua co hop dong" khi them nhan vien moi,
-- tu chuyen "Da co hop dong" khi dinh kem tep xong. Khac voi hop dong khach
-- hang o cho: day la du lieu nhan su/luong nhay cam, nen CHI Ke toan/Giam doc
-- quan ly va xem duoc toan bo; nhan vien chi xem duoc dong cua chinh minh
-- (chua lam giao dien rieng cho nhan vien xem, RLS chuan bi san cho sau nay).
-- Sale/Chung tu/Hien truong/Dieu phoi KHONG xem duoc hop dong cua nguoi khac.
-- ============================================================================

create table if not exists hop_dong_nhan_vien (
  id uuid primary key default gen_random_uuid(),
  nhan_vien_id uuid not null references nhan_vien(id) on delete cascade,
  so_hop_dong text,
  loai_hop_dong text check (loai_hop_dong in ('Thử việc', 'Xác định thời hạn', 'Không xác định thời hạn', 'Khác')),
  chuc_vu text,
  ngay_hieu_luc date,
  ngay_het_han date,
  luong_theo_hop_dong numeric,
  trang_thai_hop_dong text not null default 'Chưa có hợp đồng'
    check (trang_thai_hop_dong in ('Chưa có hợp đồng', 'Đã có hợp đồng')),
  ghi_chu text,
  nguoi_tao_id uuid references nhan_vien(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on hop_dong_nhan_vien
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- Tu dong tao "Chua co hop dong" khi them nhan vien moi
-- ----------------------------------------------------------------------------
create or replace function auto_tao_hop_dong_nhan_vien()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into hop_dong_nhan_vien (nhan_vien_id, trang_thai_hop_dong) values (new.id, 'Chưa có hợp đồng');
  return new;
end;
$$;

drop trigger if exists after_nhan_vien_tao_hop_dong on nhan_vien;
create trigger after_nhan_vien_tao_hop_dong
  after insert on nhan_vien
  for each row execute function auto_tao_hop_dong_nhan_vien();

-- Nap san cho nhan vien da co tu truoc
insert into hop_dong_nhan_vien (nhan_vien_id, trang_thai_hop_dong)
select nv.id, 'Chưa có hợp đồng'
from nhan_vien nv
where not exists (select 1 from hop_dong_nhan_vien h where h.nhan_vien_id = nv.id);

-- ----------------------------------------------------------------------------
-- Dinh kem cho hop dong nhan vien
-- ----------------------------------------------------------------------------
alter table dinh_kem add column if not exists hop_dong_nhan_vien_id uuid references hop_dong_nhan_vien(id) on delete cascade;

do $$
begin
  if exists (
    select 1 from information_schema.table_constraints
    where table_name = 'dinh_kem' and constraint_name = 'dinh_kem_lien_ket_toi_check'
  ) then
    alter table dinh_kem drop constraint dinh_kem_lien_ket_toi_check;
  end if;
end $$;

alter table dinh_kem add constraint dinh_kem_lien_ket_toi_check check (lien_ket_toi in (
  'Tiếp nhận', 'Làm thủ tục', 'Thông quan', 'Giao hàng', 'Hoàn tất',
  'Chi phí phát sinh', 'Chi tiết vận chuyển', 'Thuê ngoài', 'Hợp đồng', 'Hóa đơn',
  'Hợp đồng nhân viên'
));

create or replace function auto_cap_nhat_trang_thai_hop_dong_nv()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.hop_dong_nhan_vien_id is not null then
    update hop_dong_nhan_vien set trang_thai_hop_dong = 'Đã có hợp đồng' where id = new.hop_dong_nhan_vien_id;
  end if;
  return new;
end;
$$;

drop trigger if exists after_dinh_kem_cap_nhat_hop_dong_nv on dinh_kem;
create trigger after_dinh_kem_cap_nhat_hop_dong_nv
  after insert on dinh_kem
  for each row execute function auto_cap_nhat_trang_thai_hop_dong_nv();

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table hop_dong_nhan_vien enable row level security;

create policy "hdnv_select" on hop_dong_nhan_vien for select to authenticated
  using (
    current_phong_ban() in ('Kế toán', 'Giám đốc')
    or nhan_vien_id in (select id from nhan_vien where auth_user_id = auth.uid())
  );
create policy "hdnv_insert" on hop_dong_nhan_vien for insert to authenticated
  with check (current_phong_ban() = 'Kế toán');
create policy "hdnv_update" on hop_dong_nhan_vien for update to authenticated
  using (current_phong_ban() = 'Kế toán');
create policy "hdnv_delete" on hop_dong_nhan_vien for delete to authenticated
  using (current_phong_ban() = 'Kế toán');

-- dinh_kem: mo rong 2 policy da co (0027) de xu ly them hop_dong_nhan_vien_id
drop policy if exists "dinh_kem_select" on dinh_kem;
create policy "dinh_kem_select" on dinh_kem for select to authenticated
  using (
    (hop_dong_id is null and hoa_don_id is null and hop_dong_nhan_vien_id is null)
    or (
      hop_dong_nhan_vien_id is not null
      and (
        current_phong_ban() in ('Kế toán', 'Giám đốc')
        or hop_dong_nhan_vien_id in (
          select h.id from hop_dong_nhan_vien h
          join nhan_vien nv on nv.id = h.nhan_vien_id
          where nv.auth_user_id = auth.uid()
        )
      )
    )
    or (
      (hop_dong_id is not null or hoa_don_id is not null)
      and current_phong_ban() in ('Sale', 'Chứng từ', 'Kế toán', 'Giám đốc')
    )
  );

drop policy if exists "dinh_kem_insert" on dinh_kem;
create policy "dinh_kem_insert" on dinh_kem for insert to authenticated
  with check (
    (hop_dong_id is null and hoa_don_id is null and hop_dong_nhan_vien_id is null)
    or (hop_dong_nhan_vien_id is not null and current_phong_ban() = 'Kế toán')
    or ((hop_dong_id is not null or hoa_don_id is not null) and current_phong_ban() in ('Chứng từ', 'Kế toán'))
  );

-- Storage: file trong thu muc hop-dong-nhan-vien/ chi Ke toan/Giam doc xem,
-- Ke toan them (giong logic hop-dong/, hoa-don/ nhung khong mo cho Sale/Chung tu).
drop policy if exists "dinh_kem_storage_select" on storage.objects;
create policy "dinh_kem_storage_select" on storage.objects for select to authenticated
  using (
    bucket_id = 'dinh-kem'
    and (
      (name not like 'hop-dong/%' and name not like 'hoa-don/%' and name not like 'hop-dong-nhan-vien/%')
      or (name like 'hop-dong-nhan-vien/%' and current_phong_ban() in ('Kế toán', 'Giám đốc'))
      or (
        (name like 'hop-dong/%' or name like 'hoa-don/%')
        and current_phong_ban() in ('Sale', 'Chứng từ', 'Kế toán', 'Giám đốc')
      )
    )
  );

drop policy if exists "dinh_kem_storage_insert" on storage.objects;
create policy "dinh_kem_storage_insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'dinh-kem'
    and (
      (name not like 'hop-dong/%' and name not like 'hoa-don/%' and name not like 'hop-dong-nhan-vien/%')
      or (name like 'hop-dong-nhan-vien/%' and current_phong_ban() = 'Kế toán')
      or ((name like 'hop-dong/%' or name like 'hoa-don/%') and current_phong_ban() in ('Chứng từ', 'Kế toán'))
    )
  );
