-- ============================================================================
-- Gan Tam ung/Giai chi voi 1 don hang cu the (tuy chon) — de biet khoan tam
-- ung/giai chi nao thuoc lo hang nao, phuc vu bao cao theo ca nguoi lan theo don.
-- ============================================================================

alter table tam_ung_giai_chi add column if not exists don_hang_id uuid references don_hang(id) on delete set null;
