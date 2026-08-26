-- ============================================================================
-- Them index cho cac cot khoa ngoai (foreign key) dang duoc loc/join lien tuc
-- trong app (don_hang_id, khach_hang_id, hoa_don_id...) nhung chua co index nao
-- ngoai khoa chinh tu truoc den gio. Postgres KHONG tu tao index cho foreign key,
-- nen cac truy van nhu "chi phi cua 1 don hang", "don hang cua 1 khach hang"...
-- dang phai quet toan bang. Day la nguyen nhan chinh khien thao tac (vi du chon
-- khach hang o Bang ke) cham dan khi du lieu tang len.
-- Chi them index, khong doi schema/du lieu, an toan chay lai nhieu lan.
-- ============================================================================

-- Don hang
create index if not exists idx_don_hang_khach_hang_id on don_hang(khach_hang_id);
create index if not exists idx_don_hang_sale_phu_trach_id on don_hang(sale_phu_trach_id);
create index if not exists idx_don_hang_hien_truong_phu_trach_id on don_hang(hien_truong_phu_trach_id);
create index if not exists idx_don_hang_chung_tu_phu_trach_id on don_hang(chung_tu_phu_trach_id);
create index if not exists idx_don_hang_nguoi_tao_id on don_hang(nguoi_tao_id);

-- Container & to khai
create index if not exists idx_don_hang_container_don_hang_id on don_hang_container(don_hang_id);
create index if not exists idx_to_khai_hai_quan_don_hang_id on to_khai_hai_quan(don_hang_id);

-- Chi tiet van chuyen
create index if not exists idx_chi_tiet_van_chuyen_don_hang_id on chi_tiet_van_chuyen(don_hang_id);

-- Dinh kem (dung chung nhieu bang, luon loc theo 1 trong 4 cot nay)
create index if not exists idx_dinh_kem_don_hang_id on dinh_kem(don_hang_id);
create index if not exists idx_dinh_kem_hop_dong_id on dinh_kem(hop_dong_id);
create index if not exists idx_dinh_kem_hoa_don_id on dinh_kem(hoa_don_id);
create index if not exists idx_dinh_kem_to_khai_id on dinh_kem(to_khai_id);

-- Phat sinh chi phi (bang duoc truy van nhieu nhat: Don hang, Bang ke, Bao cao)
create index if not exists idx_phat_sinh_chi_phi_don_hang_id on phat_sinh_chi_phi(don_hang_id);
create index if not exists idx_phat_sinh_chi_phi_loai_chi_phi_id on phat_sinh_chi_phi(loai_chi_phi_id);
create index if not exists idx_phat_sinh_chi_phi_nha_cung_cap_id on phat_sinh_chi_phi(nha_cung_cap_id);
create index if not exists idx_phat_sinh_chi_phi_doi_tac_thue_ngoai_id on phat_sinh_chi_phi(doi_tac_thue_ngoai_id);
create index if not exists idx_phat_sinh_chi_phi_chi_tiet_van_chuyen_id on phat_sinh_chi_phi(chi_tiet_van_chuyen_id);
create index if not exists idx_phat_sinh_chi_phi_to_khai_id on phat_sinh_chi_phi(to_khai_id);
create index if not exists idx_phat_sinh_chi_phi_hoa_don_id on phat_sinh_chi_phi(hoa_don_id);
create index if not exists idx_phat_sinh_chi_phi_nguoi_nhap_id on phat_sinh_chi_phi(nguoi_nhap_id);
create index if not exists idx_phat_sinh_chi_phi_nguoi_duyet_id on phat_sinh_chi_phi(nguoi_duyet_id);

-- Phu thu
create index if not exists idx_phu_thu_don_hang_id on phu_thu(don_hang_id);
create index if not exists idx_phu_thu_hoa_don_id on phu_thu(hoa_don_id);

-- Chi phi giao nhan
create index if not exists idx_chi_phi_giao_nhan_don_hang_id on chi_phi_giao_nhan(don_hang_id);
create index if not exists idx_chi_phi_giao_nhan_nhan_vien_id on chi_phi_giao_nhan(nhan_vien_id);

-- Don thue ngoai
create index if not exists idx_don_thue_ngoai_don_hang_id on don_thue_ngoai(don_hang_id);
create index if not exists idx_don_thue_ngoai_doi_tac_thue_ngoai_id on don_thue_ngoai(doi_tac_thue_ngoai_id);
create index if not exists idx_don_thue_ngoai_nguoi_nhap_id on don_thue_ngoai(nguoi_nhap_id);

-- Bang gia khach hang
create index if not exists idx_bang_gia_khach_hang_khach_hang_id on bang_gia_khach_hang(khach_hang_id);
create index if not exists idx_bang_gia_khach_hang_loai_chi_phi_id on bang_gia_khach_hang(loai_chi_phi_id);
create index if not exists idx_bang_gia_khach_hang_hang_hoa_id on bang_gia_khach_hang(hang_hoa_id);

-- Lich nhac nho
create index if not exists idx_lich_nhac_nho_phong_ban_id on lich_nhac_nho(phong_ban_id);
create index if not exists idx_lich_nhac_nho_don_hang_id on lich_nhac_nho(don_hang_id);
create index if not exists idx_lich_nhac_nho_nguoi_phu_trach_id on lich_nhac_nho(nguoi_phu_trach_id);
create index if not exists idx_lich_nhac_nho_nguoi_tao_id on lich_nhac_nho(nguoi_tao_id);

-- Tam ung giai chi
create index if not exists idx_tam_ung_giai_chi_nhan_vien_id on tam_ung_giai_chi(nhan_vien_id);
create index if not exists idx_tam_ung_giai_chi_nguoi_de_nghi_id on tam_ung_giai_chi(nguoi_de_nghi_id);
create index if not exists idx_tam_ung_giai_chi_don_hang_id on tam_ung_giai_chi(don_hang_id);
create index if not exists idx_tam_ung_giai_chi_khach_hang_id on tam_ung_giai_chi(khach_hang_id);

-- Hop dong khach hang
create index if not exists idx_hop_dong_khach_hang_khach_hang_id on hop_dong_khach_hang(khach_hang_id);
create index if not exists idx_hop_dong_khach_hang_nha_cung_cap_id on hop_dong_khach_hang(nha_cung_cap_id);
create index if not exists idx_hop_dong_khach_hang_nguoi_tao_id on hop_dong_khach_hang(nguoi_tao_id);

-- Hoa don xuat
create index if not exists idx_hoa_don_xuat_khach_hang_id on hoa_don_xuat(khach_hang_id);
create index if not exists idx_hoa_don_xuat_nguoi_tao_id on hoa_don_xuat(nguoi_tao_id);

-- Hoa don <-> Don hang (many-to-many)
create index if not exists idx_hoa_don_don_hang_hoa_don_id on hoa_don_don_hang(hoa_don_id);
create index if not exists idx_hoa_don_don_hang_don_hang_id on hoa_don_don_hang(don_hang_id);

-- Luong da tra
create index if not exists idx_luong_da_tra_nhan_vien_id on luong_da_tra(nhan_vien_id);
create index if not exists idx_luong_da_tra_nguoi_tra_id on luong_da_tra(nguoi_tra_id);

-- Nhan vien
create index if not exists idx_nhan_vien_phong_ban_id on nhan_vien(phong_ban_id);
