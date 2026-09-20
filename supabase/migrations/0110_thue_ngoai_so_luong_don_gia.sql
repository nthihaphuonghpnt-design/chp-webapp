-- ============================================================================
-- phat_sinh_chi_phi da co san so_luong/don_gia (dung de "SL x Don gia" tu
-- dong tinh ra so_tien_da_chi tren UI ChiPhiGopSection.tsx) nhung
-- don_thue_ngoai thi chua — phat hien qua phan anh Bao Dung (2026-09-20): lo
-- 2 cont ma phi dich vu HQ khong nhan len theo dau cont vi khong co cho nhap
-- "So luong" rieng cho dong Thue ngoai, chi co "So luong" cua don hang (chi
-- de tham khao, khong lien ket gi ve mat tinh toan). Them 2 cot nay cho
-- don_thue_ngoai de dung chung 1 UI/logic voi phat_sinh_chi_phi.
--
-- NHO GRANT SELECT — bai hoc tu 0107 (quen grant, gay "permission denied for
-- table don_thue_ngoai" chan toan bo luu Thue ngoai o production): 0061 da
-- revoke select toan bang + grant lai theo danh sach cot cu, cot moi luon
-- phai duoc grant rieng trong CUNG migration them cot, khong duoc de sau.
-- ============================================================================

alter table don_thue_ngoai add column if not exists so_luong numeric;
alter table don_thue_ngoai add column if not exists don_gia numeric;

grant select (so_luong, don_gia) on don_thue_ngoai to authenticated;
