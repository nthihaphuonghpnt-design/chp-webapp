-- ============================================================================
-- Theo yeu cau nguoi dung: KHONG lam ke toan kep (khong hach toan No/Co,
-- khong thay the phan mem ke toan that nhu AVA Ke toan) — nhung muon
-- "Hoa don dau vao" co DU THONG TIN de xuat Excel roi nhap lai (import) vao
-- phan mem ke toan, tranh phai go tay 2 lan. Them cac cot pho bien ma phan
-- mem ke toan can khi nhap 1 "phieu mua hang hoa dich vu": don vi tinh, so
-- luong, don gia (thay vi chi co tong tien gop), va tai khoan chi phi/kho
-- goi y (TK No — Ke toan tu dien theo he thong tai khoan cong ty dang dung,
-- vd 642/156/641...). TK Co (thuong la 331 - phai tra nguoi ban, hoac
-- 111/112 neu da tra ngay) KHONG luu thanh cot rieng vi suy ra duoc tu
-- tinh_trang_thanh_toan/phuong_thuc_thanh_toan da co san — tinh luc xuat
-- Excel, tranh luu du thua/co the lech voi trang thai thanh toan that.
-- ============================================================================

alter table hoa_don_dau_vao add column if not exists don_vi_tinh text;
alter table hoa_don_dau_vao add column if not exists so_luong numeric;
alter table hoa_don_dau_vao add column if not exists don_gia numeric;
alter table hoa_don_dau_vao add column if not exists tai_khoan_no text;
