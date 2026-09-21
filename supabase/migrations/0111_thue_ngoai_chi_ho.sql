-- ============================================================================
-- don_thue_ngoai chua bao gio co khai niem "Chi ho" (co san tren
-- phat_sinh_chi_phi tu lau) — phat hien theo phan anh Bao Dung (2026-09-20):
-- doi tac thue ngoai/dich vu ben thu 3 (vd thue van tai ngoai) van co truong
-- hop chi ho dung gia, khong loi, nhung Bang ke -> Xuat hoa don hien LUON
-- tinh VAT + tinh vao "Doanh thu chiu VAT" cho moi dong Thue ngoai, khong co
-- cach nao danh dau la Chi ho de loai tru giong Chi phi phat sinh dang lam.
-- Anh huong: BangKeView.tsx (VAT/doanh thu tren hoa don xuat), trang chi tiet
-- don hang + BaoCaoView.tsx (Doanh thu/Chi phi cong ty). Da xac nhan voi Bao
-- Dung: CHI them 1 checkbox "Chi ho" (khong them "Noi bo" — moi dong Thue
-- ngoai con lai van mac dinh la chi phi/doanh thu that cua cong ty nhu hien
-- gio, giu dung cach tinh cu).
--
-- NHO GRANT SELECT ngay trong migration nay — bai hoc tu 0107 (quen grant
-- gay "permission denied for table don_thue_ngoai" chan toan bo luu Thue
-- ngoai o production).
-- ============================================================================

alter table don_thue_ngoai add column if not exists chi_ho boolean not null default false;

grant select (chi_ho) on don_thue_ngoai to authenticated;
