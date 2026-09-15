-- ============================================================================
-- Them cac cot phuc vu tong hop VAT theo ky (thang/quy/nam) tren ca hoa don
-- xuat (VAT dau ra) va hoa don dau vao (VAT dau vao):
--   - ky_ke_khai: ky ke khai thue ('YYYY-MM'), MAC DINH suy tu ngay
--     xuat/ngay hoa don nhung Ke toan co the sua tay cho truong hop ke khai
--     tre/hoi to. KHAC voi thang_phan_bo tren hoa_don_dau_vao (0082) — cot do
--     la thang PHAN BO DINH PHI cho cac lo hang, khong lien quan ky thue.
--   - hoa_don_dau_vao.dieu_kien_khau_tru: Ke toan danh gia thu cong hoa don
--     dau vao co du dieu kien khau tru VAT hay khong (phu thuoc quy dinh ve
--     phuong thuc/han muc thanh toan qua ngan hang, chung tu hop le... qua
--     phuc tap de tu dong suy ra tin cay duoc).
--   - hoa_don_dau_vao.chi_ho: hoa don dau vao lien quan chi ho (CHP tra ho
--     khach, khong phai chi phi cua CHP) phai loai khoi khau tru VAT cua CHP —
--     mirror dung pattern chi_ho da co tren phat_sinh_chi_phi/don_thue_ngoai.
-- ============================================================================

alter table hoa_don_xuat
  add column if not exists ky_ke_khai text;

update hoa_don_xuat set ky_ke_khai = to_char(ngay_xuat, 'YYYY-MM') where ky_ke_khai is null;

alter table hoa_don_dau_vao
  add column if not exists ky_ke_khai text,
  add column if not exists dieu_kien_khau_tru text not null default 'Đủ điều kiện'
    check (dieu_kien_khau_tru in ('Đủ điều kiện', 'Không đủ điều kiện', 'Chưa xác định')),
  add column if not exists chi_ho boolean not null default false;

update hoa_don_dau_vao set ky_ke_khai = to_char(ngay_hoa_don, 'YYYY-MM') where ky_ke_khai is null;

create index if not exists idx_hoa_don_xuat_ky_ke_khai on hoa_don_xuat(ky_ke_khai);
create index if not exists idx_hoa_don_dau_vao_ky_ke_khai on hoa_don_dau_vao(ky_ke_khai);
