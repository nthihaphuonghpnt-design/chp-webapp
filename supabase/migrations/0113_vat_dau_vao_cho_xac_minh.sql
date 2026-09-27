-- Hóa đơn mới cần kế toán xác minh chứng từ và điều kiện khấu trừ VAT.
-- Không tự đổi các bản ghi lịch sử vì đã có thể được kê khai.
alter table hoa_don_dau_vao
  alter column dieu_kien_khau_tru set default 'Chưa xác định';
