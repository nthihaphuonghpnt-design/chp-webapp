-- ============================================================================
-- 1) 0109 (10 tham so, ban app dang goi) va 0118 (9 tham so, co ghi so ke toan)
--    tao ra 2 ham trung ten: hoa don xuat tu Bang ke KHONG duoc ghi so kep.
--    Them lenh ghi so vao ban 10 tham so.
-- 2) but_toan_dong yeu cau so_tien > 0: hoa don chi co chi ho (doanh thu 0)
--    se loi khi ghi so -> chi tao cac dong co so tien > 0.
-- Chi doi ham, khong doi du lieu cu (hoa don da xuat truoc day chua ghi so).
-- ============================================================================

begin;

create or replace function ghi_so_hoa_don_xuat(p_hoa_don_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hd hoa_don_xuat%rowtype;
  v_dong jsonb;
begin
  select * into v_hd from hoa_don_xuat where id = p_hoa_don_id;
  if not found then
    raise exception 'Không tìm thấy hóa đơn xuất % để ghi sổ', p_hoa_don_id;
  end if;
  if coalesce(v_hd.tong_tien, 0) <= 0 then
    return;
  end if;

  select jsonb_agg(jsonb_build_object('ma_tk', ma_tk, 'loai_ghi_so', loai, 'so_tien', so_tien))
  into v_dong
  from (values
    ('131', 'Nợ', v_hd.tong_tien),
    ('511', 'Có', coalesce(v_hd.tong_tien_truoc_thue, 0)),
    ('3331', 'Có', coalesce(v_hd.tien_vat, 0)),
    ('1388', 'Có', coalesce(v_hd.tien_chi_ho, 0))
  ) as t(ma_tk, loai, so_tien)
  where so_tien > 0;

  perform tao_but_toan_can_bang(
    v_hd.ngay_xuat, 'Phát hành hóa đơn ' || coalesce(v_hd.so_hoa_don, p_hoa_don_id::text),
    'phat_sinh', 'hoa_don_xuat', p_hoa_don_id, v_dong
  );
end;
$$;

create or replace function xuat_hoa_don_tu_bang_ke(
  p_khach_hang_id uuid,
  p_so_hoa_don text,
  p_ngay_xuat date,
  p_tong_tien_truoc_thue numeric,
  p_vat_percent numeric,
  p_tien_vat numeric,
  p_tien_chi_ho numeric,
  p_chi_phi_ids uuid[],
  p_phu_thu_ids uuid[],
  p_thue_ngoai_ids uuid[] default array[]::uuid[]
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
  if coalesce(array_length(p_chi_phi_ids, 1), 0) = 0
     and coalesce(array_length(p_phu_thu_ids, 1), 0) = 0
     and coalesce(array_length(p_thue_ngoai_ids, 1), 0) = 0 then
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

  if array_length(p_thue_ngoai_ids, 1) > 0 then
    update don_thue_ngoai set hoa_don_id = v_hoa_don_id where id = any(p_thue_ngoai_ids);
  end if;

  insert into hoa_don_don_hang (hoa_don_id, don_hang_id)
  select distinct v_hoa_don_id, dh.don_hang_id
  from (
    select don_hang_id from phat_sinh_chi_phi where id = any(p_chi_phi_ids)
    union
    select don_hang_id from phu_thu where id = any(p_phu_thu_ids)
    union
    select don_hang_id from don_thue_ngoai where id = any(p_thue_ngoai_ids)
  ) dh
  on conflict (hoa_don_id, don_hang_id) do nothing;

  perform ghi_so_hoa_don_xuat(v_hoa_don_id);

  return v_hoa_don_id;
end;
$$;

commit;
