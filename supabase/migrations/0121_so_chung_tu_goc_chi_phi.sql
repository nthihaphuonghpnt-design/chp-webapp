-- Cot rieng cho "so hoa don/chung tu GOC cua ben thu 3" khi 1 dong chi phi la
-- chi ho (chi_ho=true) — truoc gio phai nhet chung vao "ghi_chu" (vd "Lệ phí
-- kiểm dịch (0021693)"), khong tach rieng duoc voi ghi chu thuong va khong co
-- cot de hien rieng tren Bang ke. Khac voi hoa_don_id (hoa don CHP TU XUAT cho
-- khach) — day la so chung tu cua NHA CUNG CAP/BEN THU 3 xuat cho CHP.
alter table public.phat_sinh_chi_phi add column if not exists so_chung_tu_goc text;

grant select (so_chung_tu_goc) on public.phat_sinh_chi_phi to anon, authenticated;
grant insert (so_chung_tu_goc), update (so_chung_tu_goc) on public.phat_sinh_chi_phi to authenticated;
