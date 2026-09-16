-- ============================================================================
-- Vá lỗi migration 0104: phát hiện qua UAT tổng thể end-to-end (nghiệp vụ →
-- kế toán → VAT → Sổ quỹ → công nợ → báo cáo) — RPC xuat_hoa_don_tu_bang_ke
-- (quy trình bình thường: gộp các dòng chi phí đã duyệt vào 1 hóa đơn vừa
-- xuất, KHÔNG phải "sửa lại sai sót") tự động UPDATE cột hoa_don_id trên
-- phat_sinh_chi_phi — bị chính trigger enforce_phat_sinh_chi_phi_update mới
-- thêm ở 0104 chặn nhầm, đòi nhập lý do, làm HỎNG LUỒNG XUẤT HÓA ĐƠN THẬT.
--
-- Cùng nguyên tắc đã áp dụng cho phieu_quyet_toan_id (hệ thống tự động gán,
-- không phải hành động "sửa" của người dùng): loại trừ thêm hoa_don_id khỏi
-- diff bắt buộc lý do.
-- ============================================================================

create or replace function enforce_phat_sinh_chi_phi_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  role text := current_phong_ban();
begin
  if role = 'Kế toán' then
    if old.phieu_quyet_toan_id is not null and new.phieu_quyet_toan_id is not distinct from old.phieu_quyet_toan_id then
      raise exception 'Dòng chi phí này đã nằm trong 1 phiếu quyết toán tạm ứng đã duyệt/đã thanh toán — không thể sửa trực tiếp. Hủy phiếu quyết toán trước nếu cần sửa lại.';
    end if;
    if old.trang_thai = 'Đã duyệt' then
      if (to_jsonb(new) - 'updated_at' - 'ly_do_sua_gan_nhat' - 'phieu_quyet_toan_id' - 'tien_thue' - 'tong_tien' - 'hoa_don_id')
         is distinct from
         (to_jsonb(old) - 'updated_at' - 'ly_do_sua_gan_nhat' - 'phieu_quyet_toan_id' - 'tien_thue' - 'tong_tien' - 'hoa_don_id') then
        if new.ly_do_sua_gan_nhat is null or btrim(new.ly_do_sua_gan_nhat) = '' or new.ly_do_sua_gan_nhat = old.ly_do_sua_gan_nhat then
          raise exception 'Chi phí đã duyệt — phải nhập lý do khi sửa.';
        end if;
      end if;
    end if;
    return new;
  elsif role = 'Sale' then
    if (to_jsonb(new) - 'gia_ban_sell' - 'updated_at' - 'tien_thue' - 'tong_tien') is distinct from (to_jsonb(old) - 'gia_ban_sell' - 'updated_at' - 'tien_thue' - 'tong_tien') then
      raise exception 'Sale chỉ được sửa giá bán (sell).';
    end if;
  elsif role in ('Hiện trường', 'Điều phối', 'Chứng từ') then
    if role <> 'Điều phối' and exists (
      select 1 from cong_viec_hoan_thanh c
      where c.don_hang_id = old.don_hang_id and c.nhan_vien_id = old.nguoi_nhap_id and c.trang_thai = 'Đã tiếp nhận'
    ) then
      raise exception 'Kế toán đã tiếp nhận phần việc này, không thể sửa chi phí — liên hệ Kế toán.';
    end if;
    if old.trang_thai = 'Đã duyệt' then
      raise exception 'Chi phí đã được duyệt, không thể sửa.';
    end if;
    if new.gia_ban_sell is distinct from old.gia_ban_sell then
      raise exception 'Không có quyền sửa giá bán (sell).';
    end if;
    if new.trang_thai in ('Đã duyệt', 'Từ chối') then
      raise exception 'Không có quyền duyệt/từ chối chi phí.';
    end if;
    if new.tinh_trang_thanh_toan is distinct from old.tinh_trang_thanh_toan or new.so_tien_da_thanh_toan is distinct from old.so_tien_da_thanh_toan then
      raise exception 'Không có quyền cập nhật tình trạng thanh toán.';
    end if;
  else
    raise exception 'Không có quyền sửa chi phí.';
  end if;
  return new;
end;
$$;
