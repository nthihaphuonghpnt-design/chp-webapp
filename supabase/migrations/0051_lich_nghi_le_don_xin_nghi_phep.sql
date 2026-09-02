-- ============================================================================
-- Module Cham cong (Phase 2/4): Lich nghi le + Don xin nghi phep.
--
-- Lich nghi le: chi luu danh sach ngay le, KHONG tu insert cham_cong cho
-- tung nhan vien — ngay le duoc tinh la "Nghi le" ngay tren giao dien khi
-- hien thi (xem trangThaiHienThi trong src/lib/chamCong.ts), tranh phai
-- dong bo lai moi khi danh sach nhan vien thay doi.
--
-- Don xin nghi phep: nhan vien tu gui, Ke toan/Giam doc duyet. Khi duyet
-- ("Da duyet"), trigger tu dong ghi cham_cong = 'Nghi phep' cho tung ngay
-- trong khoang xin nghi (co diem danh nguoi duyet + thoi gian dieu chinh,
-- giong moi dieu chinh cham cong khac).
-- ============================================================================

create table if not exists lich_nghi_le (
  id uuid primary key default gen_random_uuid(),
  ngay date not null unique,
  ten text not null,
  dang_hoat_dong boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on lich_nghi_le
  for each row execute function set_updated_at();

alter table lich_nghi_le enable row level security;

create policy "lich_nghi_le_select" on lich_nghi_le for select to authenticated using (true);
create policy "lich_nghi_le_insert" on lich_nghi_le for insert to authenticated
  with check (current_phong_ban() in ('Kế toán', 'Giám đốc'));
create policy "lich_nghi_le_update" on lich_nghi_le for update to authenticated
  using (current_phong_ban() in ('Kế toán', 'Giám đốc'));
create policy "lich_nghi_le_delete" on lich_nghi_le for delete to authenticated
  using (current_phong_ban() in ('Kế toán', 'Giám đốc'));

create table if not exists don_xin_nghi_phep (
  id uuid primary key default gen_random_uuid(),
  nhan_vien_id uuid not null references nhan_vien(id) on delete cascade,
  ngay_bat_dau date not null,
  ngay_ket_thuc date not null,
  ly_do text,
  trang_thai text not null default 'Chờ duyệt' check (trang_thai in ('Chờ duyệt', 'Đã duyệt', 'Từ chối')),
  nguoi_duyet_id uuid references nhan_vien(id),
  thoi_gian_duyet timestamptz,
  ghi_chu_duyet text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ngay_ket_thuc >= ngay_bat_dau)
);

create trigger set_updated_at before update on don_xin_nghi_phep
  for each row execute function set_updated_at();

create index if not exists idx_don_xin_nghi_phep_nhan_vien on don_xin_nghi_phep (nhan_vien_id);

-- ----------------------------------------------------------------------------
-- Khi don duoc duyet -> ghi cham_cong = 'Nghỉ phép' cho tung ngay trong
-- khoang xin nghi (upsert, ghi vet nguoi duyet nhu 1 lan dieu chinh).
-- ----------------------------------------------------------------------------
create or replace function auto_ghi_cham_cong_khi_duyet_nghi_phep()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  d date;
begin
  if new.trang_thai = 'Đã duyệt' and (old.trang_thai is distinct from 'Đã duyệt') then
    d := new.ngay_bat_dau;
    while d <= new.ngay_ket_thuc loop
      if extract(dow from d) <> 0 then
        insert into cham_cong (nhan_vien_id, ngay, trang_thai, nguoi_dieu_chinh_id, ly_do_dieu_chinh, thoi_gian_dieu_chinh)
        values (new.nhan_vien_id, d, 'Nghỉ phép', new.nguoi_duyet_id, 'Duyệt đơn xin nghỉ phép', now())
        on conflict (nhan_vien_id, ngay) do update
          set trang_thai = 'Nghỉ phép',
              nguoi_dieu_chinh_id = new.nguoi_duyet_id,
              ly_do_dieu_chinh = 'Duyệt đơn xin nghỉ phép',
              thoi_gian_dieu_chinh = now();
      end if;
      d := d + 1;
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists after_duyet_nghi_phep on don_xin_nghi_phep;
create trigger after_duyet_nghi_phep
  after update on don_xin_nghi_phep
  for each row execute function auto_ghi_cham_cong_khi_duyet_nghi_phep();

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table don_xin_nghi_phep enable row level security;

create policy "don_xin_nghi_phep_select" on don_xin_nghi_phep for select to authenticated
  using (
    current_phong_ban() in ('Kế toán', 'Giám đốc')
    or nhan_vien_id in (select id from nhan_vien where auth_user_id = auth.uid())
  );

-- Nhan vien tu tao don cho chinh minh, ngay bat dau khong duoc la ngay da
-- qua (dung gio VN); Ke toan/Giam doc tao duoc cho bat ky ai, ngay nao.
create policy "don_xin_nghi_phep_insert" on don_xin_nghi_phep for insert to authenticated
  with check (
    (
      nhan_vien_id in (select id from nhan_vien where auth_user_id = auth.uid())
      and ngay_bat_dau >= (now() at time zone 'Asia/Ho_Chi_Minh')::date
      and trang_thai = 'Chờ duyệt'
    )
    or current_phong_ban() in ('Kế toán', 'Giám đốc')
  );

-- Duyet/tu choi: chi Ke toan/Giam doc.
create policy "don_xin_nghi_phep_update" on don_xin_nghi_phep for update to authenticated
  using (current_phong_ban() in ('Kế toán', 'Giám đốc'));
