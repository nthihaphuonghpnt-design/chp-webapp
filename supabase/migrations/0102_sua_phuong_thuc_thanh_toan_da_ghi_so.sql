-- ============================================================================
-- GAP tim thay khi nghiem thu "Correction/Reversal Lifecycle" (rieng biet voi
-- vong doi tao/duyet): sau khi khoa cot thanh toan cua hoa_don_xuat (0095),
-- hoa_don_dau_vao (0099/0100) va phieu_quyet_toan_tam_ung (0073) de chong
-- overpay/double-submit, he thong KHONG con RPC nao cho phep sua LAI
-- phuong_thuc (Tien mat <-> Tai khoan cong ty) cua 1 khoan thu/chi da ghi nhan
-- dung so tien nhung SAI so — vi du: Ke toan ghi "da thu 12tr tien mat" nhung
-- thuc te la chuyen khoan cong ty. Truoc khi khoa cot, Ke toan sua truc tiep
-- duoc; sau khi khoa, tien bi "ket" sai so quy vinh vien vi khong co duong
-- sua nao khac ngoai vao thang DB (nguy hiem, khong audit).
--
-- 3 RPC duoi day mo lai dung 1 khe ho nay (chi sua CHIEU/SO nhan tien, KHONG
-- cho sua SO TIEN — sua so tien van phai qua dieu chinh/thay the hoa don hoac
-- huy roi thu lai) theo dung pattern da co: khoa FOR UPDATE, guard da co du
-- lieu de sua (>0 / dang hoat dong), guard khong cho "sua" thanh chinh gia
-- tri cu (tranh audit rac), bat buoc p_ly_do (khac voi duong sua truc tiep
-- cu KHONG bat buoc ly do — day la cai thieu da phat hien qua test that).
-- Trigger sync_so_quy_* san co (da xac nhan qua test that: UPDATE mot cot
-- phuong_thuc se tu dong xoa dong So quy cu + tao dong moi dung, tong tien
-- truoc = sau, khong double-count) se tu dong dong bo lai So quy dung — RPC
-- chi can UPDATE dung cot, khong can tu tay dong So quy.
-- ============================================================================

create or replace function sua_phuong_thuc_thu_hoa_don_xuat(
  p_hoa_don_id uuid,
  p_phuong_thuc_moi text,
  p_ly_do text
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
    raise exception 'Chỉ Chứng từ/Kế toán được sửa phương thức thu tiền';
  end if;
  if p_phuong_thuc_moi not in ('Tiền mặt', 'Tài khoản công ty') then
    raise exception 'Phương thức không hợp lệ';
  end if;
  if p_ly_do is null or btrim(p_ly_do) = '' then
    raise exception 'Phải nhập lý do sửa phương thức thu tiền';
  end if;

  select * into v_hd from hoa_don_xuat where id = p_hoa_don_id and trang_thai = 'Đã phát hành' for update;
  if not found then
    raise exception 'Không tìm thấy hóa đơn ở trạng thái Đã phát hành';
  end if;
  if coalesce(v_hd.so_tien_da_thu, 0) <= 0 then
    raise exception 'Hóa đơn chưa có khoản thu nào để sửa phương thức';
  end if;
  if v_hd.phuong_thuc_thu = p_phuong_thuc_moi then
    raise exception 'Phương thức mới trùng phương thức hiện tại, không có gì để sửa';
  end if;

  perform ghi_nhat_ky('hoa_don_xuat', p_hoa_don_id, 'sua_phuong_thuc_thu', p_ly_do,
    jsonb_build_object('phuong_thuc_thu', v_hd.phuong_thuc_thu),
    jsonb_build_object('phuong_thuc_thu', p_phuong_thuc_moi));

  update hoa_don_xuat set phuong_thuc_thu = p_phuong_thuc_moi where id = p_hoa_don_id;
end;
$$;

grant execute on function sua_phuong_thuc_thu_hoa_don_xuat(uuid, text, text) to authenticated;

create or replace function sua_phuong_thuc_thanh_toan_hoa_don_dau_vao(
  p_hoa_don_id uuid,
  p_phuong_thuc_moi text,
  p_ly_do text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hd hoa_don_dau_vao%rowtype;
begin
  if current_phong_ban() != 'Kế toán' then
    raise exception 'Chỉ Kế toán được sửa phương thức thanh toán';
  end if;
  if p_phuong_thuc_moi not in ('Tiền mặt', 'Tài khoản công ty') then
    raise exception 'Phương thức không hợp lệ';
  end if;
  if p_ly_do is null or btrim(p_ly_do) = '' then
    raise exception 'Phải nhập lý do sửa phương thức thanh toán';
  end if;

  select * into v_hd from hoa_don_dau_vao where id = p_hoa_don_id and dang_hoat_dong for update;
  if not found then
    raise exception 'Không tìm thấy hóa đơn đầu vào đang hoạt động';
  end if;
  if coalesce(v_hd.so_tien_da_thanh_toan, 0) <= 0 then
    raise exception 'Hóa đơn chưa có khoản thanh toán nào để sửa phương thức';
  end if;
  if v_hd.phuong_thuc_thanh_toan = p_phuong_thuc_moi then
    raise exception 'Phương thức mới trùng phương thức hiện tại, không có gì để sửa';
  end if;

  perform ghi_nhat_ky('hoa_don_dau_vao', p_hoa_don_id, 'sua_phuong_thuc_thanh_toan', p_ly_do,
    jsonb_build_object('phuong_thuc_thanh_toan', v_hd.phuong_thuc_thanh_toan),
    jsonb_build_object('phuong_thuc_thanh_toan', p_phuong_thuc_moi));

  update hoa_don_dau_vao set phuong_thuc_thanh_toan = p_phuong_thuc_moi where id = p_hoa_don_id;
end;
$$;

grant execute on function sua_phuong_thuc_thanh_toan_hoa_don_dau_vao(uuid, text, text) to authenticated;

create or replace function sua_phuong_thuc_phieu_quyet_toan_tam_ung(
  p_phieu_id uuid,
  p_phuong_thuc_moi text,
  p_ly_do text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pq phieu_quyet_toan_tam_ung%rowtype;
begin
  if current_phong_ban() not in ('Kế toán', 'Giám đốc') then
    raise exception 'Chỉ Kế toán/Giám đốc được sửa phương thức thanh toán phiếu quyết toán';
  end if;
  if p_phuong_thuc_moi not in ('Tiền mặt', 'Tài khoản công ty') then
    raise exception 'Phương thức không hợp lệ';
  end if;
  if p_ly_do is null or btrim(p_ly_do) = '' then
    raise exception 'Phải nhập lý do sửa phương thức thanh toán';
  end if;

  select * into v_pq from phieu_quyet_toan_tam_ung where id = p_phieu_id and trang_thai = 'Đã thanh toán' for update;
  if not found then
    raise exception 'Không tìm thấy phiếu quyết toán ở trạng thái Đã thanh toán';
  end if;
  if v_pq.phuong_thuc = p_phuong_thuc_moi then
    raise exception 'Phương thức mới trùng phương thức hiện tại, không có gì để sửa';
  end if;

  perform ghi_nhat_ky('phieu_quyet_toan_tam_ung', p_phieu_id, 'sua_phuong_thuc_thanh_toan', p_ly_do,
    jsonb_build_object('phuong_thuc', v_pq.phuong_thuc),
    jsonb_build_object('phuong_thuc', p_phuong_thuc_moi));

  update phieu_quyet_toan_tam_ung set phuong_thuc = p_phuong_thuc_moi where id = p_phieu_id;
end;
$$;

grant execute on function sua_phuong_thuc_phieu_quyet_toan_tam_ung(uuid, text, text) to authenticated;
