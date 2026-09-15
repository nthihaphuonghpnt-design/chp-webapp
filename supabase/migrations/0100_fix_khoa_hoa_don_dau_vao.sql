-- ============================================================================
-- Vá lỗi migration 0099: revoke update (cot) on hoa_don_dau_vao KHONG co tac
-- dung vi bang nay dang co GRANT UPDATE toan bang (khong giong hoa_don_xuat
-- da bi khoa rieng tu 0095) — phat hien qua kiem tra truc tiep
-- has_column_privilege('authenticated','hoa_don_dau_vao','so_tien_da_thanh_toan','update')
-- van tra ve true SAU KHI da chay revoke (cot) trong 0099. Sua dung: revoke
-- UPDATE toan bang roi grant lai dung danh sach cot duoc phep sua truc tiep.
-- ============================================================================
revoke update on hoa_don_dau_vao from authenticated;
grant update (
  mau_so_hoa_don, so_hoa_don, ngay_hoa_don, ngay_ky_hoa_don, nha_cung_cap_id,
  khoan_muc, loai_chi_phi, thang_phan_bo, tong_tien_hang, tien_thue_gtgt,
  tong_tien_thanh_toan, dang_hoat_dong, ghi_chu, don_vi_tinh, so_luong, don_gia,
  tai_khoan_no, don_hang_id, ky_ke_khai, dieu_kien_khau_tru, chi_ho
) on hoa_don_dau_vao to authenticated;
