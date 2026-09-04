-- ============================================================================
-- Migration gop, sinh ra sau khi ra soat truc tiep database song (doi
-- chieu 56 migration voi schema/RLS/privilege thuc te qua introspection
-- query) — phat hien nhieu migration da GUI cho nguoi dung nhung CHUA
-- duoc chay: 0039 (bao mat luong — nghiem trong nhat), 0044 (tu dong chi
-- phi giao nhan), 0049 (trang thai Khong can hop dong), 0050+0051+0055
-- (cham cong, da gop san o 0056), va phan RLS cua 0052 (khong gom lai cot
-- ma_khach_hang vi da chu dong bo o 0053).
--
-- An toan chay lai nhieu lan (moi buoc deu idempotent).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0039 — Bao mat luong: thu hoi quyen SELECT truc tiep 2 cot nhay cam, chi
-- cho xem qua RPC co dieu kien. XAC NHAN QUA INTROSPECTION: "authenticated"
-- van dang co quyen SELECT truc tiep luong_co_dinh/muc_dong_bhxh — bat ky
-- nhan vien nao cung xem duoc luong cua TAT CA nguoi khac qua goi API
-- truc tiep (khong qua giao dien web). Vá NGAY.
-- ----------------------------------------------------------------------------
revoke select (luong_co_dinh, muc_dong_bhxh) on nhan_vien from authenticated;

create or replace function luong_cua_nhan_vien(p_nhan_vien_id uuid default null)
returns table (id uuid, luong_co_dinh numeric, muc_dong_bhxh numeric)
language sql
security definer
set search_path = public
stable
as $$
  select nv.id, nv.luong_co_dinh, nv.muc_dong_bhxh
  from nhan_vien nv
  where (
      current_phong_ban() in ('Kế toán', 'Giám đốc')
      or nv.auth_user_id = auth.uid()
    )
    and (p_nhan_vien_id is null or nv.id = p_nhan_vien_id);
$$;

grant execute on function luong_cua_nhan_vien(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 0044 — Tu dong sinh Chi phi giao nhan khi don hang chuyen "Hoan tat"
-- ----------------------------------------------------------------------------
create or replace function auto_sinh_chi_phi_giao_nhan_hoan_tat()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  so_bo numeric;
  co_keo_xe boolean;
  gia_theo_cont numeric;
  nhan_da_co boolean;
begin
  if new.trang_thai <> 'Hoàn tất' or old.trang_thai = 'Hoàn tất' then
    return new;
  end if;

  select coalesce(sum(psc.so_luong), 0) into so_bo
  from phat_sinh_chi_phi psc
  join loai_chi_phi lcp on lcp.id = psc.loai_chi_phi_id
  where psc.don_hang_id = new.id
    and psc.trang_thai <> 'Từ chối'
    and (lcp.ten ilike '%tự công bố%' or lcp.ten ilike '%an toàn thực phẩm%' or lcp.ten ilike '%attp%');

  if so_bo > 0 then
    if new.hien_truong_phu_trach_id is not null then
      select exists(
        select 1 from chi_phi_giao_nhan
        where don_hang_id = new.id and nhan_vien_id = new.hien_truong_phu_trach_id
          and loai = 'Làm tự công bố/ATTP (tự động)'
      ) into nhan_da_co;
      if not nhan_da_co then
        insert into chi_phi_giao_nhan (don_hang_id, loai, nhan_vien_id, thanh_tien, ghi_chu)
        values (new.id, 'Làm tự công bố/ATTP (tự động)', new.hien_truong_phu_trach_id, so_bo * 30000,
                format('Tự động: %s bộ x 30.000', so_bo));
      end if;
    end if;

    if new.chung_tu_phu_trach_id is not null then
      select exists(
        select 1 from chi_phi_giao_nhan
        where don_hang_id = new.id and nhan_vien_id = new.chung_tu_phu_trach_id
          and loai = 'Làm tự công bố/ATTP (tự động)'
      ) into nhan_da_co;
      if not nhan_da_co then
        insert into chi_phi_giao_nhan (don_hang_id, loai, nhan_vien_id, thanh_tien, ghi_chu)
        values (new.id, 'Làm tự công bố/ATTP (tự động)', new.chung_tu_phu_trach_id, so_bo * 20000,
                format('Tự động: %s bộ x 20.000', so_bo));
      end if;
    end if;
  end if;

  if new.dvt = 'Cont' and coalesce(new.so_luong, 0) > 0 and new.chung_tu_phu_trach_id is not null then
    select exists(select 1 from chi_tiet_van_chuyen where don_hang_id = new.id) into co_keo_xe;

    gia_theo_cont := case
      when new.loai_don_hang = 'Xuất' and co_keo_xe then 50000
      when new.loai_don_hang = 'Nhập' then 70000 + (case when co_keo_xe then 50000 else 0 end)
      else 0
    end;

    if gia_theo_cont > 0 then
      select exists(
        select 1 from chi_phi_giao_nhan
        where don_hang_id = new.id and nhan_vien_id = new.chung_tu_phu_trach_id
          and loai = 'Chi phí giao nhận theo cont (tự động)'
      ) into nhan_da_co;
      if not nhan_da_co then
        insert into chi_phi_giao_nhan (don_hang_id, loai, nhan_vien_id, thanh_tien, ghi_chu)
        values (
          new.id, 'Chi phí giao nhận theo cont (tự động)', new.chung_tu_phu_trach_id, gia_theo_cont * new.so_luong,
          format('Tự động: %s x %s cont%s', gia_theo_cont, new.so_luong, case when co_keo_xe then ' (có kéo xe)' else '' end)
        );
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists after_don_hang_hoan_tat_sinh_chi_phi_giao_nhan on don_hang;
create trigger after_don_hang_hoan_tat_sinh_chi_phi_giao_nhan
  after update on don_hang
  for each row execute function auto_sinh_chi_phi_giao_nhan_hoan_tat();

-- ----------------------------------------------------------------------------
-- 0049 — Trang thai "Khong can hop dong"
-- ----------------------------------------------------------------------------
do $$
declare
  cname text;
begin
  select conname into cname
  from pg_constraint
  where conrelid = 'hop_dong_khach_hang'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%trang_thai_hop_dong%';
  if cname is not null then
    execute format('alter table hop_dong_khach_hang drop constraint %I', cname);
  end if;
end $$;

alter table hop_dong_khach_hang add constraint hop_dong_khach_hang_trang_thai_hop_dong_check
  check (trang_thai_hop_dong in ('Chưa có hợp đồng', 'Đã có hợp đồng', 'Không cần hợp đồng'));

-- ----------------------------------------------------------------------------
-- 0052 (chi phan RLS — KHONG them lai cot ma_khach_hang, da chu dong bo
-- o 0053 theo yeu cau)
-- ----------------------------------------------------------------------------
drop policy if exists "nhom_khach_hang_insert" on nhom_khach_hang;
create policy "nhom_khach_hang_insert" on nhom_khach_hang for insert to authenticated
  with check (current_phong_ban() in ('Sale', 'Chứng từ', 'Kế toán', 'Giám đốc'));

-- ----------------------------------------------------------------------------
-- 0050 + 0051 + 0055 (cham cong) — noi dung giong het 0056, lap lai o day
-- de chi can chay 1 file duy nhat cho toan bo phan con thieu.
-- ----------------------------------------------------------------------------
alter table nhan_vien add column if not exists loai_nhan_su text not null default 'Cố định'
  check (loai_nhan_su in ('Cố định', 'Outsource'));
alter table nhan_vien add column if not exists ngay_vao_lam date;

create table if not exists cham_cong (
  id uuid primary key default gen_random_uuid(),
  nhan_vien_id uuid not null references nhan_vien(id) on delete cascade,
  ngay date not null,
  trang_thai text not null check (trang_thai in ('Đi làm', 'Nghỉ phép', 'Nghỉ lễ', 'Nghỉ không phép', 'Nghỉ khác')),
  ghi_chu text,
  nguoi_dieu_chinh_id uuid references nhan_vien(id),
  ly_do_dieu_chinh text,
  thoi_gian_dieu_chinh timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (nhan_vien_id, ngay)
);

drop trigger if exists set_updated_at on cham_cong;
create trigger set_updated_at before update on cham_cong
  for each row execute function set_updated_at();

create index if not exists idx_cham_cong_nhan_vien_ngay on cham_cong (nhan_vien_id, ngay);

alter table cham_cong enable row level security;

drop policy if exists "cham_cong_select" on cham_cong;
create policy "cham_cong_select" on cham_cong for select to authenticated
  using (
    current_phong_ban() in ('Kế toán', 'Giám đốc')
    or nhan_vien_id in (select id from nhan_vien where auth_user_id = auth.uid())
  );

drop policy if exists "cham_cong_insert" on cham_cong;
create policy "cham_cong_insert" on cham_cong for insert to authenticated
  with check (
    (
      nhan_vien_id in (select id from nhan_vien where auth_user_id = auth.uid())
      and ngay = (now() at time zone 'Asia/Ho_Chi_Minh')::date
      and trang_thai = 'Đi làm'
      and nguoi_dieu_chinh_id is null
      and current_phong_ban() not in ('Hiện trường', 'Sale')
    )
    or current_phong_ban() in ('Kế toán', 'Giám đốc')
  );

drop policy if exists "cham_cong_update" on cham_cong;
create policy "cham_cong_update" on cham_cong for update to authenticated
  using (current_phong_ban() in ('Kế toán', 'Giám đốc'));

create table if not exists lich_nghi_le (
  id uuid primary key default gen_random_uuid(),
  ngay date not null unique,
  ten text not null,
  dang_hoat_dong boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_updated_at on lich_nghi_le;
create trigger set_updated_at before update on lich_nghi_le
  for each row execute function set_updated_at();

alter table lich_nghi_le enable row level security;

drop policy if exists "lich_nghi_le_select" on lich_nghi_le;
create policy "lich_nghi_le_select" on lich_nghi_le for select to authenticated using (true);
drop policy if exists "lich_nghi_le_insert" on lich_nghi_le;
create policy "lich_nghi_le_insert" on lich_nghi_le for insert to authenticated
  with check (current_phong_ban() in ('Kế toán', 'Giám đốc'));
drop policy if exists "lich_nghi_le_update" on lich_nghi_le;
create policy "lich_nghi_le_update" on lich_nghi_le for update to authenticated
  using (current_phong_ban() in ('Kế toán', 'Giám đốc'));
drop policy if exists "lich_nghi_le_delete" on lich_nghi_le;
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

drop trigger if exists set_updated_at on don_xin_nghi_phep;
create trigger set_updated_at before update on don_xin_nghi_phep
  for each row execute function set_updated_at();

create index if not exists idx_don_xin_nghi_phep_nhan_vien on don_xin_nghi_phep (nhan_vien_id);

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

alter table don_xin_nghi_phep enable row level security;

drop policy if exists "don_xin_nghi_phep_select" on don_xin_nghi_phep;
create policy "don_xin_nghi_phep_select" on don_xin_nghi_phep for select to authenticated
  using (
    current_phong_ban() in ('Kế toán', 'Giám đốc')
    or nhan_vien_id in (select id from nhan_vien where auth_user_id = auth.uid())
  );

drop policy if exists "don_xin_nghi_phep_insert" on don_xin_nghi_phep;
create policy "don_xin_nghi_phep_insert" on don_xin_nghi_phep for insert to authenticated
  with check (
    (
      nhan_vien_id in (select id from nhan_vien where auth_user_id = auth.uid())
      and ngay_bat_dau >= (now() at time zone 'Asia/Ho_Chi_Minh')::date
      and trang_thai = 'Chờ duyệt'
      and current_phong_ban() not in ('Hiện trường', 'Sale')
    )
    or current_phong_ban() in ('Kế toán', 'Giám đốc')
  );

drop policy if exists "don_xin_nghi_phep_update" on don_xin_nghi_phep;
create policy "don_xin_nghi_phep_update" on don_xin_nghi_phep for update to authenticated
  using (current_phong_ban() in ('Kế toán', 'Giám đốc'));
