-- ============================================================================
-- Phase 5 (audit): "Kế toán quyền" != "sửa mọi thứ" — phiếu đã duyệt/đã thanh
-- toán không được sửa ngầm.
--
-- pqt_update (0065) chi kiem tra current_phong_ban() in ('Kế toán','Giám
-- đốc'), KHONG kiem tra trang_thai hien tai cua dong. Trigger
-- enforce_phieu_quyet_toan_trang_thai chi chay "before update OF trang_thai"
-- — neu client UPDATE cac cot KHAC (tong_da_tam_ung, tong_chi_thuc_te,
-- chenh_lech_rong, nguoi_duyet_id...) ma KHONG dong toi trang_thai, trigger
-- khong he chay, RLS van cho qua binh thuong. Ke toan (hoac bat ky ai chiem
-- duoc quyen Ke toan) co the goi API truc tiep sua thang so tien tren 1
-- phieu DA DUYET/DA THANH TOAN ma khong qua bat ky kiem tra/ghi log nao.
--
-- Rieng nhanh "Da duyet -> Da thanh toan" (danh dau da thanh toan, chon
-- phuong_thuc) truoc gio lam bang UPDATE truc tiep tu client
-- (PhieuQuyetToanView.tsx) vi khong co RPC rieng — them RPC
-- thanh_toan_phieu_quyet_toan_tam_ung de co the khoa UPDATE truc tiep hoan
-- toan ma khong lam gay tinh nang nay.
--
-- Fix: THU HOI quyen UPDATE truc tiep tren toan bang tu client, CHI cho phep
-- sua rieng cot ghi_chu (Ke toan sua ghi chu khong can qua RPC, it rui ro).
-- Moi thay doi trang_thai/phuong_thuc/nguoi_duyet_id/cac cot so tien BAT
-- BUOC phai di qua 1 trong 3 RPC SECURITY DEFINER (tao/duyet/huy/thanh_toan)
-- — cac RPC nay khong bi anh huong boi REVOKE vi chay voi quyen cua chu ham,
-- khong phai quyen cua client goi.
-- ============================================================================

create or replace function thanh_toan_phieu_quyet_toan_tam_ung(p_phieu_id uuid, p_phuong_thuc text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_phong_ban() not in ('Kế toán', 'Giám đốc') then
    raise exception 'Chỉ Kế toán/Giám đốc được đánh dấu đã thanh toán';
  end if;
  if p_phuong_thuc not in ('Tiền mặt', 'Tài khoản công ty') then
    raise exception 'Phương thức không hợp lệ';
  end if;

  update phieu_quyet_toan_tam_ung
  set trang_thai = 'Đã thanh toán', phuong_thuc = p_phuong_thuc
  where id = p_phieu_id and trang_thai = 'Đã duyệt';

  if not found then
    raise exception 'Không tìm thấy phiếu ở trạng thái Đã duyệt để thanh toán';
  end if;
end;
$$;

grant execute on function thanh_toan_phieu_quyet_toan_tam_ung(uuid, text) to authenticated;

revoke update on phieu_quyet_toan_tam_ung from authenticated;
grant update (ghi_chu) on phieu_quyet_toan_tam_ung to authenticated;
