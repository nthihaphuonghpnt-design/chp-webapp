-- ============================================================================
-- Them "Sale phu trach" cho don hang — khac voi "nguoi tao" (vi Chung tu/Giam
-- doc gio cung tao duoc don). Dung de tinh hoa hong dung nguoi va lam bao cao
-- doanh so theo Sale sau nay.
-- ============================================================================

alter table don_hang add column if not exists sale_phu_trach_id uuid references nhan_vien(id);
