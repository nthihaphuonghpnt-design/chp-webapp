-- ============================================================================
-- Module 4: Hop dong dich vu/uy thac theo khach hang + Hoa don xuat
-- ============================================================================

create table if not exists hop_dong_khach_hang (
  id uuid primary key default gen_random_uuid(),
  khach_hang_id uuid not null references khach_hang(id),
  so_hop_dong text,
  loai_hop_dong text check (loai_hop_dong in ('Dịch vụ logistics', 'Ủy thác XNK', 'Khác')),
  ngay_hieu_luc date,
  ngay_het_han date,
  ghi_chu text,
  nguoi_tao_id uuid references nhan_vien(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on hop_dong_khach_hang
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- Hoa don xuat cho khach hang
-- ----------------------------------------------------------------------------
create table if not exists hoa_don_xuat (
  id uuid primary key default gen_random_uuid(),
  khach_hang_id uuid not null references khach_hang(id),
  so_hoa_don text,
  ngay_xuat date not null default current_date,
  tong_tien_truoc_thue numeric,
  vat_percent numeric,
  tien_vat numeric generated always as (round(coalesce(tong_tien_truoc_thue, 0) * coalesce(vat_percent, 0) / 100, 2)) stored,
  tong_tien numeric generated always as (coalesce(tong_tien_truoc_thue, 0) + round(coalesce(tong_tien_truoc_thue, 0) * coalesce(vat_percent, 0) / 100, 2)) stored,
  trang_thai_thanh_toan text not null default 'Chưa thu' check (trang_thai_thanh_toan in ('Chưa thu', 'Thu một phần', 'Đã thu đủ')),
  so_tien_da_thu numeric,
  ghi_chu text,
  nguoi_tao_id uuid references nhan_vien(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on hoa_don_xuat
  for each row execute function set_updated_at();

-- 1 hoa don co the gom nhieu don hang (nhieu-nhieu)
create table if not exists hoa_don_don_hang (
  id uuid primary key default gen_random_uuid(),
  hoa_don_id uuid not null references hoa_don_xuat(id) on delete cascade,
  don_hang_id uuid not null references don_hang(id) on delete cascade,
  unique (hoa_don_id, don_hang_id)
);

-- ============================================================================
-- Row Level Security
-- Theo ma tran: Sale Xem, Chung tu + Ke toan Them/Sua, Giam doc Xem.
-- Hien truong/Dieu phoi KHONG duoc xem (thong tin hop dong/hoa don nhay cam).
-- ============================================================================
alter table hop_dong_khach_hang enable row level security;
alter table hoa_don_xuat enable row level security;
alter table hoa_don_don_hang enable row level security;

create policy "hdkh_select" on hop_dong_khach_hang for select to authenticated
  using (current_phong_ban() in ('Sale', 'Chứng từ', 'Kế toán', 'Giám đốc'));
create policy "hdkh_insert" on hop_dong_khach_hang for insert to authenticated
  with check (current_phong_ban() in ('Chứng từ', 'Kế toán'));
create policy "hdkh_update" on hop_dong_khach_hang for update to authenticated
  using (current_phong_ban() in ('Chứng từ', 'Kế toán'));
create policy "hdkh_delete" on hop_dong_khach_hang for delete to authenticated
  using (current_phong_ban() = 'Kế toán');

create policy "hdx_select" on hoa_don_xuat for select to authenticated
  using (current_phong_ban() in ('Sale', 'Chứng từ', 'Kế toán', 'Giám đốc'));
create policy "hdx_insert" on hoa_don_xuat for insert to authenticated
  with check (current_phong_ban() in ('Chứng từ', 'Kế toán'));
create policy "hdx_update" on hoa_don_xuat for update to authenticated
  using (current_phong_ban() in ('Chứng từ', 'Kế toán'));
create policy "hdx_delete" on hoa_don_xuat for delete to authenticated
  using (current_phong_ban() = 'Kế toán');

create policy "hddh_select" on hoa_don_don_hang for select to authenticated
  using (current_phong_ban() in ('Sale', 'Chứng từ', 'Kế toán', 'Giám đốc'));
create policy "hddh_insert" on hoa_don_don_hang for insert to authenticated
  with check (current_phong_ban() in ('Chứng từ', 'Kế toán'));
create policy "hddh_delete" on hoa_don_don_hang for delete to authenticated
  using (current_phong_ban() in ('Chứng từ', 'Kế toán'));
