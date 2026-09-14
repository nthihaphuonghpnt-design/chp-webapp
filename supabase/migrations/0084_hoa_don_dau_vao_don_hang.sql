-- ============================================================================
-- Theo yeu cau nguoi dung: muon biet 1 khoan Chi trong So quy / 1 dong Hoa
-- don dau vao la CHI CHO DON HANG NAO.
--
-- Co can nhac ky truoc khi lam: KHONG tu dong bien moi khoan chi phi/thue
-- ngoai nhap ben trang don hang (phat_sinh_chi_phi/don_thue_ngoai co
-- nha_cung_cap_id/doi_tac_thue_ngoai_id) thanh 1 dong hoa_don_dau_vao that
-- su — vi hoa_don_dau_vao dang la nguon tinh "dinh phi phan bo/lo" (chia
-- deu cho MOI don hang trong thang, xem RPC tong_dinh_phi_theo_thang), con
-- chi phi/thue ngoai tren don hang da duoc TRU TRUC TIEP vao loi nhuan cua
-- CHINH don hang do (loiNhuanTruocHoaHongCuaDon). Neu tu dong bien no thanh
-- hoa_don_dau_vao va cong vao "tong dinh phi thang" thi khoan tien do se bi
-- TRU 2 LAN (1 lan truc tiep tren don hang cua no, 1 lan nua qua dinh phi
-- phan bo deu cho TAT CA don hang khac) — sai lech loi nhuan toan bo.
--
-- Fix dung: chi them 1 cot don_hang_id (tuy chon) tren hoa_don_dau_vao, de
-- Ke toan GAN THEM 1 don hang cho 1 hoa don dau vao khi lien quan (vi du
-- hoa don thue ngoai lien quan rieng 1 lo hang cu the) — thuan tuy de
-- TRUY VET, khong doi cach tinh dinh phi phan bo. Rieng chi phi/thue ngoai
-- nhap tren trang don hang thi VON DA CO san don_hang_id (cot don_hang_id
-- tren chinh 2 bang do tu truoc), nen So quy chi can JOIN nguoc lai qua
-- nguon_bang/nguon_id (kieu polymorphic da dung san, xem SoQuyView.tsx) de
-- hien "Don hang" — khong can them cot gi moi cho 2 bang nay.
-- ============================================================================

alter table hoa_don_dau_vao add column if not exists don_hang_id uuid references don_hang(id);
create index if not exists idx_hddv_don_hang on hoa_don_dau_vao (don_hang_id);
