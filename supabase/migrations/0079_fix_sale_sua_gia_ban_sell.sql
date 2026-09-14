-- ============================================================================
-- Phat hien trong dot QA toan dien (nhap 12 don hang test that, chay qua het
-- luong nghiep vu): Sale KHONG BAO GIO sua duoc "Giá bán (sell)" tren dong
-- chi phi/thue ngoai, du UI (ChiPhiGopSection.tsx) cho phep nhap va bam Luu —
-- luon bi chan boi chinh loi bao "Sale chỉ được sửa giá bán (sell)." dol
-- gioi han danh cho no.
--
-- Nguyen nhan (xac nhan bang thuc nghiem truc tiep tren production, tach
-- rieng bang trigger test doc lap khong dung du lieu that): trong BEFORE
-- UPDATE trigger, cot GENERATED ALWAYS AS ... STORED (tien_thue, tong_tien
-- tren phat_sinh_chi_phi) luon hien la NULL trong "new" — Postgres chi tinh
-- lai gia tri cot generated SAU KHI cac BEFORE trigger chay xong, khong phai
-- luc dang chay. Trigger enforce_phat_sinh_chi_phi_update nhanh Sale dang so
-- sanh CA DONG (to_jsonb(new) vs to_jsonb(old), tru gia_ban_sell/updated_at)
-- de dam bao Sale khong sua gi khac — nhung vi new.tien_thue/new.tong_tien
-- luon NULL trong luc so sanh trong khi old.tien_thue/old.tong_tien la so
-- that, 2 ben LUON khac nhau -> raise exception moi lan, bat ke Sale co sua
-- gi khac hay khong.
--
-- Fix 1 (phat_sinh_chi_phi): loai 2 cot generated nay ra khoi phep so sanh —
-- chung khong the bi Sale "sua" duoc (Postgres tu cam sua cot generated) nen
-- loai an toan, khong mo them lo hong gi.
--
-- Fix 2 (don_thue_ngoai): phat hien them 1 lo rieng biet o day — trigger
-- enforce_don_thue_ngoai_update KHONG CO nhanh nao cho role Sale ca (chi Ke
-- toan/Hien truong/Dieu phoi), nen Sale sua gia_ban_sell tren dong thue
-- ngoai (form dung chung voi chi phi) luon roi vao nhanh "else" va bi chan
-- voi loi "Không có quyền sửa." — them nhanh Sale giong het phat_sinh_chi_phi
-- (chi duoc sua gia_ban_sell); bang nay khong co cot generated nen khong can
-- loai tru gi them.
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
    return new;
  elsif role = 'Sale' then
    if (to_jsonb(new) - 'gia_ban_sell' - 'updated_at' - 'tien_thue' - 'tong_tien')
       is distinct from (to_jsonb(old) - 'gia_ban_sell' - 'updated_at' - 'tien_thue' - 'tong_tien') then
      raise exception 'Sale chỉ được sửa giá bán (sell).';
    end if;
  elsif role in ('Hiện trường', 'Điều phối', 'Chứng từ') then
    if role <> 'Điều phối' and exists (
      select 1 from cong_viec_hoan_thanh c
      where c.don_hang_id = old.don_hang_id and c.nhan_vien_id = old.nguoi_nhap_id
        and c.trang_thai = 'Đã tiếp nhận'
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
    if new.tinh_trang_thanh_toan is distinct from old.tinh_trang_thanh_toan
       or new.so_tien_da_thanh_toan is distinct from old.so_tien_da_thanh_toan then
      raise exception 'Không có quyền cập nhật tình trạng thanh toán.';
    end if;
  else
    raise exception 'Không có quyền sửa chi phí.';
  end if;
  return new;
end;
$$;

create or replace function enforce_don_thue_ngoai_update()
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
      raise exception 'Dòng thuê ngoài này đã nằm trong 1 phiếu quyết toán tạm ứng đã duyệt/đã thanh toán — không thể sửa trực tiếp. Hủy phiếu quyết toán trước nếu cần sửa lại.';
    end if;
    return new;
  elsif role = 'Sale' then
    if (to_jsonb(new) - 'gia_ban_sell' - 'updated_at') is distinct from (to_jsonb(old) - 'gia_ban_sell' - 'updated_at') then
      raise exception 'Sale chỉ được sửa giá bán (sell).';
    end if;
  elsif role in ('Hiện trường', 'Điều phối') then
    if role = 'Hiện trường' and exists (
      select 1 from cong_viec_hoan_thanh c
      where c.don_hang_id = old.don_hang_id and c.nhan_vien_id = old.nguoi_nhap_id
        and c.trang_thai = 'Đã tiếp nhận'
    ) then
      raise exception 'Kế toán đã tiếp nhận phần việc này, không thể sửa — liên hệ Kế toán.';
    end if;
    if old.trang_thai = 'Đã duyệt' then
      raise exception 'Đơn thuê ngoài đã được duyệt, không thể sửa.';
    end if;
    if new.trang_thai in ('Đã duyệt', 'Từ chối') then
      raise exception 'Không có quyền duyệt/từ chối.';
    end if;
  else
    raise exception 'Không có quyền sửa.';
  end if;
  return new;
end;
$$;
