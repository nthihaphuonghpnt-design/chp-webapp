-- ============================================================================
-- "Chặng" (lien ket toi 1 dong chi_tiet_van_chuyen) truoc gio chi co tren
-- phat_sinh_chi_phi (Chi phi phat sinh) — don_thue_ngoai (Thue ngoai) chua
-- bao gio co cot nay, du ban chat cung la chi phi van chuyen (vd "Van tai
-- noi dia thue ngoai") nen viec gan chang cung hop ly y het. UI o
-- ChiPhiGopSection.tsx truoc day khoa cung o "Chặng" cho dong Thue ngoai vi
-- khong co cho luu — theo yeu cau Bao Dung (2026-09-20), them cot nay.
-- ============================================================================

alter table don_thue_ngoai add column if not exists chi_tiet_van_chuyen_id uuid references chi_tiet_van_chuyen(id);
