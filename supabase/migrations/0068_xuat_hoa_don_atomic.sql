-- ============================================================================
-- Bug tai chinh phat hien trong audit (BUG-04): BangKeView.handleXuatHoaDon
-- lam 4 buoc ghi rieng le tu client (insert hoa_don_xuat, update chi phi,
-- update phu thu, insert hoa_don_don_hang) — khong co transaction, khong
-- kiem tra loi 3 buoc sau. Neu 1 trong 3 buoc sau fail (mat mang, RLS...)
-- thi header hoa don da tao van con do, UI van bao thanh cong, de lai hoa don
-- "rong"/thieu du lieu ma khong ai biet.
--
-- Fix dung cach: gop toan bo vao 1 RPC — Postgres tu bao boc trong 1
-- transaction, 1 buoc loi thi TOAN BO rollback, khong con trang thai lung
-- chung nao ca.
-- ============================================================================

create or replace function xuat_hoa_don_tu_bang_ke(
  p_khach_hang_id uuid,
  p_so_hoa_don text,
  p_ngay_xuat date,
  p_tong_tien_truoc_thue numeric,
  p_vat_percent numeric,
  p_tien_vat numeric,
  p_tien_chi_ho numeric,
  p_chi_phi_ids uuid[],
  p_phu_thu_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hoa_don_id uuid;
  v_nv_id uuid;
begin
  if current_phong_ban() not in ('Chứng từ', 'Kế toán') then
    raise exception 'Chỉ Chứng từ/Kế toán được xuất hóa đơn';
  end if;
  if coalesce(array_length(p_chi_phi_ids, 1), 0) = 0 and coalesce(array_length(p_phu_thu_ids, 1), 0) = 0 then
    raise exception 'Chưa chọn dòng nào để xuất hóa đơn';
  end if;

  select id into v_nv_id from nhan_vien where auth_user_id = auth.uid();

  insert into hoa_don_xuat (
    khach_hang_id, so_hoa_don, ngay_xuat, tong_tien_truoc_thue,
    vat_percent, tien_vat, tien_chi_ho, nguoi_tao_id
  ) values (
    p_khach_hang_id, nullif(p_so_hoa_don, ''), p_ngay_xuat, p_tong_tien_truoc_thue,
    p_vat_percent, p_tien_vat, nullif(p_tien_chi_ho, 0), v_nv_id
  )
  returning id into v_hoa_don_id;

  if array_length(p_chi_phi_ids, 1) > 0 then
    update phat_sinh_chi_phi set hoa_don_id = v_hoa_don_id where id = any(p_chi_phi_ids);
  end if;

  if array_length(p_phu_thu_ids, 1) > 0 then
    update phu_thu set hoa_don_id = v_hoa_don_id where id = any(p_phu_thu_ids);
  end if;

  insert into hoa_don_don_hang (hoa_don_id, don_hang_id)
  select distinct v_hoa_don_id, dh.don_hang_id
  from (
    select don_hang_id from phat_sinh_chi_phi where id = any(p_chi_phi_ids)
    union
    select don_hang_id from phu_thu where id = any(p_phu_thu_ids)
  ) dh
  on conflict (hoa_don_id, don_hang_id) do nothing;

  return v_hoa_don_id;
end;
$$;

grant execute on function xuat_hoa_don_tu_bang_ke(uuid, text, date, numeric, numeric, numeric, numeric, uuid[], uuid[]) to authenticated;
