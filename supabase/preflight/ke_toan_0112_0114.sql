-- Chạy chỉ đọc trước khi áp dụng migrations 0112–0114.
-- Xác định các dữ liệu cũ cần kế toán kiểm tra; không sửa bản ghi nào.

-- Những nhắc việc tự động có khả năng bị sinh trùng theo lô và bước.
with tasks as (
  select don_hang_id,
    case
      when noi_dung like 'Chuẩn bị vận chuyển đơn hàng %' then 'chuan_bi_van_chuyen'
      when noi_dung like 'Tiếp nhận chứng từ đơn hàng % (Hiện trường đã hoàn thành)' then 'tiep_nhan_chung_tu'
      when noi_dung like 'Rà soát chi phí đơn hàng % (Chứng từ đã hoàn thành)' then 'ra_soat_chi_phi'
    end as buoc
  from lich_nhac_nho where don_hang_id is not null
)
select don_hang_id, buoc, count(*) as so_viec
from tasks where buoc is not null
group by don_hang_id, buoc having count(*) > 1
order by so_viec desc, don_hang_id;

-- So sánh định phí đang chia cho các lô với định phí sau migration 0114.
-- Xem theo tháng; nếu chênh lệch lớn, rà phân loại hóa đơn trước khi áp dụng.
select thang_phan_bo,
  count(*) as so_khoan,
  sum(tong_tien_thanh_toan) as phan_bo_hien_tai,
  coalesce(sum(case when loai_chi_phi = 'Định phí cố định' and don_hang_id is null
    then case when dieu_kien_khau_tru = 'Đủ điều kiện'
      then tong_tien_hang else tong_tien_thanh_toan end else 0 end), 0) as phan_bo_du_kien,
  count(*) filter (where loai_chi_phi = 'Phát sinh' and don_hang_id is not null) as so_hoa_don_gan_lo,
  count(*) filter (where khoan_muc like 'Lương + BHXH công ty tháng %') as so_dong_luong_cu
from hoa_don_dau_vao
where dang_hoat_dong = true
group by thang_phan_bo
order by thang_phan_bo desc;

-- Những dòng lương cũ có thể chứa cả COMMS theo lô; đối chiếu trước khi
-- ghi lại phần lương cố định và khoản doanh nghiệp đóng.
select id, thang_phan_bo, khoan_muc, tong_tien_hang, tien_thue_gtgt
from hoa_don_dau_vao
where dang_hoat_dong = true and khoan_muc like 'Lương + BHXH công ty tháng %'
order by thang_phan_bo desc;
