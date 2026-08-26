-- ============================================================================
-- Fix: so tien hoa don da xuat khong khop voi Bang ke chi tiet.
--
-- tien_vat truoc day la generated column = tong_tien_truoc_thue * vat_percent / 100,
-- gia dinh CA hoa don chi co 1 muc VAT duy nhat. Nhung tren Bang ke chi tiet, moi
-- dong chi phi co the co % VAT rieng (luu tu luc nhap o Don hang) va trang duoc
-- uu tien hien theo dung dong khi khung "VAT %" o Tao hoa don de trong. Khi do
-- Bang ke chi tiet hien tien VAT > 0 nhung hoa don da luu lai co tien_vat = 0
-- (vi vat_percent = null) -> so tien hoa don khong khop voi Bang ke chi tiet.
--
-- Doi tien_vat thanh cot thuong: web se tinh tong VAT cong don tung dong (giong
-- het so hien tren Bang ke chi tiet) va luu thang vao day, thay vi de DB tu suy
-- ra tu 1 ty le duy nhat.
-- ============================================================================

alter table hoa_don_xuat drop column if exists tong_tien;
alter table hoa_don_xuat drop column if exists tien_vat;

alter table hoa_don_xuat add column tien_vat numeric not null default 0;

-- Backfill so lieu cu bang cong thuc cu (tot nhat co the, vi du lieu tung dong
-- tai thoi diem xuat hoa don cu khong con luu lai duoc nua).
update hoa_don_xuat
set tien_vat = round(coalesce(tong_tien_truoc_thue, 0) * coalesce(vat_percent, 0) / 100, 2);

alter table hoa_don_xuat add column tong_tien numeric generated always as (
  coalesce(tong_tien_truoc_thue, 0) + coalesce(tien_vat, 0) + coalesce(tien_chi_ho, 0)
) stored;
