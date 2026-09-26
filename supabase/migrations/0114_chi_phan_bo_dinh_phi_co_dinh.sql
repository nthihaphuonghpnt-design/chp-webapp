-- Chỉ phân bổ chi phí chung đã phân loại là định phí. Hóa đơn phát sinh
-- cho từng lô không được chia đều thêm cho các lô khác trong tháng.
-- Giữ nguyên phân loại dữ liệu cũ để kế toán rà soát trước khi áp dụng.
-- VAT đủ điều kiện khấu trừ là khoản thuế được thu hồi, không tính vào chi
-- phí quản trị; khoản chưa xác minh tạm tính theo tổng thanh toán.
create or replace function tong_dinh_phi_theo_thang()
returns table (thang_nam text, so_tien numeric)
language sql
security definer
set search_path = public
stable
as $$
  select thang_phan_bo as thang_nam,
    sum(case when dieu_kien_khau_tru = 'Đủ điều kiện'
      then tong_tien_hang else tong_tien_thanh_toan end) as so_tien
  from hoa_don_dau_vao
  where dang_hoat_dong = true
    and loai_chi_phi = 'Định phí cố định'
    and don_hang_id is null
  group by thang_phan_bo;
$$;

grant execute on function tong_dinh_phi_theo_thang() to authenticated;
