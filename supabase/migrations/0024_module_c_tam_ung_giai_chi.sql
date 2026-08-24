-- ============================================================================
-- Module C: Tam ung & Giai chi
-- ============================================================================

create table if not exists tam_ung_giai_chi (
  id uuid primary key default gen_random_uuid(),
  loai text not null check (loai in ('Tạm ứng', 'Giải chi')),
  ngay_thuc_hien date not null default current_date,
  doi_tuong text not null check (doi_tuong in ('Nhân viên', 'Tài xế')),
  nhan_vien_id uuid references nhan_vien(id),
  ten_tai_xe text,
  lan int,
  so_tien numeric not null,
  muc_tam_ung_toi_da numeric,
  so_phieu text,
  ghi_chu text,
  trang_thai text not null default 'Đề nghị' check (trang_thai in ('Đề nghị', 'Đã duyệt', 'Từ chối')),
  nguoi_de_nghi_id uuid references nhan_vien(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint doi_tuong_hop_le check (
    (doi_tuong = 'Nhân viên' and nhan_vien_id is not null)
    or (doi_tuong = 'Tài xế' and ten_tai_xe is not null)
  )
);

create trigger set_updated_at before update on tam_ung_giai_chi
  for each row execute function set_updated_at();

alter table tam_ung_giai_chi enable row level security;

-- Xem: Ke toan + Giam doc xem tat ca; nguoi khac chi xem cua chinh minh
-- (nguoi de nghi hoac doi tuong la chinh ho).
create policy "tugc_select" on tam_ung_giai_chi for select to authenticated
  using (
    current_phong_ban() in ('Kế toán', 'Giám đốc')
    or nguoi_de_nghi_id in (select id from nhan_vien where auth_user_id = auth.uid())
    or nhan_vien_id in (select id from nhan_vien where auth_user_id = auth.uid())
  );

-- Them: Ke toan them duoc bat ky (tam ung/giai chi, cho ai). Nguoi khac chi
-- duoc "de nghi tam ung" cho chinh minh.
create policy "tugc_insert" on tam_ung_giai_chi for insert to authenticated
  with check (
    current_phong_ban() = 'Kế toán'
    or (loai = 'Tạm ứng' and doi_tuong = 'Nhân viên' and nhan_vien_id in (select id from nhan_vien where auth_user_id = auth.uid()))
  );

-- Sua/Duyet/Giai chi: chi Ke toan.
create policy "tugc_update" on tam_ung_giai_chi for update to authenticated
  using (current_phong_ban() = 'Kế toán');
create policy "tugc_delete" on tam_ung_giai_chi for delete to authenticated
  using (current_phong_ban() = 'Kế toán');
