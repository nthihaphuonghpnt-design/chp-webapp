-- ============================================================================
-- Fix loi phat hien qua QA: migration 0085 them 8 cot moi vao nhan_vien
-- (gioi_tinh, ngay_sinh, quoc_tich, so_cccd, noi_cu_tru, trinh_do_chuyen_mon,
-- ngay_nghi_viec, ly_do_nghi_viec) nhung QUEN GRANT SELECT/UPDATE cho role
-- "authenticated" — bang nhan_vien dang dung column-level privilege lockdown
-- (xem migration 0039: revoke select toan bang, chi grant lai tung cot an
-- toan) nen COT MOI THEM VAO KHONG TU DONG DUOC GRANT, khac voi bang binh
-- thuong. Hau qua: trang "So quan ly lao dong" bao loi "permission denied
-- for table nhan_vien" ngay khi Ke toan xem — da xac nhan qua debug truc
-- tiep tren production.
-- ============================================================================

grant select (gioi_tinh, ngay_sinh, quoc_tich, so_cccd, noi_cu_tru, trinh_do_chuyen_mon, ngay_nghi_viec, ly_do_nghi_viec)
  on nhan_vien to authenticated;
grant update (gioi_tinh, ngay_sinh, quoc_tich, so_cccd, noi_cu_tru, trinh_do_chuyen_mon, ngay_nghi_viec, ly_do_nghi_viec)
  on nhan_vien to authenticated;
