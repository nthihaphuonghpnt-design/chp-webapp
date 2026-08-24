-- ============================================================================
-- Module F: Lich nhac nho
-- ============================================================================

create table if not exists lich_nhac_nho (
  id uuid primary key default gen_random_uuid(),
  phong_ban_id uuid not null references phong_ban(id),
  don_hang_id uuid references don_hang(id) on delete set null,
  noi_dung text not null,
  nguoi_phu_trach_id uuid references nhan_vien(id),
  nguoi_tao_id uuid references nhan_vien(id),
  ngay_du_kien date not null,
  trang_thai text not null default 'Chưa thực hiện' check (trang_thai in ('Chưa thực hiện', 'Đã thực hiện')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on lich_nhac_nho
  for each row execute function set_updated_at();

alter table lich_nhac_nho enable row level security;

-- Xem: moi nguoi. Them: moi nguoi (co the tao nhac viec cho minh hoac giao cho nguoi khac).
-- Sua/Xoa: chi nguoi phu trach, nguoi tao, hoac Ke toan.
create policy "lnn_select" on lich_nhac_nho for select to authenticated using (true);
create policy "lnn_insert" on lich_nhac_nho for insert to authenticated with check (true);
create policy "lnn_update" on lich_nhac_nho for update to authenticated
  using (
    current_phong_ban() = 'Kế toán'
    or nguoi_phu_trach_id in (select id from nhan_vien where auth_user_id = auth.uid())
    or nguoi_tao_id in (select id from nhan_vien where auth_user_id = auth.uid())
  );
create policy "lnn_delete" on lich_nhac_nho for delete to authenticated
  using (
    current_phong_ban() = 'Kế toán'
    or nguoi_phu_trach_id in (select id from nhan_vien where auth_user_id = auth.uid())
    or nguoi_tao_id in (select id from nhan_vien where auth_user_id = auth.uid())
  );
