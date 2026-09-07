-- ============================================================================
-- Cho phep cac phong ban nhap don hang (Sale, Chung tu, Giam doc — xem
-- CAN_MANAGE_DON_HANG_B1) them nhanh 1 dong Hang hoa / Loai container moi
-- ngay tren form Don hang (nut "+"), khong can doi Ke toan them truoc trong
-- Danh muc. Truoc day insert 2 bang nay chi cho phep Ke toan.
-- ============================================================================

drop policy if exists "hang_hoa_insert" on hang_hoa;
create policy "hang_hoa_insert" on hang_hoa for insert to authenticated
  with check (current_phong_ban() in ('Sale', 'Chứng từ', 'Kế toán', 'Giám đốc'));

drop policy if exists "loai_container_insert" on loai_container;
create policy "loai_container_insert" on loai_container for insert to authenticated
  with check (current_phong_ban() in ('Sale', 'Chứng từ', 'Kế toán', 'Giám đốc'));
