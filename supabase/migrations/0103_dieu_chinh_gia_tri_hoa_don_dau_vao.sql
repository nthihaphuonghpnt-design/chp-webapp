-- ============================================================================
-- Quy trinh moi: NCC dieu chinh gia tri hoa don dau vao SAU KHI CHP da thanh
-- toan (vi du: hoa don goc 10tr, CHP da tra du 10tr, sau do hoa don/gia tri
-- hop le giam con 8tr). Yeu cau nghiep vu ro rang tu Management:
--  - AP: tong_tien_hang/tien_thue_gtgt (=> tong_tien_thanh_toan, generated)
--    phai sua ve dung gia tri moi.
--  - So quy: KHONG duoc tao them dong Chi moi — 10tr thuc te DA CHI ROI (su
--    kien tien that, dung dan tai thoi diem no xay ra), khong phai chi lai.
--    Phan du 2tr phai duoc theo doi rieng nhu "credit phai thu lai tu NCC"
--    (dung lai co che credit da xay o migration 0099), NHUNG dong
--    credit_giao_dich nay KHONG duoc phep tu dong tao them 1 dong So quy Chi
--    nua — neu khong se DOUBLE-COUNT (10tr goc + 2tr credit = 12tr trong khi
--    thuc te chi tra 10tr). Day la diem khac biet mau chot so voi credit
--    "tra thua" thong thuong (thu_tien_hoa_don_xuat/thanh_toan_hoa_don_dau_vao
--    khi p_so_tien > con lai) — o do phan du LA TIEN THAT MOI phat sinh nen
--    dung duoc tao dong So quy rieng; o day phan du CHI LA PHAN LOAI LAI tien
--    da ghi nhan tu truoc, khong phai dong tien moi.
--  - VAT/ky ke khai: neu ky_ke_khai cua hoa don da duoc danh dau "Da ke khai"
--    trong bang ky_ke_khai_vat (0098), RPC KHONG tu dong lam gi them (khong
--    tu y ghi 01/KHBS thay ke toan) — chi tra ve co flag ky_da_ke_khai=true
--    de UI nhac ke toan tu lap 01/KHBS bo sung dung quy trinh da xay.
--  - Audit: bat buoc ly do, ghi ca gia tri cu/moi.
-- ============================================================================

alter table credit_giao_dich add column tao_dong_so_quy boolean not null default true;
comment on column credit_giao_dich.tao_dong_so_quy is
  'false khi dong credit nay chi la PHAN LOAI LAI tien da ghi nhan tu truoc (vi du dieu chinh giam gia tri hoa don da thanh toan) — khong phai tien that moi phat sinh nen KHONG duoc tao them dong So quy, tranh double-count.';

create or replace function sync_so_quy_credit_giao_dich()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_chieu text;
begin
  if TG_OP = 'DELETE' then
    delete from so_quy where nguon_bang = 'credit_giao_dich' and nguon_id = old.id;
    return old;
  end if;

  if not new.tao_dong_so_quy then
    return new;
  end if;

  if new.doi_tuong = 'Khách hàng' then
    v_chieu := case new.loai when 'Phát sinh' then 'Thu' when 'Cấn trừ' then 'Chi' else 'Chi' end;
  else
    v_chieu := case new.loai when 'Phát sinh' then 'Chi' when 'Cấn trừ' then 'Thu' else 'Thu' end;
  end if;

  insert into so_quy (loai_so, loai_giao_dich, so_tien, ngay, noi_dung, nguon_bang, nguon_id)
  values (
    new.phuong_thuc, v_chieu, new.so_tien, current_date,
    new.loai || ' credit — ' || coalesce(new.ly_do, ''),
    'credit_giao_dich', new.id
  );
  return new;
end;
$$;

-- ============================================================================
-- RPC dieu chinh gia tri hoa don dau vao sau khi da thanh toan.
-- ============================================================================
create or replace function dieu_chinh_gia_tri_hoa_don_dau_vao(
  p_hoa_don_id uuid,
  p_tong_tien_hang_moi numeric,
  p_tien_thue_gtgt_moi numeric,
  p_ly_do text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hd hoa_don_dau_vao%rowtype;
  v_tong_moi numeric;
  v_thua numeric := 0;
  v_trang_thai text;
  v_credit so_du_credit%rowtype;
  v_cgd_id uuid;
  v_ky_da_khai boolean;
  v_nv_id uuid;
begin
  if current_phong_ban() != 'Kế toán' then
    raise exception 'Chỉ Kế toán được điều chỉnh giá trị hóa đơn đầu vào';
  end if;
  if p_tong_tien_hang_moi is null or p_tong_tien_hang_moi < 0 or p_tien_thue_gtgt_moi is null or p_tien_thue_gtgt_moi < 0 then
    raise exception 'Giá trị mới không hợp lệ';
  end if;
  if p_ly_do is null or btrim(p_ly_do) = '' then
    raise exception 'Phải nhập lý do điều chỉnh giá trị hóa đơn';
  end if;

  select * into v_hd from hoa_don_dau_vao where id = p_hoa_don_id and dang_hoat_dong for update;
  if not found then
    raise exception 'Không tìm thấy hóa đơn đầu vào đang hoạt động';
  end if;

  v_tong_moi := p_tong_tien_hang_moi + p_tien_thue_gtgt_moi;
  if p_tong_tien_hang_moi = v_hd.tong_tien_hang and p_tien_thue_gtgt_moi = v_hd.tien_thue_gtgt then
    raise exception 'Giá trị mới trùng giá trị hiện tại, không có gì để điều chỉnh';
  end if;

  if coalesce(v_hd.so_tien_da_thanh_toan, 0) > v_tong_moi then
    v_thua := v_hd.so_tien_da_thanh_toan - v_tong_moi;
    v_trang_thai := 'Đã đủ';
  elsif coalesce(v_hd.so_tien_da_thanh_toan, 0) = v_tong_moi then
    v_trang_thai := 'Đã đủ';
  elsif coalesce(v_hd.so_tien_da_thanh_toan, 0) = 0 then
    v_trang_thai := 'Chưa thanh toán';
  else
    v_trang_thai := 'Một phần';
  end if;

  perform ghi_nhat_ky('hoa_don_dau_vao', p_hoa_don_id, 'dieu_chinh_gia_tri', p_ly_do,
    jsonb_build_object('tong_tien_hang', v_hd.tong_tien_hang, 'tien_thue_gtgt', v_hd.tien_thue_gtgt, 'tong_tien_thanh_toan', v_hd.tong_tien_thanh_toan, 'tinh_trang_thanh_toan', v_hd.tinh_trang_thanh_toan),
    jsonb_build_object('tong_tien_hang', p_tong_tien_hang_moi, 'tien_thue_gtgt', p_tien_thue_gtgt_moi, 'tong_tien_thanh_toan', v_tong_moi, 'tinh_trang_thanh_toan', v_trang_thai));

  -- 1 UPDATE duy nhat — trigger so_quy cua chinh hoa don nay se tu dong bo lai
  -- theo dung so_tien_da_thanh_toan HIEN CO (khong doi trong RPC nay), nen
  -- Chi 10tr goc giu nguyen dung 1 lan, khong bi dung vao.
  update hoa_don_dau_vao
  set tong_tien_hang = p_tong_tien_hang_moi, tien_thue_gtgt = p_tien_thue_gtgt_moi, tinh_trang_thanh_toan = v_trang_thai
  where id = p_hoa_don_id;

  if v_thua > 0 then
    v_credit := khoa_so_du_credit(null, v_hd.nha_cung_cap_id);
    update so_du_credit set so_du = so_du + v_thua, updated_at = now() where id = v_credit.id;
    select id into v_nv_id from nhan_vien where auth_user_id = auth.uid();
    insert into credit_giao_dich (doi_tuong, nha_cung_cap_id, loai, so_tien, so_du_sau, hoa_don_dau_vao_id, phuong_thuc, ly_do, nguoi_thuc_hien_id, tao_dong_so_quy)
    values ('Nhà cung cấp', v_hd.nha_cung_cap_id, 'Phát sinh', v_thua, v_credit.so_du + v_thua, p_hoa_don_id,
      coalesce(v_hd.phuong_thuc_thanh_toan, 'Tài khoản công ty'),
      'Điều chỉnh giảm giá trị hóa đơn (đã trả trước đó, không phải tiền mới) — ' || p_ly_do,
      v_nv_id, false)
    returning id into v_cgd_id;
  end if;

  select exists(
    select 1 from ky_ke_khai_vat k
    where k.ky = v_hd.ky_ke_khai and k.granularity = 'thang' and k.trang_thai in ('Đã kê khai', 'Đã nộp bổ sung')
  ) into v_ky_da_khai;

  return jsonb_build_object(
    'thua_thanh_credit_ncc', v_thua,
    'credit_giao_dich_id', v_cgd_id,
    'ky_da_ke_khai', v_ky_da_khai,
    'ky_ke_khai', v_hd.ky_ke_khai,
    'tinh_trang_thanh_toan', v_trang_thai
  );
end;
$$;

grant execute on function dieu_chinh_gia_tri_hoa_don_dau_vao(uuid, numeric, numeric, text) to authenticated;
