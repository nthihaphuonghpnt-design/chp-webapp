-- ============================================================================
-- Fix: don_thue_ngoai.ly_do_sua_gan_nhat thieu grant SELECT (ghi duoc nhung
-- doc lai la bi "permission denied for column" neu sau nay UI can hien thi
-- ly do sua gan nhat cho Thue ngoai). Cung mot bai hoc da gap o 0107/0108 —
-- them cot moi vao bang co column-level grant (0061) thi phai grant du ca
-- SELECT lan UPDATE trong cung 1 migration, khong chi UPDATE nhu 0104 da lam.
-- phat_sinh_chi_phi.ly_do_sua_gan_nhat da co du SELECT tu 0104, chi
-- don_thue_ngoai bi thieu.
-- ============================================================================

grant select (ly_do_sua_gan_nhat) on don_thue_ngoai to authenticated;
