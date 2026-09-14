-- ============================================================================
-- Theo yeu cau nguoi dung: can "So quan ly lao dong" — ho so bat buoc theo
-- Dieu 3 Nghi dinh 145/2020/ND-CP (huong dan Bo luat Lao dong). Bang
-- nhan_vien hien tai (ho_ten, so_dien_thoai, phong_ban, luong...) THIEU rat
-- nhieu truong bat buoc: gioi tinh, ngay sinh, quoc tich, noi cu tru, so
-- CCCD, trinh do chuyen mon, va thoi diem/ly do cham dut HDLD khi nghi
-- viec. Them cac cot con thieu de co du du lieu xuat So quan ly lao dong.
-- ============================================================================

alter table nhan_vien add column if not exists gioi_tinh text check (gioi_tinh in ('Nam', 'Nữ', 'Khác'));
alter table nhan_vien add column if not exists ngay_sinh date;
alter table nhan_vien add column if not exists quoc_tich text not null default 'Việt Nam';
alter table nhan_vien add column if not exists so_cccd text;
alter table nhan_vien add column if not exists noi_cu_tru text;
alter table nhan_vien add column if not exists trinh_do_chuyen_mon text;
alter table nhan_vien add column if not exists ngay_nghi_viec date;
alter table nhan_vien add column if not exists ly_do_nghi_viec text;
