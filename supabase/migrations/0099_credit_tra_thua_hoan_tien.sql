-- ============================================================================
-- AR/AP — tien tra thua khong duoc "an" vao trang_thai_thanh_toan nua.
--
-- Nguyen tac (theo dung yeu cau nghiem thu): TIEN THUC TE PHAT SINH != SO TIEN
-- DUOC PHEP CAN TRU VAO HOA DON. Neu tien nhan/tra > so con phai thu/tra, chi
-- ap dung dung phan con thieu vao hoa don, PHAN DU duoc ghi nhan rieng vao 1
-- "vi credit" theo tung khach hang / nha cung cap — co the dung credit do de
-- can tru hoa don khac sau nay, hoac hoan tien that.
--
-- Mo hinh: 2 bang.
--  - so_du_credit: 1 dong / khach hang hoac nha cung cap, la "dong tien hien
--    tai" — luon SELECT ... FOR UPDATE truoc khi doc/sua de khoa dung nguyen
--    tac dong thoi (giong het cach hoa_don_xuat.so_tien_da_thu duoc khoa qua
--    cac RPC vong doi da co).
--  - credit_giao_dich: so cai (ledger) BAT BIEN — moi hanh dong (Phat sinh /
--    Can tru / Hoan tien) la 1 SU KIEN TIEN THAT rieng biet, KHONG BAO GIO
--    sua/xoa dong cu — dung de audit va de tinh dung dong tien vao So quy.
--
-- Vi sao credit_giao_dich moi dong phai co 1 dong So quy RIENG (khong dung
-- lai co che "xoa-roi-tao-lai theo so du hien tai" nhu cac bang khac):
--  - Phat sinh (tien that ve/di) va Hoan tien (tien that di/ve lan 2) la 2 su
--    kien tien MAT KHAC NHAU — neu chi dong bo theo "so du hien tai" cua vi
--    credit, luc hoan het credit ve 0 se lam BIEN MAT dong "da nhan tien" gov
--    that su da xay ra truoc do, thay vi cong THEM 1 dong "da tra lai" — sai
--    lech dung bang chinh so tien hoan (da kiem chung bang tay truoc khi viet
--    migration nay, xem giai thich chi tiet trong bao cao nghiem thu).
--  - Can tru KHONG phai tien moi — chi la chuyen tu "vi credit" (con so_quy
--    voi chieu Thu/Chi doi voi tung ben) sang hoa don moi (hoa don tu dong co
--    dong So quy rieng qua trigger sync_so_quy_hoa_don/..._dau_vao co san) —
--    dong Can tru phai co chieu NGUOC LAI de bu tru, tong dong tien khong doi.
-- ============================================================================

create table so_du_credit (
  id uuid primary key default gen_random_uuid(),
  doi_tuong text not null check (doi_tuong in ('Khách hàng', 'Nhà cung cấp')),
  khach_hang_id uuid references khach_hang(id),
  nha_cung_cap_id uuid references nha_cung_cap(id),
  so_du numeric not null default 0 check (so_du >= 0),
  updated_at timestamptz not null default now(),
  unique (khach_hang_id),
  unique (nha_cung_cap_id),
  constraint sdc_dung_cot check (
    (doi_tuong = 'Khách hàng' and khach_hang_id is not null and nha_cung_cap_id is null) or
    (doi_tuong = 'Nhà cung cấp' and nha_cung_cap_id is not null and khach_hang_id is null)
  )
);

alter table so_du_credit enable row level security;
create policy sdc_select on so_du_credit for select
  using (current_phong_ban() in ('Chứng từ', 'Kế toán', 'Giám đốc'));
-- Khong co insert/update/delete cho client — chi RPC (security definer) duoc ghi.

create table credit_giao_dich (
  id uuid primary key default gen_random_uuid(),
  doi_tuong text not null check (doi_tuong in ('Khách hàng', 'Nhà cung cấp')),
  khach_hang_id uuid references khach_hang(id),
  nha_cung_cap_id uuid references nha_cung_cap(id),
  loai text not null check (loai in ('Phát sinh', 'Cấn trừ', 'Hoàn tiền')),
  so_tien numeric not null check (so_tien > 0),
  so_du_sau numeric not null,
  hoa_don_xuat_id uuid references hoa_don_xuat(id),
  hoa_don_dau_vao_id uuid references hoa_don_dau_vao(id),
  phuong_thuc text not null check (phuong_thuc in ('Tiền mặt', 'Tài khoản công ty')),
  ly_do text,
  nguoi_thuc_hien_id uuid references nhan_vien(id),
  created_at timestamptz not null default now(),
  constraint cgd_dung_cot check (
    (doi_tuong = 'Khách hàng' and khach_hang_id is not null and nha_cung_cap_id is null) or
    (doi_tuong = 'Nhà cung cấp' and nha_cung_cap_id is not null and khach_hang_id is null)
  )
);

create index idx_cgd_khach_hang on credit_giao_dich (khach_hang_id);
create index idx_cgd_nha_cung_cap on credit_giao_dich (nha_cung_cap_id);

alter table credit_giao_dich enable row level security;
create policy cgd_select on credit_giao_dich for select
  using (current_phong_ban() in ('Chứng từ', 'Kế toán', 'Giám đốc'));
-- Khong co insert/update/delete cho client — chi RPC duoc ghi, khong ai sua/xoa
-- duoc so cai sau khi da ghi (bat bien, giong nhat_ky_thao_tac).

-- ----------------------------------------------------------------------------
-- Dong bo So quy tu credit_giao_dich — MOI DONG credit_giao_dich la 1 su kien
-- tien that RIENG BIET nen dung dung nguon_id = credit_giao_dich.id (KHONG
-- dung id cua khach_hang/nha_cung_cap — se bi trung UNIQUE(nguon_bang,nguon_id)
-- giua nhieu giao dich cua cung 1 khach). Chieu Thu/Chi theo bang trong phan
-- comment dau file.
-- ----------------------------------------------------------------------------
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

create trigger after_cgd_sync_so_quy
  after insert on credit_giao_dich
  for each row execute function sync_so_quy_credit_giao_dich();

-- ----------------------------------------------------------------------------
-- Ham dung chung: khoa (tao neu chua co) dong so_du_credit cua 1 khach hang
-- hoac nha cung cap, tra ve so du HIEN TAI duoi khoa FOR UPDATE — moi RPC ben
-- duoi deu phai goi ham nay TRUOC khi doc/sua so du, dam bao dung dan duoi
-- concurrency that (2 request cung luc chi 1 cai duoc xu ly truoc, cai sau
-- doc duoc so du DA CAP NHAT cua cai truoc, khong the vuot qua so du).
-- ----------------------------------------------------------------------------
create or replace function khoa_so_du_credit(p_khach_hang_id uuid, p_nha_cung_cap_id uuid)
returns so_du_credit
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row so_du_credit%rowtype;
begin
  if p_khach_hang_id is not null then
    select * into v_row from so_du_credit where khach_hang_id = p_khach_hang_id for update;
    if not found then
      insert into so_du_credit (doi_tuong, khach_hang_id, so_du) values ('Khách hàng', p_khach_hang_id, 0)
      returning * into v_row;
    end if;
  else
    select * into v_row from so_du_credit where nha_cung_cap_id = p_nha_cung_cap_id for update;
    if not found then
      insert into so_du_credit (doi_tuong, nha_cung_cap_id, so_du) values ('Nhà cung cấp', p_nha_cung_cap_id, 0)
      returning * into v_row;
    end if;
  end if;
  return v_row;
end;
$$;

-- ============================================================================
-- AR — Thu tien hoa don xuat (thay the viec client UPDATE truc tiep so_tien_da_thu)
-- ============================================================================
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
  -- Guard chong double-submit: neu hoa don DA thu du tu truoc (vd bam nut 2
  -- lan), khong ap dung gi them va KHONG duoc coi ca khoan nay la tra thua —
  -- tu choi han, giong nguyen tac .neq(...) da dung o Doi chieu sao ke.
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

  return jsonb_build_object('ap_dung_hoa_don', v_ap_dung, 'thua_thanh_credit', v_thua, 'trang_thai_thanh_toan', v_trang_thai, 'credit_giao_dich_id', v_cgd_id);
end;
$$;

grant execute on function thu_tien_hoa_don_xuat(uuid, numeric, text, text) to authenticated;

-- ============================================================================
-- AP — Thanh toan hoa don dau vao (thay the viec client UPDATE truc tiep)
-- ============================================================================
create or replace function thanh_toan_hoa_don_dau_vao(
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
  v_hd hoa_don_dau_vao%rowtype;
  v_con_lai numeric;
  v_ap_dung numeric;
  v_thua numeric;
  v_trang_thai text;
  v_credit so_du_credit%rowtype;
  v_cgd_id uuid;
begin
  if current_phong_ban() != 'Kế toán' then
    raise exception 'Chỉ Kế toán được ghi nhận thanh toán hóa đơn đầu vào';
  end if;
  if p_so_tien is null or p_so_tien <= 0 then
    raise exception 'Số tiền thanh toán phải lớn hơn 0';
  end if;

  select * into v_hd from hoa_don_dau_vao where id = p_hoa_don_id and dang_hoat_dong for update;
  if not found then
    raise exception 'Không tìm thấy hóa đơn đầu vào đang hoạt động';
  end if;
  if v_hd.tinh_trang_thanh_toan = 'Đã đủ' then
    raise exception 'Hóa đơn % đã "Đã đủ" từ trước — có thể do double-submit, không áp dụng thêm khoản thanh toán này', v_hd.so_hoa_don;
  end if;

  v_con_lai := v_hd.tong_tien_thanh_toan - coalesce(v_hd.so_tien_da_thanh_toan, 0);
  v_ap_dung := least(p_so_tien, v_con_lai);
  v_thua := p_so_tien - v_ap_dung;
  v_trang_thai := case when coalesce(v_hd.so_tien_da_thanh_toan,0) + v_ap_dung >= v_hd.tong_tien_thanh_toan then 'Đã đủ' else 'Một phần' end;

  update hoa_don_dau_vao set
    so_tien_da_thanh_toan = coalesce(so_tien_da_thanh_toan,0) + v_ap_dung,
    tinh_trang_thanh_toan = v_trang_thai,
    phuong_thuc_thanh_toan = p_phuong_thuc
  where id = p_hoa_don_id and tinh_trang_thanh_toan != 'Đã đủ';
  if not found then
    raise exception 'Không thể cập nhật hóa đơn (có thể đã bị thay đổi đồng thời)';
  end if;

  perform ghi_nhat_ky('hoa_don_dau_vao', p_hoa_don_id, 'thanh_toan_hoa_don_dau_vao', p_ghi_chu,
    jsonb_build_object('so_tien_da_thanh_toan', v_hd.so_tien_da_thanh_toan),
    jsonb_build_object('so_tien_tra_lan_nay', p_so_tien, 'ap_dung_hoa_don', v_ap_dung, 'thua', v_thua));

  if v_thua > 0 then
    v_credit := khoa_so_du_credit(null, v_hd.nha_cung_cap_id);
    update so_du_credit set so_du = so_du + v_thua, updated_at = now() where id = v_credit.id;
    insert into credit_giao_dich (doi_tuong, nha_cung_cap_id, loai, so_tien, so_du_sau, hoa_don_dau_vao_id, phuong_thuc, ly_do, nguoi_thuc_hien_id)
    values ('Nhà cung cấp', v_hd.nha_cung_cap_id, 'Phát sinh', v_thua, v_credit.so_du + v_thua, p_hoa_don_id, p_phuong_thuc,
      coalesce(p_ghi_chu, 'Trả vượt hóa đơn ' || v_hd.so_hoa_don), (select id from nhan_vien where auth_user_id = auth.uid()))
    returning id into v_cgd_id;
  end if;

  return jsonb_build_object('ap_dung_hoa_don', v_ap_dung, 'thua_thanh_credit', v_thua, 'tinh_trang_thanh_toan', v_trang_thai, 'credit_giao_dich_id', v_cgd_id);
end;
$$;

grant execute on function thanh_toan_hoa_don_dau_vao(uuid, numeric, text, text) to authenticated;

-- ============================================================================
-- Can tru credit vao 1 hoa don CU THE (khach hang / nha cung cap) — khong tao
-- tien moi, chi chuyen tu vi credit sang hoa don. p_so_tien phai <= so du
-- credit HIEN CO va <= con lai cua hoa don — khong tu dong cat bot, bao loi
-- ro de nguoi dung tu nhap dung so.
-- ============================================================================
create or replace function can_tru_credit_hoa_don_xuat(
  p_khach_hang_id uuid,
  p_hoa_don_id uuid,
  p_so_tien numeric,
  p_ly_do text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_credit so_du_credit%rowtype;
  v_hd hoa_don_xuat%rowtype;
  v_con_lai numeric;
  v_trang_thai text;
  v_nv_id uuid;
begin
  if current_phong_ban() not in ('Chứng từ', 'Kế toán') then
    raise exception 'Chỉ Chứng từ/Kế toán được cấn trừ credit';
  end if;
  if p_so_tien is null or p_so_tien <= 0 then
    raise exception 'Số tiền cấn trừ phải lớn hơn 0';
  end if;
  if p_ly_do is null or btrim(p_ly_do) = '' then
    raise exception 'Phải nhập lý do cấn trừ';
  end if;

  v_credit := khoa_so_du_credit(p_khach_hang_id, null);
  if p_so_tien > v_credit.so_du then
    raise exception 'Số tiền cấn trừ (%) vượt quá số dư credit hiện có (%)', p_so_tien, v_credit.so_du;
  end if;

  select * into v_hd from hoa_don_xuat where id = p_hoa_don_id and khach_hang_id = p_khach_hang_id and trang_thai = 'Đã phát hành' for update;
  if not found then
    raise exception 'Không tìm thấy hóa đơn Đã phát hành của đúng khách hàng này';
  end if;
  if v_hd.trang_thai_thanh_toan = 'Đã thu đủ' then
    raise exception 'Hóa đơn % đã "Đã thu đủ" từ trước', v_hd.so_hoa_don;
  end if;
  v_con_lai := v_hd.tong_tien - coalesce(v_hd.so_tien_da_thu, 0);
  if p_so_tien > v_con_lai then
    raise exception 'Số tiền cấn trừ (%) vượt quá số còn phải thu của hóa đơn (%)', p_so_tien, v_con_lai;
  end if;

  v_trang_thai := case when coalesce(v_hd.so_tien_da_thu,0) + p_so_tien >= v_hd.tong_tien then 'Đã thu đủ' else 'Thu một phần' end;
  update hoa_don_xuat set so_tien_da_thu = coalesce(so_tien_da_thu,0) + p_so_tien, trang_thai_thanh_toan = v_trang_thai, phuong_thuc_thu = coalesce(phuong_thuc_thu, 'Tài khoản công ty')
  where id = p_hoa_don_id and trang_thai_thanh_toan != 'Đã thu đủ';
  if not found then
    raise exception 'Không thể cập nhật hóa đơn (có thể đã bị thay đổi đồng thời)';
  end if;

  update so_du_credit set so_du = so_du - p_so_tien, updated_at = now() where id = v_credit.id;
  select id into v_nv_id from nhan_vien where auth_user_id = auth.uid();
  insert into credit_giao_dich (doi_tuong, khach_hang_id, loai, so_tien, so_du_sau, hoa_don_xuat_id, phuong_thuc, ly_do, nguoi_thuc_hien_id)
  values ('Khách hàng', p_khach_hang_id, 'Cấn trừ', p_so_tien, v_credit.so_du - p_so_tien, p_hoa_don_id,
    coalesce(v_hd.phuong_thuc_thu, 'Tài khoản công ty'), p_ly_do, v_nv_id);

  perform ghi_nhat_ky('hoa_don_xuat', p_hoa_don_id, 'can_tru_credit', p_ly_do, null, jsonb_build_object('can_tru', p_so_tien));

  return jsonb_build_object('so_du_credit_con_lai', v_credit.so_du - p_so_tien, 'trang_thai_thanh_toan', v_trang_thai);
end;
$$;

grant execute on function can_tru_credit_hoa_don_xuat(uuid, uuid, numeric, text) to authenticated;

create or replace function can_tru_credit_hoa_don_dau_vao(
  p_nha_cung_cap_id uuid,
  p_hoa_don_id uuid,
  p_so_tien numeric,
  p_ly_do text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_credit so_du_credit%rowtype;
  v_hd hoa_don_dau_vao%rowtype;
  v_con_lai numeric;
  v_trang_thai text;
  v_nv_id uuid;
begin
  if current_phong_ban() != 'Kế toán' then
    raise exception 'Chỉ Kế toán được cấn trừ credit';
  end if;
  if p_so_tien is null or p_so_tien <= 0 then
    raise exception 'Số tiền cấn trừ phải lớn hơn 0';
  end if;
  if p_ly_do is null or btrim(p_ly_do) = '' then
    raise exception 'Phải nhập lý do cấn trừ';
  end if;

  v_credit := khoa_so_du_credit(null, p_nha_cung_cap_id);
  if p_so_tien > v_credit.so_du then
    raise exception 'Số tiền cấn trừ (%) vượt quá số dư credit hiện có (%)', p_so_tien, v_credit.so_du;
  end if;

  select * into v_hd from hoa_don_dau_vao where id = p_hoa_don_id and nha_cung_cap_id = p_nha_cung_cap_id and dang_hoat_dong for update;
  if not found then
    raise exception 'Không tìm thấy hóa đơn đầu vào đang hoạt động của đúng nhà cung cấp này';
  end if;
  if v_hd.tinh_trang_thanh_toan = 'Đã đủ' then
    raise exception 'Hóa đơn % đã "Đã đủ" từ trước', v_hd.so_hoa_don;
  end if;
  v_con_lai := v_hd.tong_tien_thanh_toan - coalesce(v_hd.so_tien_da_thanh_toan, 0);
  if p_so_tien > v_con_lai then
    raise exception 'Số tiền cấn trừ (%) vượt quá số còn phải trả của hóa đơn (%)', p_so_tien, v_con_lai;
  end if;

  v_trang_thai := case when coalesce(v_hd.so_tien_da_thanh_toan,0) + p_so_tien >= v_hd.tong_tien_thanh_toan then 'Đã đủ' else 'Một phần' end;
  update hoa_don_dau_vao set so_tien_da_thanh_toan = coalesce(so_tien_da_thanh_toan,0) + p_so_tien, tinh_trang_thanh_toan = v_trang_thai, phuong_thuc_thanh_toan = coalesce(phuong_thuc_thanh_toan, 'Tài khoản công ty')
  where id = p_hoa_don_id and tinh_trang_thanh_toan != 'Đã đủ';
  if not found then
    raise exception 'Không thể cập nhật hóa đơn (có thể đã bị thay đổi đồng thời)';
  end if;

  update so_du_credit set so_du = so_du - p_so_tien, updated_at = now() where id = v_credit.id;
  select id into v_nv_id from nhan_vien where auth_user_id = auth.uid();
  insert into credit_giao_dich (doi_tuong, nha_cung_cap_id, loai, so_tien, so_du_sau, hoa_don_dau_vao_id, phuong_thuc, ly_do, nguoi_thuc_hien_id)
  values ('Nhà cung cấp', p_nha_cung_cap_id, 'Cấn trừ', p_so_tien, v_credit.so_du - p_so_tien, p_hoa_don_id,
    coalesce(v_hd.phuong_thuc_thanh_toan, 'Tài khoản công ty'), p_ly_do, v_nv_id);

  perform ghi_nhat_ky('hoa_don_dau_vao', p_hoa_don_id, 'can_tru_credit', p_ly_do, null, jsonb_build_object('can_tru', p_so_tien));

  return jsonb_build_object('so_du_credit_con_lai', v_credit.so_du - p_so_tien, 'tinh_trang_thanh_toan', v_trang_thai);
end;
$$;

grant execute on function can_tru_credit_hoa_don_dau_vao(uuid, uuid, numeric, text) to authenticated;

-- ============================================================================
-- Hoan tien that — giam credit + tao dong Chi/Thu that trong So quy. Quyen
-- Ke toan/Giam doc (giong muc do nhay cam cua huy_hoa_don_xuat).
-- ============================================================================
create or replace function hoan_tien_khach_hang(
  p_khach_hang_id uuid,
  p_so_tien numeric,
  p_phuong_thuc text,
  p_ly_do text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_credit so_du_credit%rowtype;
  v_nv_id uuid;
begin
  if current_phong_ban() not in ('Kế toán', 'Giám đốc') then
    raise exception 'Chỉ Kế toán/Giám đốc được hoàn tiền';
  end if;
  if p_so_tien is null or p_so_tien <= 0 then
    raise exception 'Số tiền hoàn phải lớn hơn 0';
  end if;
  if p_ly_do is null or btrim(p_ly_do) = '' then
    raise exception 'Phải nhập lý do hoàn tiền';
  end if;

  v_credit := khoa_so_du_credit(p_khach_hang_id, null);
  if p_so_tien > v_credit.so_du then
    raise exception 'Số tiền hoàn (%) vượt quá số dư credit hiện có (%)', p_so_tien, v_credit.so_du;
  end if;

  update so_du_credit set so_du = so_du - p_so_tien, updated_at = now() where id = v_credit.id;
  select id into v_nv_id from nhan_vien where auth_user_id = auth.uid();
  insert into credit_giao_dich (doi_tuong, khach_hang_id, loai, so_tien, so_du_sau, phuong_thuc, ly_do, nguoi_thuc_hien_id)
  values ('Khách hàng', p_khach_hang_id, 'Hoàn tiền', p_so_tien, v_credit.so_du - p_so_tien, p_phuong_thuc, p_ly_do, v_nv_id);

  return jsonb_build_object('so_du_credit_con_lai', v_credit.so_du - p_so_tien);
end;
$$;

grant execute on function hoan_tien_khach_hang(uuid, numeric, text, text) to authenticated;

create or replace function hoan_tien_ncc(
  p_nha_cung_cap_id uuid,
  p_so_tien numeric,
  p_phuong_thuc text,
  p_ly_do text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_credit so_du_credit%rowtype;
  v_nv_id uuid;
begin
  if current_phong_ban() not in ('Kế toán', 'Giám đốc') then
    raise exception 'Chỉ Kế toán/Giám đốc được ghi nhận hoàn tiền từ NCC';
  end if;
  if p_so_tien is null or p_so_tien <= 0 then
    raise exception 'Số tiền hoàn phải lớn hơn 0';
  end if;
  if p_ly_do is null or btrim(p_ly_do) = '' then
    raise exception 'Phải nhập lý do hoàn tiền';
  end if;

  v_credit := khoa_so_du_credit(null, p_nha_cung_cap_id);
  if p_so_tien > v_credit.so_du then
    raise exception 'Số tiền hoàn (%) vượt quá số dư credit hiện có (%)', p_so_tien, v_credit.so_du;
  end if;

  update so_du_credit set so_du = so_du - p_so_tien, updated_at = now() where id = v_credit.id;
  select id into v_nv_id from nhan_vien where auth_user_id = auth.uid();
  insert into credit_giao_dich (doi_tuong, nha_cung_cap_id, loai, so_tien, so_du_sau, phuong_thuc, ly_do, nguoi_thuc_hien_id)
  values ('Nhà cung cấp', p_nha_cung_cap_id, 'Hoàn tiền', p_so_tien, v_credit.so_du - p_so_tien, p_phuong_thuc, p_ly_do, v_nv_id);

  return jsonb_build_object('so_du_credit_con_lai', v_credit.so_du - p_so_tien);
end;
$$;

grant execute on function hoan_tien_ncc(uuid, numeric, text, text) to authenticated;

-- ============================================================================
-- Khoa ghi truc tiep — bat buoc tat ca viec thu tien/thanh toan phai qua RPC
-- o tren (khong cho phep bo qua co che tra thua/credit bang cach UPDATE thang
-- cot tien nhu Doi chieu sao ke va form sua hoa don van dang lam). Giu lai
-- ghi_chu/ky_ke_khai (khong lien quan tien) van sua truc tiep duoc.
-- ============================================================================
revoke update (so_tien_da_thu, trang_thai_thanh_toan, phuong_thuc_thu) on hoa_don_xuat from authenticated;
revoke update (so_tien_da_thanh_toan, tinh_trang_thanh_toan, phuong_thuc_thanh_toan) on hoa_don_dau_vao from authenticated;
