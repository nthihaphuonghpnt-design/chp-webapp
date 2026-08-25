-- ============================================================================
-- Bang ke: theo doi dong chi phi nao da/chua xuat hoa don, tach rieng Chi ho
-- va Gia ban. Hoa don xuat gio gom ca "Tien chi ho" de cong no phai thu tinh
-- dung: Cong no phai thu = tong_tien (gia ban + VAT + chi ho) - da thu.
-- ============================================================================

alter table phat_sinh_chi_phi add column if not exists hoa_don_id uuid references hoa_don_xuat(id) on delete set null;
alter table phu_thu add column if not exists hoa_don_id uuid references hoa_don_xuat(id) on delete set null;

alter table hoa_don_xuat add column if not exists tien_chi_ho numeric;

alter table hoa_don_xuat drop column if exists tong_tien;
alter table hoa_don_xuat add column tong_tien numeric generated always as (
  coalesce(tong_tien_truoc_thue, 0)
  + round(coalesce(tong_tien_truoc_thue, 0) * coalesce(vat_percent, 0) / 100, 2)
  + coalesce(tien_chi_ho, 0)
) stored;
