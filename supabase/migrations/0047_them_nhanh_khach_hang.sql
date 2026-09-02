-- ============================================================================
-- Cho phep Sale/Chung tu/Giam doc (nguoi tao don hang — xem
-- CAN_MANAGE_DON_HANG_B1) them nhanh 1 khach hang moi ngay tren form Don
-- hang (nut "+" canh o chon khach hang), khong can doi Ke toan them truoc
-- trong Danh muc. Truoc day insert khach_hang chi cho phep Ke toan.
-- nha_cung_cap KHONG doi — nut them nhanh nha cung cap chi xuat hien trong
-- form Hop dong, ma "+Thêm hợp đồng" da gioi han canEdit = Ke toan roi nen
-- Ke toan van du quyen insert hien co.
-- ============================================================================

drop policy if exists "khach_hang_insert" on khach_hang;
create policy "khach_hang_insert" on khach_hang for insert to authenticated
  with check (current_phong_ban() in ('Sale', 'Chứng từ', 'Kế toán', 'Giám đốc'));
