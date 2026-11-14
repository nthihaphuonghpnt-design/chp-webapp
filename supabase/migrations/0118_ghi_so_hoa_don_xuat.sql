-- ============================================================================
-- Phase 2 (nhom da co RPC san) cua ke hoach so sach ke toan kep: noi but toan
-- vao chuoi hoa don xuat. Lam truoc tien vi day la tien le ro rang nhat da co
-- (0092-0095, 0068, 0099).
--
-- 2 su kien duoc ghi so o day:
--  1) Phat hanh hoa don (xuat_hoa_don_tu_bang_ke) — ghi nhan doanh thu NGAY CA
--     KHI CHUA THU TIEN (ke toan don tich luy/accrual):
--       No 131 (phai thu KH)           = tong_tien (gom ca phan chi ho)
--       Co  511 (doanh thu)            = tong_tien_truoc_thue
--       Co  3331 (thue GTGT dau ra)    = tien_vat
--       Co  1388 (phai thu khac/chi ho)= tien_chi_ho (neu > 0 — day la GIAI
--         PHONG khoan da ghi No 1388 tu luc CHP chi ho, khong phai doanh thu)
--  2) Thu tien (thu_tien_hoa_don_xuat):
--       No  111/112 (theo phuong_thuc) = tong so tien thu duoc lan nay
--       Co  131                        = phan ap dung vao hoa don
--       Co  3388 (phai tra khac/credit)= phan du (thu vuot) neu co
--
-- Khong doi chu ky RPC cu (van nhan dung tung do tham so, tra ve dung kieu du
-- lieu cu) — chi them 1 dong "perform ghi_so_...()" o cuoi than ham, truoc
-- "return". Toan bo phan logic nghiep vu goc GIU NGUYEN 100% so voi 0068/0099.
-- ============================================================================

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

  v_dong := jsonb_build_array(
    jsonb_build_object('ma_tk', '131', 'loai_ghi_so', 'Nợ', 'so_tien', v_hd.tong_tien),
    jsonb_build_object('ma_tk', '511', 'loai_ghi_so', 'Có', 'so_tien', v_hd.tong_tien_truoc_thue)
  );
  if coalesce(v_hd.tien_vat, 0) > 0 then
    v_dong := v_dong || jsonb_build_array(jsonb_build_object('ma_tk', '3331', 'loai_ghi_so', 'Có', 'so_tien', v_hd.tien_vat));
  end if;
  if coalesce(v_hd.tien_chi_ho, 0) > 0 then
    v_dong := v_dong || jsonb_build_array(jsonb_build_object('ma_tk', '1388', 'loai_ghi_so', 'Có', 'so_tien', v_hd.tien_chi_ho));
  end if;

  perform tao_but_toan_can_bang(
    v_hd.ngay_xuat, 'Phát hành hóa đơn ' || coalesce(v_hd.so_hoa_don, p_hoa_don_id::text),
    'phat_sinh', 'hoa_don_xuat', p_hoa_don_id, v_dong
  );
end;
$$;
-- Khong grant execute cho authenticated — chi goi tu ben trong
-- xuat_hoa_don_tu_bang_ke (security definer), khong phai ham public.

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

  perform ghi_so_hoa_don_xuat(v_hoa_don_id);

  return v_hoa_don_id;
end;
$$;

grant execute on function xuat_hoa_don_tu_bang_ke(uuid, text, date, numeric, numeric, numeric, numeric, uuid[], uuid[]) to authenticated;

-- ----------------------------------------------------------------------------
create or replace function ghi_so_thu_tien_hoa_don_xuat(p_hoa_don_id uuid, p_ap_dung numeric, p_thua numeric, p_phuong_thuc text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tk_tien text;
  v_dong jsonb;
  v_su_kien_id uuid := gen_random_uuid();
begin
  v_tk_tien := case when p_phuong_thuc = 'Tài khoản công ty' then '112' else '111' end;

  v_dong := jsonb_build_array(
    jsonb_build_object('ma_tk', v_tk_tien, 'loai_ghi_so', 'Nợ', 'so_tien', p_ap_dung + p_thua)
  );
  if p_ap_dung > 0 then
    v_dong := v_dong || jsonb_build_array(jsonb_build_object('ma_tk', '131', 'loai_ghi_so', 'Có', 'so_tien', p_ap_dung));
  end if;
  if p_thua > 0 then
    v_dong := v_dong || jsonb_build_array(jsonb_build_object('ma_tk', '3388', 'loai_ghi_so', 'Có', 'so_tien', p_thua));
  end if;

  -- 1 hoa don co the duoc thu nhieu dot (nhieu lan goi thu_tien_hoa_don_xuat
  -- cho CUNG 1 p_hoa_don_id) — khac voi but toan "phat_sinh" chi xay ra dung
  -- 1 lan/hoa don nen dung thang p_hoa_don_id lam nguon_id duoc. O day phai
  -- tu sinh 1 uuid rieng cho MOI LAN thu de khong vi pham unique(nguon_bang,
  -- nguon_id, loai_but_toan) — dien_giai van ghi ro so hoa don de truy vet
  -- bang mat, khong dua vao nguon_id nua.
  perform tao_but_toan_can_bang(
    current_date,
    'Thu tiền hóa đơn xuất ' || coalesce((select so_hoa_don from hoa_don_xuat where id = p_hoa_don_id), p_hoa_don_id::text),
    'thu_tien', 'hoa_don_xuat_thu_tien', v_su_kien_id, v_dong
  );
end;
$$;
-- Khong grant execute cho authenticated — chi goi tu ben trong
-- thu_tien_hoa_don_xuat (security definer).

create or replace function thu_tien_hoa_don_xuat(
  p_hoa_don_id uuid,
  p_so_tien numeric,
  p_phuong_thuc text,
  p_ghi_chu text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hd hoa_don_xuat%rowtype;
  v_con_lai numeric;
  v_ap_dung numeric;
  v_thua numeric;
  v_trang_thai text;
  v_credit so_du_credit%rowtype;
  v_cgd_id uuid;
begin
  if current_phong_ban() not in ('Chứng từ', 'Kế toán') then
    raise exception 'Chỉ Chứng từ/Kế toán được ghi nhận thu tiền';
  end if;
  if p_so_tien is null or p_so_tien <= 0 then
    raise exception 'Số tiền thu phải lớn hơn 0';
  end if;

  select * into v_hd from hoa_don_xuat where id = p_hoa_don_id and trang_thai = 'Đã phát hành' for update;
  if not found then
    raise exception 'Không tìm thấy hóa đơn ở trạng thái Đã phát hành';
  end if;
  if v_hd.trang_thai_thanh_toan = 'Đã thu đủ' then
    raise exception 'Hóa đơn % đã "Đã thu đủ" từ trước — có thể do double-submit, không áp dụng thêm khoản thu này', v_hd.so_hoa_don;
  end if;

  v_con_lai := v_hd.tong_tien - coalesce(v_hd.so_tien_da_thu, 0);
  v_ap_dung := least(p_so_tien, v_con_lai);
  v_thua := p_so_tien - v_ap_dung;
  v_trang_thai := case when coalesce(v_hd.so_tien_da_thu,0) + v_ap_dung >= v_hd.tong_tien then 'Đã thu đủ' else 'Thu một phần' end;

  update hoa_don_xuat set
    so_tien_da_thu = coalesce(so_tien_da_thu,0) + v_ap_dung,
    trang_thai_thanh_toan = v_trang_thai,
    phuong_thuc_thu = p_phuong_thuc
  where id = p_hoa_don_id and trang_thai_thanh_toan != 'Đã thu đủ';
  if not found then
    raise exception 'Không thể cập nhật hóa đơn (có thể đã bị thay đổi đồng thời)';
  end if;

  perform ghi_nhat_ky('hoa_don_xuat', p_hoa_don_id, 'thu_tien_hoa_don_xuat', p_ghi_chu,
    jsonb_build_object('so_tien_da_thu', v_hd.so_tien_da_thu),
    jsonb_build_object('so_tien_thu_lan_nay', p_so_tien, 'ap_dung_hoa_don', v_ap_dung, 'thua', v_thua));

  if v_thua > 0 then
    v_credit := khoa_so_du_credit(v_hd.khach_hang_id, null);
    update so_du_credit set so_du = so_du + v_thua, updated_at = now() where id = v_credit.id;
    insert into credit_giao_dich (doi_tuong, khach_hang_id, loai, so_tien, so_du_sau, hoa_don_xuat_id, phuong_thuc, ly_do, nguoi_thuc_hien_id)
    values ('Khách hàng', v_hd.khach_hang_id, 'Phát sinh', v_thua, v_credit.so_du + v_thua, p_hoa_don_id, p_phuong_thuc,
      coalesce(p_ghi_chu, 'Thu vượt hóa đơn ' || v_hd.so_hoa_don), (select id from nhan_vien where auth_user_id = auth.uid()))
    returning id into v_cgd_id;
  end if;

  perform ghi_so_thu_tien_hoa_don_xuat(p_hoa_don_id, v_ap_dung, v_thua, p_phuong_thuc);

  return jsonb_build_object('ap_dung_hoa_don', v_ap_dung, 'thua_thanh_credit', v_thua, 'trang_thai_thanh_toan', v_trang_thai, 'credit_giao_dich_id', v_cgd_id);
end;
$$;

grant execute on function thu_tien_hoa_don_xuat(uuid, numeric, text, text) to authenticated;
