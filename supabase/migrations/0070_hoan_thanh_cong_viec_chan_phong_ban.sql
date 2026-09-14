-- ============================================================================
-- hoan_thanh_cong_viec (0064) khong kiem tra phong ban nguoi goi — bat ky
-- nhan vien phong ban nao (Sale, Ke toan, Dieu phoi...) deu goi duoc RPC nay
-- de tu tao 1 dong "Da hoan thanh" cho chinh minh tren BAT KY don hang nao,
-- di nguoc lai chinh y do thiet ke ghi trong comment dau file 0064 ("nguoi
-- thuc hien (Hien truong/Chung tu) tu bam"). UI moi (CongViecHoanThanhSection)
-- chi hien nut cho dung 2 vai tro nay, nhung "UI an nut" khong phai bao mat
-- that su (xem Phase 8 trong audit) — them chan ngay trong RPC.
-- ============================================================================

create or replace function hoan_thanh_cong_viec(p_don_hang_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nhan_vien_id uuid;
  v_trang_thai text;
  v_ho_ten text;
  v_phong_ban_ten text;
  v_so_don_hang text;
  v_pb_ke_toan_id uuid;
begin
  select nv.id, nv.ho_ten, pb.ten into v_nhan_vien_id, v_ho_ten, v_phong_ban_ten
  from nhan_vien nv join phong_ban pb on pb.id = nv.phong_ban_id
  where nv.auth_user_id = auth.uid();
  if v_nhan_vien_id is null then
    raise exception 'Không xác định được nhân viên đang đăng nhập';
  end if;

  if v_phong_ban_ten not in ('Hiện trường', 'Chứng từ') then
    raise exception 'Chỉ Hiện trường/Chứng từ được xác nhận hoàn thành công việc';
  end if;

  select trang_thai into v_trang_thai
  from cong_viec_hoan_thanh where don_hang_id = p_don_hang_id and nhan_vien_id = v_nhan_vien_id
  for update;

  if v_trang_thai = 'Đã tiếp nhận' then
    raise exception 'Kế toán đã tiếp nhận phần việc này, không thể tự đổi lại — liên hệ Kế toán để mở lại';
  end if;

  if v_trang_thai is null then
    insert into cong_viec_hoan_thanh (don_hang_id, nhan_vien_id, trang_thai, hoan_thanh_luc, hoan_thanh_boi)
    values (p_don_hang_id, v_nhan_vien_id, 'Đã hoàn thành', now(), v_nhan_vien_id);
  else
    update cong_viec_hoan_thanh
    set trang_thai = 'Đã hoàn thành', hoan_thanh_luc = now(), hoan_thanh_boi = v_nhan_vien_id
    where don_hang_id = p_don_hang_id and nhan_vien_id = v_nhan_vien_id;
  end if;

  select id into v_pb_ke_toan_id from phong_ban where ten = 'Kế toán';
  select so_don_hang into v_so_don_hang from don_hang where id = p_don_hang_id;
  if v_pb_ke_toan_id is not null then
    insert into lich_nhac_nho (phong_ban_id, don_hang_id, noi_dung, ngay_du_kien, nguoi_tao_id)
    values (
      v_pb_ke_toan_id, p_don_hang_id,
      v_so_don_hang || ' – ' || coalesce(v_phong_ban_ten, '') || ' ' || v_ho_ten
        || ' đã hoàn thành công việc, chờ Kế toán tiếp nhận.',
      current_date, v_nhan_vien_id
    );
  end if;
end;
$$;
