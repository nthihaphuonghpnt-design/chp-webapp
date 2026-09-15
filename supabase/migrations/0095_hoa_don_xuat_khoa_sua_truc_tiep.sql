-- ============================================================================
-- Khoa ghi truc tiep tren hoa_don_xuat, dung pattern da dung cho
-- phieu_quyet_toan_tam_ung (0073): giu nguyen RLS hdx_update/hdx_delete hien
-- co (0026/0040) — cai chan that su la REVOKE o tang GRANT, Postgres kiem tra
-- quyen cot TRUOC RLS.
--
-- Van cho phep client ghi TRUC TIEP nhom cot khong anh huong ban chat tai
-- chinh/dinh danh hoa don: so_tien_da_thu/trang_thai_thanh_toan/phuong_thuc_thu
-- (tinh nang ghi nhan thu tien dang chay tot, 0076 tung can nhac khoa cung nhu
-- 0073 nhung chu dong KHONG lam vi so_quy tu dong bo qua trigger xoa-roi-tao-
-- lai, khong co rui ro lech so), ghi_chu, va ky_ke_khai (phan loai, Ke toan
-- can sua tay thoai mai cho truong hop ke khai tre, khong dung tien).
--
-- Moi thay doi khac (khach hang, so hoa don, ngay xuat, so tien, trang_thai
-- vong doi...) va toan bo DELETE bay gio BAT BUOC di qua RPC (0094).
-- ============================================================================

revoke delete on hoa_don_xuat from authenticated;
revoke update on hoa_don_xuat from authenticated;
grant update (so_tien_da_thu, trang_thai_thanh_toan, phuong_thuc_thu, ghi_chu, ky_ke_khai) on hoa_don_xuat to authenticated;
