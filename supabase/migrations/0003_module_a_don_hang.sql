-- ============================================================================
-- Module A: Don hang (lo hang) — B1, Chi tiet van chuyen, Dinh kem
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Bang dem sinh so don hang tu dong: CHP{nam}-{4 chu so}, reset moi nam
-- ----------------------------------------------------------------------------
create table if not exists so_don_hang_seq (
  nam int primary key,
  last_seq int not null default 0
);

create or replace function generate_so_don_hang()
returns trigger
language plpgsql
as $$
declare
  y int := extract(year from now());
  seq int;
begin
  if new.so_don_hang is null or new.so_don_hang = '' then
    insert into so_don_hang_seq (nam, last_seq) values (y, 1)
      on conflict (nam) do update set last_seq = so_don_hang_seq.last_seq + 1
      returning last_seq into seq;
    new.so_don_hang := 'CHP' || y || '-' || lpad(seq::text, 4, '0');
  end if;
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- don_hang (B1)
-- ----------------------------------------------------------------------------
create table if not exists don_hang (
  id uuid primary key default gen_random_uuid(),
  so_don_hang text unique,
  khach_hang_id uuid references khach_hang(id),
  loai_don_hang text check (loai_don_hang in ('Xuất', 'Nhập', 'Khác')),
  loai_kich_co text check (loai_kich_co in ('20''', '40''', '45''', 'Hàng lẻ')),
  loai_cont_hang_id uuid references loai_container(id),
  dvt text check (dvt in ('Cont', 'Chuyến', 'Kiện', 'Khối', 'Tấn', 'Kg', '2x20')),
  so_bl_bk text,
  so_lo text,
  so_cont text,
  so_seal text,
  hang_hoa_id uuid references hang_hoa(id),
  khoi_luong numeric,
  kich_thuoc text,
  noi_lay_cont_hang_id uuid references dia_diem(id),
  noi_dong_giao_id uuid references dia_diem(id),
  noi_ha_tra_rong_id uuid references dia_diem(id),
  ngay_len_don date not null default current_date,
  ngay_van_chuyen date,
  han_lenh_ngay date,
  han_lenh_gio time,
  thoi_gian_tra_rong timestamptz,
  ghi_chu_van_chuyen text,
  gia numeric,
  trang_thai text not null default 'Tiếp nhận'
    check (trang_thai in ('Tiếp nhận', 'Làm thủ tục', 'Thông quan', 'Giao hàng', 'Hoàn tất')),
  ops_xac_nhan boolean not null default false,
  cs_xac_nhan boolean not null default false,
  nguoi_tao_id uuid references nhan_vien(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_so_don_hang before insert on don_hang
  for each row execute function generate_so_don_hang();

create trigger set_updated_at before update on don_hang
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- chi_tiet_van_chuyen (nhieu chang cho 1 don hang)
-- ----------------------------------------------------------------------------
create table if not exists chi_tiet_van_chuyen (
  id uuid primary key default gen_random_uuid(),
  don_hang_id uuid not null references don_hang(id) on delete cascade,
  ngay_vc date,
  dieu_dong_xe text check (dieu_dong_xe in ('Công ty (tự thực hiện)', 'Thuê ngoài')),
  so_xe text,
  tai_xe_cty_thue text,
  diem_1_id uuid references dia_diem(id),
  diem_2_id uuid references dia_diem(id),
  diem_3_id uuid references dia_diem(id),
  tien_vc_noi_bo numeric,
  tien_vc_thue_ngoai numeric,
  tien_thue numeric,
  phu_thu numeric,
  trang_thai text not null default 'Đã duyệt lệnh'
    check (trang_thai in ('Đã duyệt lệnh', 'Đã xuất phát', 'Đã điều động', 'Đã xác nhận', 'Đã hoàn thành')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on chi_tiet_van_chuyen
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- dinh_kem (dung chung cho moi buoc/module — moi dong la 1 file)
-- ----------------------------------------------------------------------------
create table if not exists dinh_kem (
  id uuid primary key default gen_random_uuid(),
  don_hang_id uuid references don_hang(id) on delete cascade,
  lien_ket_toi text check (lien_ket_toi in (
    'Tiếp nhận', 'Làm thủ tục', 'Thông quan', 'Giao hàng', 'Hoàn tất',
    'Chi phí phát sinh', 'Chi tiết vận chuyển', 'Thuê ngoài'
  )),
  loai_dinh_kem text check (loai_dinh_kem in (
    'Ảnh hàng hóa tại cảng', 'Ảnh container/seal', 'Chứng từ thông quan',
    'Hóa đơn/chứng từ chi phí', 'Khác'
  )),
  duong_dan_file text not null,
  ten_file text,
  nguoi_upload_id uuid references nhan_vien(id),
  thoi_gian_upload timestamptz not null default now(),
  ghi_chu text
);

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table don_hang enable row level security;
alter table chi_tiet_van_chuyen enable row level security;
alter table dinh_kem enable row level security;

-- don_hang: moi nguoi da dang nhap deu xem duoc; chi Sale duoc tao moi
create policy "don_hang_select" on don_hang for select to authenticated using (true);
create policy "don_hang_insert" on don_hang for insert to authenticated
  with check (current_phong_ban() = 'Sale');
create policy "don_hang_update" on don_hang for update to authenticated
  using (current_phong_ban() in ('Sale', 'Hiện trường', 'Chứng từ'));

-- Chi tiet van chuyen: moi nguoi xem; Hien truong + Dieu phoi duoc them/sua
create policy "ctvc_select" on chi_tiet_van_chuyen for select to authenticated using (true);
create policy "ctvc_insert" on chi_tiet_van_chuyen for insert to authenticated
  with check (current_phong_ban() in ('Hiện trường', 'Điều phối'));
create policy "ctvc_update" on chi_tiet_van_chuyen for update to authenticated
  using (current_phong_ban() in ('Hiện trường', 'Điều phối'));
create policy "ctvc_delete" on chi_tiet_van_chuyen for delete to authenticated
  using (current_phong_ban() in ('Hiện trường', 'Điều phối'));

-- Dinh kem: moi nguoi xem va duoc them (bang chung, khong gioi han phong ban)
create policy "dinh_kem_select" on dinh_kem for select to authenticated using (true);
create policy "dinh_kem_insert" on dinh_kem for insert to authenticated with check (true);

-- ============================================================================
-- Chan sua sai quyen: Hien truong chi duoc doi ops_xac_nhan,
-- Chung tu chi duoc doi cs_xac_nhan, Sale khong duoc tu xac nhan ho.
-- Khi ca 2 co xac nhan -> tu dong chuyen trang_thai = 'Hoàn tất'.
-- ============================================================================
create or replace function enforce_don_hang_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  role text := current_phong_ban();
  rest_unchanged boolean;
begin
  if role = 'Hiện trường' then
    rest_unchanged := (to_jsonb(new) - 'ops_xac_nhan' - 'trang_thai' - 'updated_at')
                     = (to_jsonb(old) - 'ops_xac_nhan' - 'trang_thai' - 'updated_at');
    if not rest_unchanged then
      raise exception 'Hiện trường chỉ được xác nhận hoàn thành phần hiện trường.';
    end if;
  elsif role = 'Chứng từ' then
    rest_unchanged := (to_jsonb(new) - 'cs_xac_nhan' - 'trang_thai' - 'updated_at')
                     = (to_jsonb(old) - 'cs_xac_nhan' - 'trang_thai' - 'updated_at');
    if not rest_unchanged then
      raise exception 'Chứng từ chỉ được xác nhận hoàn thành phần chứng từ.';
    end if;
  elsif role = 'Sale' then
    if new.ops_xac_nhan is distinct from old.ops_xac_nhan
       or new.cs_xac_nhan is distinct from old.cs_xac_nhan then
      raise exception 'Chỉ Hiện trường/Chứng từ mới được xác nhận hoàn thành.';
    end if;
  else
    raise exception 'Không có quyền sửa đơn hàng.';
  end if;

  if new.ops_xac_nhan and new.cs_xac_nhan then
    new.trang_thai := 'Hoàn tất';
  end if;

  return new;
end;
$$;

drop trigger if exists before_don_hang_update on don_hang;
create trigger before_don_hang_update
  before update on don_hang
  for each row execute function enforce_don_hang_update();

-- ============================================================================
-- Supabase Storage: bucket luu file dinh kem
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('dinh-kem', 'dinh-kem', false)
on conflict (id) do nothing;

create policy "dinh_kem_storage_select" on storage.objects for select to authenticated
  using (bucket_id = 'dinh-kem');
create policy "dinh_kem_storage_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'dinh-kem');
