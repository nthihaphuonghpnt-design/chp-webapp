-- ============================================================================
-- P2 muc 8 (2026-11-27): gop 4 cap khach hang trung da biet (nguoi dung chon
-- huong "chi gop 1 lan qua SQL cho cac cap da biet", khong xay cong cu gop
-- dung lai duoc). Khong gom khach hang nao khac ngoai 4 cap nay.
--
-- Chon "giu lai" (winner) theo thu tu uu tien: (1) ho so co day du thong tin
-- phap ly (ten day du/dia chi/ma so thue) hon; (2) neu ca 2 deu trong/giong
-- nhau, giu ban ghi it don hang hon DE VIEC CHUYEN DON HANG CON LAI (xem duoi)
-- do hon, khong phai vi ban ghi do "chinh thong" hon.
--   - Sao Mây (giu ID nay vi co 46 don hang/20 hoa don — de it don phai
--     chuyen tay hon) <- SAO MAY = CÔNG TY TRÁCH NHIỆM HỮU HẠN SAO MÂY (ten
--     day du/dia chi/MST 0303214145 day du hon, da COPY SANG Sao Mây truoc
--     khi gop, chi con 1 don hang CHPNK2609007).
--   - HERA (1 hoa don, con lai giong het HERA - QT) <- HERA - QT (1 don hang)
--   - Hồng Mộc Garden (1 hoa don, con lai giong het HỒNG MỘC - QT) <- HỒNG MỘC - QT (1 don hang)
--   - C.TRINH (9 don hang) <- C TRINH (1 don hang, con lai giong het)
--
-- Da kiem tra truoc khi gop: khong co xung dot tai so_du_credit (ca 8 ban ghi
-- deu khong co dong so_du_credit nao) va hop_dong_khach_hang cua ca 8 deu
-- dang "Chưa có hợp đồng" giong nhau — nen xoa thang dong hop_dong_khach_hang
-- cua ban ghi bi gop (khong mat thong tin, vi ban giu lai da co dong rieng
-- cung trang thai).
--
-- QUAN TRONG — gioi han da phat hien khi thuc hien: bang don_hang co trigger
-- before_don_hang_update (enforce_don_hang_update, 0015/0126) CHI cho phep
-- 'Sale'/'Chứng từ'/'Giám đốc' doi khach_hang_id tren 1 don hang da co; Ke
-- toan (nguoi thuc hien gop nay) khong duoc, va trang /don-hang/[id]/sua
-- cung chan Ke toan o muc trang (canManageDonHang, chi Sale/Chứng từ/Giám
-- đốc). Vi vay KHONG mo rong them quyen cho Ke toan (se phai mo ca trang
-- Sua don hang, rong hon can thiet) — 4 don hang con lai cua ben bi gop (xem
-- comment tung dong duoi) CAN mot tai khoan Sale/Chứng từ/Giám đốc vao
-- /don-hang/<id>/sua doi lai "Khách hàng" thu cong (chi 4 don, thao tac binh
-- thuong co san, khong can code/quyen moi):
--   - CHPNK2609007 (hien con o SAO MAY, can doi sang Sao Mây)
--   - CHPXK2606011 (hien con o HERA - QT, can doi sang HERA)
--   - CHPXK2607001 (hien con o HỒNG MỘC - QT, can doi sang Hồng Mộc Garden)
--   - CHPXK2606001 (hien con o C TRINH, can doi sang C.TRINH)
-- ============================================================================

-- Sao Mây (giu lai) duoc bo sung thong tin phap ly day du tu SAO MAY truoc khi gop.
update khach_hang
set ten_day_du = 'CÔNG TY TRÁCH NHIỆM HỮU HẠN SAO MÂY',
    ten_viet_tat = 'SAO MAY',
    dia_chi = '379 Võ Trần Chí, Khu phố 4, Phường Tân Tạo, TP Hồ Chí Minh'
where id = '6dfe2415-310c-42ca-9f63-15f86ef844b0';

-- SAO MAY -> Sao Mây (con 1 don hang CHPNK2609007 chuyen tay, xem comment tren).
update hoa_don_xuat set khach_hang_id = '6dfe2415-310c-42ca-9f63-15f86ef844b0' where khach_hang_id = '78644221-30c8-48ba-9f67-c0622c4970c6';
update bang_gia_khach_hang set khach_hang_id = '6dfe2415-310c-42ca-9f63-15f86ef844b0' where khach_hang_id = '78644221-30c8-48ba-9f67-c0622c4970c6';
update credit_giao_dich set khach_hang_id = '6dfe2415-310c-42ca-9f63-15f86ef844b0' where khach_hang_id = '78644221-30c8-48ba-9f67-c0622c4970c6';
update tam_ung_giai_chi set khach_hang_id = '6dfe2415-310c-42ca-9f63-15f86ef844b0' where khach_hang_id = '78644221-30c8-48ba-9f67-c0622c4970c6';
update so_du_credit set khach_hang_id = '6dfe2415-310c-42ca-9f63-15f86ef844b0' where khach_hang_id = '78644221-30c8-48ba-9f67-c0622c4970c6';
delete from hop_dong_khach_hang where khach_hang_id = '78644221-30c8-48ba-9f67-c0622c4970c6';
update khach_hang set dang_hoat_dong = false, ghi_chu = 'Da gop vao khach hang Sao May. Con 1 don hang CHPNK2609007 can chuyen thu cong qua form sua don (P2 muc 8, migration 0127, 2026-11-27).' where id = '78644221-30c8-48ba-9f67-c0622c4970c6';

-- HERA - QT -> HERA (con 1 don hang CHPXK2606011 chuyen tay).
update hoa_don_xuat set khach_hang_id = '7b512a0e-9b70-4698-bb03-e267323551c4' where khach_hang_id = '098d0edc-cd42-40ec-9d70-9ce7c48cfc56';
update bang_gia_khach_hang set khach_hang_id = '7b512a0e-9b70-4698-bb03-e267323551c4' where khach_hang_id = '098d0edc-cd42-40ec-9d70-9ce7c48cfc56';
update credit_giao_dich set khach_hang_id = '7b512a0e-9b70-4698-bb03-e267323551c4' where khach_hang_id = '098d0edc-cd42-40ec-9d70-9ce7c48cfc56';
update tam_ung_giai_chi set khach_hang_id = '7b512a0e-9b70-4698-bb03-e267323551c4' where khach_hang_id = '098d0edc-cd42-40ec-9d70-9ce7c48cfc56';
update so_du_credit set khach_hang_id = '7b512a0e-9b70-4698-bb03-e267323551c4' where khach_hang_id = '098d0edc-cd42-40ec-9d70-9ce7c48cfc56';
delete from hop_dong_khach_hang where khach_hang_id = '098d0edc-cd42-40ec-9d70-9ce7c48cfc56';
update khach_hang set dang_hoat_dong = false, ghi_chu = 'Da gop vao khach hang HERA. Con 1 don hang CHPXK2606011 can chuyen thu cong qua form sua don (P2 muc 8, migration 0127, 2026-11-27).' where id = '098d0edc-cd42-40ec-9d70-9ce7c48cfc56';

-- HỒNG MỘC - QT -> Hồng Mộc Garden (con 1 don hang CHPXK2607001 chuyen tay).
update hoa_don_xuat set khach_hang_id = '740e080c-833a-48e6-a79d-a28be49cb29b' where khach_hang_id = '7387f10d-e95c-40e1-a274-3416e34df798';
update bang_gia_khach_hang set khach_hang_id = '740e080c-833a-48e6-a79d-a28be49cb29b' where khach_hang_id = '7387f10d-e95c-40e1-a274-3416e34df798';
update credit_giao_dich set khach_hang_id = '740e080c-833a-48e6-a79d-a28be49cb29b' where khach_hang_id = '7387f10d-e95c-40e1-a274-3416e34df798';
update tam_ung_giai_chi set khach_hang_id = '740e080c-833a-48e6-a79d-a28be49cb29b' where khach_hang_id = '7387f10d-e95c-40e1-a274-3416e34df798';
update so_du_credit set khach_hang_id = '740e080c-833a-48e6-a79d-a28be49cb29b' where khach_hang_id = '7387f10d-e95c-40e1-a274-3416e34df798';
delete from hop_dong_khach_hang where khach_hang_id = '7387f10d-e95c-40e1-a274-3416e34df798';
update khach_hang set dang_hoat_dong = false, ghi_chu = 'Da gop vao khach hang Hong Moc Garden. Con 1 don hang CHPXK2607001 can chuyen thu cong qua form sua don (P2 muc 8, migration 0127, 2026-11-27).' where id = '7387f10d-e95c-40e1-a274-3416e34df798';

-- C TRINH -> C.TRINH (con 1 don hang CHPXK2606001 chuyen tay).
update hoa_don_xuat set khach_hang_id = 'e1d8599c-eefe-4307-9333-b5ad9ab08997' where khach_hang_id = '5f5e1f54-64f2-4792-ad0d-4b92fa9ea02b';
update bang_gia_khach_hang set khach_hang_id = 'e1d8599c-eefe-4307-9333-b5ad9ab08997' where khach_hang_id = '5f5e1f54-64f2-4792-ad0d-4b92fa9ea02b';
update credit_giao_dich set khach_hang_id = 'e1d8599c-eefe-4307-9333-b5ad9ab08997' where khach_hang_id = '5f5e1f54-64f2-4792-ad0d-4b92fa9ea02b';
update tam_ung_giai_chi set khach_hang_id = 'e1d8599c-eefe-4307-9333-b5ad9ab08997' where khach_hang_id = '5f5e1f54-64f2-4792-ad0d-4b92fa9ea02b';
update so_du_credit set khach_hang_id = 'e1d8599c-eefe-4307-9333-b5ad9ab08997' where khach_hang_id = '5f5e1f54-64f2-4792-ad0d-4b92fa9ea02b';
delete from hop_dong_khach_hang where khach_hang_id = '5f5e1f54-64f2-4792-ad0d-4b92fa9ea02b';
update khach_hang set dang_hoat_dong = false, ghi_chu = 'Da gop vao khach hang C.TRINH. Con 1 don hang CHPXK2606001 can chuyen thu cong qua form sua don (P2 muc 8, migration 0127, 2026-11-27).' where id = '5f5e1f54-64f2-4792-ad0d-4b92fa9ea02b';
