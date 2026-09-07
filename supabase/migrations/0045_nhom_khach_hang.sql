-- ============================================================================
-- Nhom khach hang: 1 khach hang trong he thong van la 1 phap nhan rieng (co
-- MST/dia chi rieng, dung de xuat hoa don dung phap ly) — nhom nay CHI de
-- gom cac cong ty con cua cung 1 tap doan/moi quan he (vd Apple Trans ->
-- Hong Ngoc, Amal, Asus) lai voi nhau cho de loc/xem gop trong bao cao, KHONG
-- lam thay doi cach xuat hoa don hay tinh cong no (van tinh rieng theo tung
-- khach_hang_id nhu cu).
-- ============================================================================

create table if not exists nhom_khach_hang (
  id uuid primary key default gen_random_uuid(),
  ten text not null unique,
  ghi_chu text,
  dang_hoat_dong boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on nhom_khach_hang
  for each row execute function set_updated_at();

alter table khach_hang add column if not exists nhom_khach_hang_id uuid references nhom_khach_hang(id) on delete set null;

-- Cung quy tac RLS voi cac danh muc dung chung khac: moi nguoi xem, chi Ke
-- toan them/sua.
alter table nhom_khach_hang enable row level security;
create policy "nhom_khach_hang_select" on nhom_khach_hang for select to authenticated using (true);
create policy "nhom_khach_hang_insert" on nhom_khach_hang for insert to authenticated
  with check (current_phong_ban() = 'Kế toán');
create policy "nhom_khach_hang_update" on nhom_khach_hang for update to authenticated
  using (current_phong_ban() = 'Kế toán');
