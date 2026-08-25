-- ============================================================================
-- Them muc luong co dinh + muc dong BHXH cho nhan vien (Giam doc/Ke toan
-- nhap khi tao/sua nhan vien) — dung de tinh Bang luong.
-- ============================================================================

alter table nhan_vien add column if not exists luong_co_dinh numeric;
alter table nhan_vien add column if not exists muc_dong_bhxh numeric;

-- ============================================================================
-- Cho phep dinh kem chung tu vao To khai hai quan.
-- ============================================================================

alter table dinh_kem add column if not exists to_khai_id uuid references to_khai_hai_quan(id) on delete cascade;
