-- RA SOAT DU LIEU (yeu cau ban 2, 27/11/2026). CHI DOC — khong sua gi.
-- Chay tung khoi trong Supabase SQL Editor.

-- 1) Hoa don da thu tien nhung KHONG co dong Thu trong So quy
select h.so_hoa_don, h.ngay_xuat, h.so_tien_da_thu, h.phuong_thuc_thu, h.trang_thai
from hoa_don_xuat h
where coalesce(h.so_tien_da_thu, 0) > 0
  and not exists (select 1 from so_quy s where s.nguon_bang = 'hoa_don_xuat' and s.nguon_id = h.id)
order by h.ngay_xuat;

-- 2) Tam ung/giai chi da duyet nhung KHONG vao So quy (chua chon nguon tien,
--    hoac chon "Chuyen khoan ca nhan (khong qua quy)")
select t.ngay_thuc_hien, t.loai, t.doi_tuong, coalesce(n.ho_ten, k.ten_day_du, t.ten_tai_xe) as ten,
       t.so_tien, t.phuong_thuc, t.ghi_chu
from tam_ung_giai_chi t
left join nhan_vien n on n.id = t.nhan_vien_id
left join khach_hang k on k.id = t.khach_hang_id
where t.trang_thai = 'Đã duyệt'
  and coalesce(t.phuong_thuc, '') not in ('Tiền mặt', 'Tài khoản công ty')
order by t.ngay_thuc_hien;

-- 3) So quy Tien mat: tong Thu / Chi theo nguon
select nguon_bang, loai_giao_dich, count(*) as so_dong, sum(so_tien) as tong
from so_quy where loai_so = 'Tiền mặt'
group by 1, 2 order by 1, 2;

-- 4) Ghi chu go tay "khong qua so quy"
select id, ngay_thuc_hien, loai, so_tien, phuong_thuc, ghi_chu
from tam_ung_giai_chi
where ghi_chu ilike '%không qua sổ quỹ%'
order by ngay_thuc_hien;

-- 5) Cac cong ty nhom Apple Trans va ho so phap ly (MST/dia chi/nhom)
select k.id, k.ten_viet_tat, k.ten_day_du, k.ma_so_thue, k.dia_chi, k.dang_hoat_dong, g.ten as nhom,
       (select count(*) from don_hang d where d.khach_hang_id = k.id) as so_don,
       (select count(*) from hoa_don_xuat h where h.khach_hang_id = k.id) as so_hoa_don
from khach_hang k
left join nhom_khach_hang g on g.id = k.nhom_khach_hang_id
where concat_ws(' ', k.ten_viet_tat, k.ten_day_du) ~* '(apple|amal|atlas|asus|hồng mộc|hong moc|hồng ngọc)'
order by k.ten_day_du;

-- 6) Don hang / hoa don con gan vao khach da ngung hoat dong
select d.so_don_hang, k.ten_viet_tat, k.ten_day_du, k.ghi_chu
from don_hang d join khach_hang k on k.id = d.khach_hang_id
where k.dang_hoat_dong = false
order by d.so_don_hang;

-- 7) Nhan vien trung ten
select n.id, n.ho_ten, p.ten as phong_ban, n.dang_lam_viec, n.auth_user_id is not null as co_tai_khoan,
       (select count(*) from don_hang d where d.sale_phu_trach_id = n.id) as don_lam_sale,
       (select count(*) from tam_ung_giai_chi t where t.nhan_vien_id = n.id) as phieu_tam_ung
from nhan_vien n left join phong_ban p on p.id = n.phong_ban_id
where lower(n.ho_ten) in (select lower(ho_ten) from nhan_vien group by lower(ho_ten) having count(*) > 1)
order by n.ho_ten;

-- 8) Ham xuat_hoa_don_tu_bang_ke tren database dang co may ban, ban nao ghi so ke toan
--    (0109 va 0118 trong repo dinh nghia 2 danh sach tham so khac nhau)
select pg_get_function_identity_arguments(oid) as tham_so,
       prosrc ilike '%ghi_so_hoa_don_xuat%' as co_ghi_so
from pg_proc where proname = 'xuat_hoa_don_tu_bang_ke';

-- ---------------------------------------------------------------------------
-- BAN BO SUNG V3-V5
-- ---------------------------------------------------------------------------

-- 9) Dong Thu hoa don trong So quy: ngay dang ghi (= ngay xuat hoa don, do
--    trigger sync_so_quy_hoa_don) so voi ngay bam "Thu tien" trong nhat ky
select h.so_hoa_don, s.loai_so, s.so_tien, s.ngay as ngay_trong_so_quy,
       max(n.created_at at time zone 'Asia/Ho_Chi_Minh')::date as lan_bam_thu_cuoi,
       count(n.created_at) as so_lan_thu
from so_quy s
join hoa_don_xuat h on h.id = s.nguon_id
left join nhat_ky_thao_tac n on n.bang = 'hoa_don_xuat' and n.dong_id = h.id and n.hanh_dong = 'thu_tien_hoa_don_xuat'
where s.nguon_bang = 'hoa_don_xuat'
group by h.so_hoa_don, s.loai_so, s.so_tien, s.ngay
order by s.ngay;

-- 10) Credit phat sinh va dong So quy tuong ung (so quy lay ngay NHAP, khong
--     phai ngay nhan tien goc)
select c.id as credit_id, s.id as so_quy_id, s.ngay, s.loai_so, s.so_tien, c.ly_do
from credit_giao_dich c
join so_quy s on s.nguon_bang = 'credit_giao_dich' and s.nguon_id = c.id
order by s.ngay;

-- 11) Hoa don C26TAA-91 / 95 co trong app khong
select so_hoa_don, ngay_xuat, tong_tien, trang_thai from hoa_don_xuat
where so_hoa_don ~ '(^|[^0-9])(91|95)$';

-- 12) So dong cac bang ma Bao cao tai 1 lan (API Supabase mac dinh tra toi da
--     1000 dong/truy van; vuot muc nay thi bao cao co the thieu so lieu)
select 'phat_sinh_chi_phi' as bang, count(*) from phat_sinh_chi_phi
union all select 'don_hang', count(*) from don_hang
union all select 'so_quy', count(*) from so_quy
union all select 'hoa_don_don_hang', count(*) from hoa_don_don_hang;
