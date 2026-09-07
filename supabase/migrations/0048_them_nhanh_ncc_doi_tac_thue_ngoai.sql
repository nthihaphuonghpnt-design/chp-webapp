-- ============================================================================
-- Cho phep them nhanh Nha cung cap / Doi tac thue ngoai ngay tren form Chi
-- phi phat sinh va Thue ngoai trong trang chi tiet Don hang (nut "+"),
-- khong can doi Ke toan them truoc trong Danh muc. Noi long RLS insert cho
-- dung cac phong ban da duoc phep them cac muc nay trong 2 section do
-- (Hien truong, Dieu phoi, Chung tu, Ke toan) — truoc chi Ke toan.
-- ============================================================================

drop policy if exists "nha_cung_cap_insert" on nha_cung_cap;
create policy "nha_cung_cap_insert" on nha_cung_cap for insert to authenticated
  with check (current_phong_ban() in ('Hiện trường', 'Điều phối', 'Chứng từ', 'Kế toán', 'Giám đốc'));

drop policy if exists "doi_tac_thue_ngoai_insert" on doi_tac_thue_ngoai;
create policy "doi_tac_thue_ngoai_insert" on doi_tac_thue_ngoai for insert to authenticated
  with check (current_phong_ban() in ('Hiện trường', 'Điều phối', 'Chứng từ', 'Kế toán', 'Giám đốc'));
