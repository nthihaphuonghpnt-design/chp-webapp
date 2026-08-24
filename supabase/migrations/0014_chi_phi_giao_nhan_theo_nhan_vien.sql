-- ============================================================================
-- Chi phi giao nhan/chuyen gan theo tung nhan vien (Hien truong, Chung tu...)
-- de cuoi thang gom thanh bang luong theo tung nguoi.
-- ============================================================================

alter table chi_phi_giao_nhan add column if not exists nhan_vien_id uuid references nhan_vien(id);
