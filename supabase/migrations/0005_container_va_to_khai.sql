-- ============================================================================
-- 1) Mot lo hang co the co nhieu container (hoac nhieu dong so ky neu hang le
--    ghep container) — tach so_cont/so_seal/khoi_luong thanh bang con.
-- ============================================================================

create table if not exists don_hang_container (
  id uuid primary key default gen_random_uuid(),
  don_hang_id uuid not null references don_hang(id) on delete cascade,
  so_cont text,
  so_seal text,
  loai_cont_hang_id uuid references loai_container(id),
  khoi_luong numeric,
  ghi_chu text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on don_hang_container
  for each row execute function set_updated_at();

alter table don_hang_container enable row level security;

create policy "container_select" on don_hang_container for select to authenticated using (true);
create policy "container_insert" on don_hang_container for insert to authenticated
  with check (current_phong_ban() in ('Sale', 'Chứng từ', 'Giám đốc'));
create policy "container_update" on don_hang_container for update to authenticated
  using (current_phong_ban() in ('Sale', 'Chứng từ', 'Giám đốc'));
create policy "container_delete" on don_hang_container for delete to authenticated
  using (current_phong_ban() in ('Sale', 'Chứng từ', 'Giám đốc'));

-- Chuyen du lieu cu (neu co) sang bang moi truoc khi xoa cot
insert into don_hang_container (don_hang_id, so_cont, so_seal, loai_cont_hang_id, khoi_luong)
select id, so_cont, so_seal, loai_cont_hang_id, khoi_luong
from don_hang
where so_cont is not null or so_seal is not null or khoi_luong is not null;

alter table don_hang drop column if exists so_cont;
alter table don_hang drop column if exists so_seal;
alter table don_hang drop column if exists khoi_luong;

-- ============================================================================
-- 2) Module G: To khai hai quan — theo doi tien trinh thong quan tung lo hang
-- ============================================================================

create table if not exists to_khai_hai_quan (
  id uuid primary key default gen_random_uuid(),
  don_hang_id uuid not null references don_hang(id) on delete cascade,
  so_to_khai text,
  ngay_mo_to_khai date,
  loai_hinh_xnk text check (loai_hinh_xnk in (
    'Nhập kinh doanh', 'Nhập ủy thác', 'Xuất kinh doanh', 'Xuất ủy thác', 'Tạm nhập tái xuất', 'Khác'
  )),
  chi_cuc_hai_quan text,
  luong_to_khai text check (luong_to_khai in ('Xanh', 'Vàng', 'Đỏ')),
  thue_nhap_khau numeric,
  thue_vat_nk numeric,
  thue_khac numeric,
  ngay_thong_quan date,
  trang_thai text not null default 'Đang mở tờ khai'
    check (trang_thai in ('Đang mở tờ khai', 'Chờ kiểm hóa', 'Đã thông quan', 'Giải phóng hàng')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on to_khai_hai_quan
  for each row execute function set_updated_at();

alter table to_khai_hai_quan enable row level security;

-- Xem: moi nguoi. Them/Sua: chi Chung tu (dung ma tran phan quyen)
create policy "to_khai_select" on to_khai_hai_quan for select to authenticated using (true);
create policy "to_khai_insert" on to_khai_hai_quan for insert to authenticated
  with check (current_phong_ban() = 'Chứng từ');
create policy "to_khai_update" on to_khai_hai_quan for update to authenticated
  using (current_phong_ban() = 'Chứng từ');
create policy "to_khai_delete" on to_khai_hai_quan for delete to authenticated
  using (current_phong_ban() = 'Chứng từ');
