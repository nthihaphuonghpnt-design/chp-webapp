-- ============================================================================
-- C3 muc 5 (yeu cau 27/11/2026, "CÒN LẠI"): hoa don C25TAA-55 (AMAL - QT,
-- 8,404,560, ngay xuat 2025-11-28) dang gan NHAM vao lo CHPNK2611007 (ngay len
-- don 2026-11-06 — cach nhau ca nam, va lo nay chi co 500,000 dich vu itemize,
-- rat nho so voi 8,404,560 cua hoa don) — khien bao cao hien sai "Da xuat
-- chua thu" rat lon cho 1 lo nho.
--
-- Da kiem tra: AMAL/AMAL - QT chi co DUY NHAT 1 lo truoc 2026 trong he thong
-- (CHPNK2501008, thang 1/2025) va lo do CHUA co dong chi phi nao (khong du
-- chung cu de khang dinh la lo dung) — KHONG tu gan lai, chi go lien ket sai,
-- cho nguoi dung xac nhan lo dung (hoac xac nhan lo lich su chua nhap).
-- ============================================================================

delete from hoa_don_don_hang
where hoa_don_id = (select id from hoa_don_xuat where so_hoa_don = 'C25TAA-55')
  and don_hang_id = (select id from don_hang where so_don_hang = 'CHPNK2611007');
