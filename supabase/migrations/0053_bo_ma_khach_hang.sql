-- ============================================================================
-- Bo truong "Ma KH" (them o 0052) — quyet dinh dung han muc quan ly bang
-- Nhom khach hang (lien ket that trong he thong) thay vi ma code tu do
-- (khong co gi dam bao dung quy uoc, khong tra cuu/loc duoc).
-- ============================================================================

alter table khach_hang drop column if exists ma_khach_hang;
