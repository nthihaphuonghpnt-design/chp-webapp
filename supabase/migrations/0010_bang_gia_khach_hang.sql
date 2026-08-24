-- ============================================================================
-- Bang gia da thoa thuan voi tung khach hang (VD: phi giao nhan, cuoc van
-- chuyen theo cont/lo/kg...). Sale nhap luc tiep nhan/dam phan voi khach,
-- dung de goi y gia ban khi nhap chi phi phat sinh cho don hang.
-- ============================================================================

create table if not exists bang_gia_khach_hang (
  id uuid primary key default gen_random_uuid(),
  khach_hang_id uuid not null references khach_hang(id) on delete cascade,
  loai_chi_phi_id uuid not null references loai_chi_phi(id),
  don_gia numeric,
  don_vi text, -- VD: /cont 20', /cont 40', /lo, /kg...
  ghi_chu text,
  dang_hoat_dong boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on bang_gia_khach_hang
  for each row execute function set_updated_at();

alter table bang_gia_khach_hang enable row level security;

-- Xem: moi nguoi. Them/Sua/Xoa: Sale + Ke toan (nguoi dam phan gia & quan ly gia)
create policy "bgkh_select" on bang_gia_khach_hang for select to authenticated using (true);
create policy "bgkh_insert" on bang_gia_khach_hang for insert to authenticated
  with check (current_phong_ban() in ('Sale', 'Kế toán'));
create policy "bgkh_update" on bang_gia_khach_hang for update to authenticated
  using (current_phong_ban() in ('Sale', 'Kế toán'));
create policy "bgkh_delete" on bang_gia_khach_hang for delete to authenticated
  using (current_phong_ban() in ('Sale', 'Kế toán'));
