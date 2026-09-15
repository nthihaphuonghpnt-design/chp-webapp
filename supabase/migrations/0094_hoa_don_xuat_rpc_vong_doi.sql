-- ============================================================================
-- RPC vong doi hoa don xuat: dieu_chinh / thay_the / huy / sua (chi khi con
-- moi tao, chua ai dung). Theo dung house style da dung cho
-- phieu_quyet_toan_tam_ung (0067/0073/0075): check current_phong_ban() dau
-- ham -> "select ... for update" khoa + kiem trang_thai hien tai -> mutate ->
-- "update ... where ... and trang_thai = '<cu>'" (chan race lan 2) -> ghi
-- nhat_ky_thao_tac qua ghi_nhat_ky().
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Dieu chinh: tao 1 hoa don MOI mang so tien CHENH LECH (delta, co the am) so
-- voi hoa don goc, KHONG dong toi lien ket phat_sinh_chi_phi/phu_thu cua hoa
-- don goc (hoa don goc van giu nguyen cac dong chi phi da xuat). Dung khi hoa
-- don goc dung ve ban chat nhung sai so tien (vd sot 1 khoan phu thu).
-- ----------------------------------------------------------------------------
create or replace function dieu_chinh_hoa_don_xuat(
  p_hoa_don_goc_id uuid,
  p_so_hoa_don text,
  p_ngay_xuat date,
  p_tong_tien_truoc_thue_delta numeric,
  p_vat_percent numeric,
  p_tien_vat_delta numeric,
  p_tien_chi_ho_delta numeric,
  p_ky_ke_khai text,
  p_ly_do text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_goc hoa_don_xuat%rowtype;
  v_moi_id uuid;
  v_nv_id uuid;
begin
  if current_phong_ban() not in ('Chứng từ', 'Kế toán') then
    raise exception 'Chỉ Chứng từ/Kế toán được điều chỉnh hóa đơn';
  end if;
  if p_ly_do is null or btrim(p_ly_do) = '' then
    raise exception 'Phải nhập lý do điều chỉnh';
  end if;

  select * into v_goc from hoa_don_xuat where id = p_hoa_don_goc_id and trang_thai = 'Đã phát hành' for update;
  if not found then
    raise exception 'Không tìm thấy hóa đơn ở trạng thái Đã phát hành để điều chỉnh';
  end if;

  select id into v_nv_id from nhan_vien where auth_user_id = auth.uid();

  insert into hoa_don_xuat (
    khach_hang_id, so_hoa_don, ngay_xuat, tong_tien_truoc_thue, vat_percent,
    tien_vat, tien_chi_ho, ky_ke_khai, loai_hoa_don, hoa_don_goc_id, nguoi_tao_id
  ) values (
    v_goc.khach_hang_id, p_so_hoa_don, p_ngay_xuat, p_tong_tien_truoc_thue_delta, p_vat_percent,
    p_tien_vat_delta, p_tien_chi_ho_delta, coalesce(p_ky_ke_khai, to_char(p_ngay_xuat, 'YYYY-MM')),
    'Điều chỉnh', p_hoa_don_goc_id, v_nv_id
  ) returning id into v_moi_id;

  update hoa_don_xuat set trang_thai = 'Đã điều chỉnh', hoa_don_thay_the_id = v_moi_id
  where id = p_hoa_don_goc_id and trang_thai = 'Đã phát hành';
  if not found then
    raise exception 'Không thể cập nhật trạng thái hóa đơn gốc (có thể đã bị thay đổi đồng thời)';
  end if;

  perform ghi_nhat_ky('hoa_don_xuat', p_hoa_don_goc_id, 'dieu_chinh_hoa_don_xuat', p_ly_do, to_jsonb(v_goc), jsonb_build_object('hoa_don_dieu_chinh_id', v_moi_id));
  perform ghi_nhat_ky('hoa_don_xuat', v_moi_id, 'tao_hoa_don_dieu_chinh', p_ly_do, null, to_jsonb((select h from hoa_don_xuat h where h.id = v_moi_id)));

  return v_moi_id;
end;
$$;

grant execute on function dieu_chinh_hoa_don_xuat(uuid, text, date, numeric, numeric, numeric, numeric, text, text) to authenticated;

-- ----------------------------------------------------------------------------
-- Thay the: tao 1 hoa don MOI mang TONG DAY DU (khong phai delta), chuyen het
-- lien ket phat_sinh_chi_phi/phu_thu/hoa_don_don_hang tu hoa don goc sang hoa
-- don moi (hoa don goc coi nhu chua tung phat hanh hop le). Chan neu hoa don
-- goc da co tien thu ve — phai xu ly thanh toan truoc.
-- ----------------------------------------------------------------------------
create or replace function thay_the_hoa_don_xuat(
  p_hoa_don_goc_id uuid,
  p_khach_hang_id uuid,
  p_so_hoa_don text,
  p_ngay_xuat date,
  p_tong_tien_truoc_thue numeric,
  p_vat_percent numeric,
  p_tien_vat numeric,
  p_tien_chi_ho numeric,
  p_ky_ke_khai text,
  p_ly_do text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_goc hoa_don_xuat%rowtype;
  v_moi_id uuid;
  v_nv_id uuid;
begin
  if current_phong_ban() not in ('Chứng từ', 'Kế toán') then
    raise exception 'Chỉ Chứng từ/Kế toán được thay thế hóa đơn';
  end if;
  if p_ly_do is null or btrim(p_ly_do) = '' then
    raise exception 'Phải nhập lý do thay thế';
  end if;

  select * into v_goc from hoa_don_xuat where id = p_hoa_don_goc_id and trang_thai = 'Đã phát hành' for update;
  if not found then
    raise exception 'Không tìm thấy hóa đơn ở trạng thái Đã phát hành để thay thế';
  end if;
  if coalesce(v_goc.so_tien_da_thu, 0) > 0 then
    raise exception 'Hóa đơn đã có tiền thu về (%), phải xử lý thanh toán trước khi thay thế', v_goc.so_tien_da_thu;
  end if;

  select id into v_nv_id from nhan_vien where auth_user_id = auth.uid();

  insert into hoa_don_xuat (
    khach_hang_id, so_hoa_don, ngay_xuat, tong_tien_truoc_thue, vat_percent,
    tien_vat, tien_chi_ho, ky_ke_khai, loai_hoa_don, hoa_don_goc_id, nguoi_tao_id
  ) values (
    coalesce(p_khach_hang_id, v_goc.khach_hang_id), p_so_hoa_don, p_ngay_xuat, p_tong_tien_truoc_thue, p_vat_percent,
    p_tien_vat, p_tien_chi_ho, coalesce(p_ky_ke_khai, to_char(p_ngay_xuat, 'YYYY-MM')),
    'Thay thế', p_hoa_don_goc_id, v_nv_id
  ) returning id into v_moi_id;

  update phat_sinh_chi_phi set hoa_don_id = v_moi_id where hoa_don_id = p_hoa_don_goc_id;
  update phu_thu set hoa_don_id = v_moi_id where hoa_don_id = p_hoa_don_goc_id;

  insert into hoa_don_don_hang (hoa_don_id, don_hang_id)
  select v_moi_id, don_hang_id from hoa_don_don_hang where hoa_don_id = p_hoa_don_goc_id
  on conflict do nothing;

  update hoa_don_xuat set trang_thai = 'Đã thay thế', hoa_don_thay_the_id = v_moi_id
  where id = p_hoa_don_goc_id and trang_thai = 'Đã phát hành';
  if not found then
    raise exception 'Không thể cập nhật trạng thái hóa đơn gốc (có thể đã bị thay đổi đồng thời)';
  end if;

  perform ghi_nhat_ky('hoa_don_xuat', p_hoa_don_goc_id, 'thay_the_hoa_don_xuat', p_ly_do, to_jsonb(v_goc), jsonb_build_object('hoa_don_thay_the_id', v_moi_id));
  perform ghi_nhat_ky('hoa_don_xuat', v_moi_id, 'tao_hoa_don_thay_the', p_ly_do, null, to_jsonb((select h from hoa_don_xuat h where h.id = v_moi_id)));

  return v_moi_id;
end;
$$;

grant execute on function thay_the_hoa_don_xuat(uuid, uuid, text, date, numeric, numeric, numeric, numeric, text, text) to authenticated;

-- ----------------------------------------------------------------------------
-- Huy: khong tao dong moi, chi chuyen trang_thai -> 'Đã hủy' va go lien ket
-- phat_sinh_chi_phi/phu_thu (dat null) de cac dong chi phi co the duoc xuat
-- sang hoa don khac. Chan neu da co tien thu ve.
-- ----------------------------------------------------------------------------
create or replace function huy_hoa_don_xuat(p_hoa_don_id uuid, p_ly_do text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hd hoa_don_xuat%rowtype;
begin
  if current_phong_ban() not in ('Kế toán', 'Giám đốc') then
    raise exception 'Chỉ Kế toán/Giám đốc được hủy hóa đơn';
  end if;
  if p_ly_do is null or btrim(p_ly_do) = '' then
    raise exception 'Phải nhập lý do hủy';
  end if;

  select * into v_hd from hoa_don_xuat where id = p_hoa_don_id and trang_thai = 'Đã phát hành' for update;
  if not found then
    raise exception 'Không tìm thấy hóa đơn ở trạng thái Đã phát hành để hủy';
  end if;
  if coalesce(v_hd.so_tien_da_thu, 0) > 0 then
    raise exception 'Hóa đơn đã có tiền thu về (%), phải xử lý thanh toán trước khi hủy', v_hd.so_tien_da_thu;
  end if;

  update phat_sinh_chi_phi set hoa_don_id = null where hoa_don_id = p_hoa_don_id;
  update phu_thu set hoa_don_id = null where hoa_don_id = p_hoa_don_id;

  update hoa_don_xuat set trang_thai = 'Đã hủy' where id = p_hoa_don_id and trang_thai = 'Đã phát hành';
  if not found then
    raise exception 'Không thể cập nhật trạng thái hóa đơn (có thể đã bị thay đổi đồng thời)';
  end if;

  perform ghi_nhat_ky('hoa_don_xuat', p_hoa_don_id, 'huy_hoa_don_xuat', p_ly_do, to_jsonb(v_hd), jsonb_build_object('trang_thai', 'Đã hủy'));
end;
$$;

grant execute on function huy_hoa_don_xuat(uuid, text) to authenticated;

-- ----------------------------------------------------------------------------
-- Sua hoa don MOI TAO: chi cho phep sua truc tiep cac truong tai chinh cot loi
-- (khach hang/so hoa don/ngay xuat/tien) khi hoa don CHUA bi dieu chinh/thay
-- the/huy va CHUA co tien thu ve — dung de sua loi danh may truoc khi co gi
-- phu thuoc vao no. Neu da qua xu ly, phai dung Dieu chinh/Thay the/Huy.
-- ----------------------------------------------------------------------------
create or replace function sua_hoa_don_xuat_moi_tao(
  p_hoa_don_id uuid,
  p_khach_hang_id uuid,
  p_so_hoa_don text,
  p_ngay_xuat date,
  p_tong_tien_truoc_thue numeric,
  p_vat_percent numeric,
  p_tien_vat numeric,
  p_tien_chi_ho numeric,
  p_ky_ke_khai text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hd hoa_don_xuat%rowtype;
begin
  if current_phong_ban() not in ('Chứng từ', 'Kế toán') then
    raise exception 'Chỉ Chứng từ/Kế toán được sửa hóa đơn';
  end if;

  select * into v_hd from hoa_don_xuat
  where id = p_hoa_don_id and trang_thai = 'Đã phát hành' and loai_hoa_don = 'Gốc' and coalesce(so_tien_da_thu, 0) = 0
  for update;
  if not found then
    raise exception 'Chỉ sửa trực tiếp được hóa đơn gốc, chưa có tiền thu, chưa điều chỉnh/thay thế/hủy — dùng Điều chỉnh/Thay thế/Hủy nếu hóa đơn đã qua xử lý';
  end if;

  update hoa_don_xuat set
    khach_hang_id = p_khach_hang_id,
    so_hoa_don = p_so_hoa_don,
    ngay_xuat = p_ngay_xuat,
    tong_tien_truoc_thue = p_tong_tien_truoc_thue,
    vat_percent = p_vat_percent,
    tien_vat = p_tien_vat,
    tien_chi_ho = p_tien_chi_ho,
    ky_ke_khai = coalesce(p_ky_ke_khai, to_char(p_ngay_xuat, 'YYYY-MM'))
  where id = p_hoa_don_id and trang_thai = 'Đã phát hành' and loai_hoa_don = 'Gốc' and coalesce(so_tien_da_thu, 0) = 0;
  if not found then
    raise exception 'Không thể cập nhật hóa đơn (có thể đã bị thay đổi đồng thời)';
  end if;

  perform ghi_nhat_ky('hoa_don_xuat', p_hoa_don_id, 'sua_hoa_don_moi_tao', null, to_jsonb(v_hd), to_jsonb((select h from hoa_don_xuat h where h.id = p_hoa_don_id)));
end;
$$;

grant execute on function sua_hoa_don_xuat_moi_tao(uuid, uuid, text, date, numeric, numeric, numeric, numeric, text) to authenticated;
