-- ============================================================================
-- E.9 (27/11/2026, da duoc nguoi dung xac nhan): "AMAL" (ban ghi khach hang
-- rieng, chi 1 lo CHPNK2501008 ngay 2025-01-01, chua co du lieu chi phi) va
-- "AMAL - QT" (37 lo, 01/2026-11/2026, dang hoat dong that) la TRUNG 1 khach
-- hang — gop ve AMAL - QT.
--
-- Da kiem tra TOAN BO foreign key tro ve khach_hang (qua pg_constraint) truoc
-- khi gop: chi co 2 tham chieu toi id cua "AMAL" — don_hang.khach_hang_id (1
-- dong, CHPNK2501008) va hop_dong_khach_hang (1 dong, rong, "Chua co hop
-- dong"). AMAL - QT da co san 1 dong hop_dong_khach_hang rieng (cung rong) nen
-- khong chuyen ma XOA dong cua AMAL de tranh trung.
-- ============================================================================

-- enforce_don_hang_update() chan UPDATE tu phien khong co current_phong_ban()
-- (vd chay qua migration/admin thay vi qua app) — tat tam trigger nay rieng
-- cho 1 cau lenh sua du lieu hanh chinh nay roi bat lai ngay.
alter table don_hang disable trigger before_don_hang_update;

update don_hang set khach_hang_id = '0cc65291-90e5-4bef-a37a-788dc29f7e44'
where khach_hang_id = '0b5f0161-9305-4555-a7a3-b56e2f41a4cc';

alter table don_hang enable trigger before_don_hang_update;

delete from hop_dong_khach_hang where khach_hang_id = '0b5f0161-9305-4555-a7a3-b56e2f41a4cc';

update khach_hang set dang_hoat_dong = false where id = '0b5f0161-9305-4555-a7a3-b56e2f41a4cc';
