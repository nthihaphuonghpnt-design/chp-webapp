-- ============================================================================
-- Module B: Chi phi phat sinh theo lo hang
-- ============================================================================

create table if not exists phat_sinh_chi_phi (
  id uuid primary key default gen_random_uuid(),
  don_hang_id uuid not null references don_hang(id) on delete cascade,
  loai_chi_phi_id uuid references loai_chi_phi(id),
  nha_cung_cap_id uuid references nha_cung_cap(id),
  so_luong numeric,
  don_gia numeric,
  gia_von_buy numeric,
  gia_ban_sell numeric,
  vat_percent numeric,
  tien_thue numeric generated always as (round(coalesce(gia_von_buy, 0) * coalesce(vat_percent, 0) / 100, 2)) stored,
  tong_tien numeric generated always as (coalesce(gia_von_buy, 0) + round(coalesce(gia_von_buy, 0) * coalesce(vat_percent, 0) / 100, 2)) stored,
  noi_bo boolean not null default true,
  chi_ho boolean not null default false,
  tt_thue boolean not null default false,
  ngay_phat_sinh date not null default current_date,
  nguoi_nhap_id uuid references nhan_vien(id),
  nguoi_duyet_id uuid references nhan_vien(id),
  trang_thai text not null default 'Nháp' check (trang_thai in ('Nháp', 'Chờ duyệt', 'Đã duyệt', 'Từ chối')),
  ghi_chu text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on phat_sinh_chi_phi
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- Phu thu khach hang
-- ----------------------------------------------------------------------------
create table if not exists phu_thu (
  id uuid primary key default gen_random_uuid(),
  don_hang_id uuid not null references don_hang(id) on delete cascade,
  loai_phu_thu text,
  thanh_tien numeric,
  ghi_chu text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on phu_thu
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- Chi phi giao nhan / chuyen (luong, phu cap, dien thoai, COMMS...)
-- ----------------------------------------------------------------------------
create table if not exists chi_phi_giao_nhan (
  id uuid primary key default gen_random_uuid(),
  don_hang_id uuid not null references don_hang(id) on delete cascade,
  loai text,
  thanh_tien numeric,
  ghi_chu text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on chi_phi_giao_nhan
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- Dinh phi thang (nhap 1 lan/thang, dung de phan bo cho tung lo hang)
-- ----------------------------------------------------------------------------
create table if not exists dinh_phi_thang (
  id uuid primary key default gen_random_uuid(),
  thang_nam text not null, -- dinh dang 'YYYY-MM'
  khoan_muc text not null,
  so_tien numeric,
  dang_hoat_dong boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on dinh_phi_thang
  for each row execute function set_updated_at();

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table phat_sinh_chi_phi enable row level security;
alter table phu_thu enable row level security;
alter table chi_phi_giao_nhan enable row level security;
alter table dinh_phi_thang enable row level security;

-- phat_sinh_chi_phi: moi nguoi xem (UI se an gia ban voi Hien truong/Dieu phoi);
-- Them: Hien truong/Dieu phoi/Chung tu/Ke toan. Sua: theo vai tro (xem trigger).
create policy "psc_select" on phat_sinh_chi_phi for select to authenticated using (true);
create policy "psc_insert" on phat_sinh_chi_phi for insert to authenticated
  with check (current_phong_ban() in ('Hiện trường', 'Điều phối', 'Chứng từ', 'Kế toán'));
create policy "psc_update" on phat_sinh_chi_phi for update to authenticated
  using (current_phong_ban() in ('Kế toán', 'Sale', 'Hiện trường', 'Điều phối', 'Chứng từ'));
create policy "psc_delete" on phat_sinh_chi_phi for delete to authenticated
  using (current_phong_ban() = 'Kế toán');

create or replace function enforce_phat_sinh_chi_phi_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  role text := current_phong_ban();
begin
  if role = 'Kế toán' then
    return new;
  elsif role = 'Sale' then
    if (to_jsonb(new) - 'gia_ban_sell' - 'updated_at') is distinct from (to_jsonb(old) - 'gia_ban_sell' - 'updated_at') then
      raise exception 'Sale chỉ được sửa giá bán (sell).';
    end if;
  elsif role in ('Hiện trường', 'Điều phối', 'Chứng từ') then
    if old.trang_thai = 'Đã duyệt' then
      raise exception 'Chi phí đã được duyệt, không thể sửa.';
    end if;
    if new.gia_ban_sell is distinct from old.gia_ban_sell then
      raise exception 'Không có quyền sửa giá bán (sell).';
    end if;
    if new.trang_thai in ('Đã duyệt', 'Từ chối') then
      raise exception 'Không có quyền duyệt/từ chối chi phí.';
    end if;
  else
    raise exception 'Không có quyền sửa chi phí.';
  end if;
  return new;
end;
$$;

drop trigger if exists before_psc_update on phat_sinh_chi_phi;
create trigger before_psc_update
  before update on phat_sinh_chi_phi
  for each row execute function enforce_phat_sinh_chi_phi_update();

-- phu_thu: moi nguoi xem; Sale + Ke toan them/sua/xoa
create policy "phu_thu_select" on phu_thu for select to authenticated using (true);
create policy "phu_thu_insert" on phu_thu for insert to authenticated
  with check (current_phong_ban() in ('Sale', 'Kế toán'));
create policy "phu_thu_update" on phu_thu for update to authenticated
  using (current_phong_ban() in ('Sale', 'Kế toán'));
create policy "phu_thu_delete" on phu_thu for delete to authenticated
  using (current_phong_ban() in ('Sale', 'Kế toán'));

-- chi_phi_giao_nhan: moi nguoi xem; chi Ke toan them/sua/xoa
create policy "cpgn_select" on chi_phi_giao_nhan for select to authenticated using (true);
create policy "cpgn_insert" on chi_phi_giao_nhan for insert to authenticated
  with check (current_phong_ban() = 'Kế toán');
create policy "cpgn_update" on chi_phi_giao_nhan for update to authenticated
  using (current_phong_ban() = 'Kế toán');
create policy "cpgn_delete" on chi_phi_giao_nhan for delete to authenticated
  using (current_phong_ban() = 'Kế toán');

-- dinh_phi_thang: moi nguoi xem; chi Ke toan them/sua/xoa
create policy "dpt_select" on dinh_phi_thang for select to authenticated using (true);
create policy "dpt_insert" on dinh_phi_thang for insert to authenticated
  with check (current_phong_ban() = 'Kế toán');
create policy "dpt_update" on dinh_phi_thang for update to authenticated
  using (current_phong_ban() = 'Kế toán');
create policy "dpt_delete" on dinh_phi_thang for delete to authenticated
  using (current_phong_ban() = 'Kế toán');
