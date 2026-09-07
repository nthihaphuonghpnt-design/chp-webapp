-- ============================================================================
-- Them "Ma KH" (ma khach hang) — nguoi dung tu dat quy uoc rieng, vd cong
-- ty me/dai dien nhom la Apple-000, cac cong ty con cung nhom la Apple-001,
-- Apple-002... He thong khong tu sinh, chi luu text tu do.
-- ============================================================================

alter table khach_hang add column if not exists ma_khach_hang text;

-- Nhom khach hang gio co the tao nhanh ngay trong form them khach hang
-- (nut "+"), nen noi long insert cho dung cac phong ban da duoc them
-- khach hang moi (xem migration 0047) — truoc chi Ke toan.
drop policy if exists "nhom_khach_hang_insert" on nhom_khach_hang;
create policy "nhom_khach_hang_insert" on nhom_khach_hang for insert to authenticated
  with check (current_phong_ban() in ('Sale', 'Chứng từ', 'Kế toán', 'Giám đốc'));
