-- ============================================================================
-- Phase 1 (state machine) + Phase 3 muc 6 cua ban ke hoach 14-phase:
--
-- 1) Bang nhat_ky_thao_tac dung chung — ghi Ai/Khi nao/Lam gi/Ly do/Truoc-Sau
--    cho moi hanh dong "mo lai"/"huy"/"duyet du du lieu da doi". Dung chung
--    cho ca cong_viec_hoan_thanh (mo lai) lan phieu_quyet_toan_tam_ung (duyet
--    voi du lieu thay doi), tai su dung tiep o Phase 11 cho cac hanh dong
--    quan trong khac thay vi lam schema audit log 2 lan.
--
-- 2) mo_lai_cong_viec: bat buoc tham so p_ly_do (khong duoc rong), ghi nhat ky
--    truoc khi doi trang thai — khong con bi mat dau vet "ai mo lai luc nao".
--
-- 3) Chan "silent recalculation" khi Duyet phieu quyet toan: neu tong tien
--    hien tai khac luc tao phieu (vd 1 don hang bi Mo lai cong viec giua
--    chung, hoac Ke toan tu sua so tien 1 dong chi phi da tre — Ke toan duoc
--    mien khoi khoa "Da tiep nhan" nen van sua duoc), RPC duyet se BAO LOI
--    thay vi am tham khoa voi so nho hon. Theo dung lua chon cua nguoi dung:
--    KHONG chan cung — cho phep Ke toan XAC NHAN LAI (p_xac_nhan_du_lieu_moi)
--    de duyet tiep voi so lieu MOI, va hanh dong nay duoc ghi nhat ky.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Bang nhat ky thao tac dung chung
-- ----------------------------------------------------------------------------
create table if not exists nhat_ky_thao_tac (
  id uuid primary key default gen_random_uuid(),
  bang text not null,
  dong_id uuid not null,
  hanh_dong text not null,
  nguoi_thuc_hien_id uuid references nhan_vien(id),
  thuc_hien_luc timestamptz not null default now(),
  ly_do text,
  du_lieu_truoc jsonb,
  du_lieu_sau jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_nhat_ky_thao_tac_bang_dong on nhat_ky_thao_tac (bang, dong_id);

alter table nhat_ky_thao_tac enable row level security;

-- Chi Ke toan/Giam doc xem duoc nhat ky (du lieu nhay cam ve thao tac tien).
create policy "nkt_select" on nhat_ky_thao_tac for select to authenticated
  using (current_phong_ban() in ('Kế toán', 'Giám đốc'));
-- Khong co insert/update/delete policy cho client — chi ghi qua ham
-- ghi_nhat_ky() (security definer) duoc goi tu ben trong cac RPC nghiep vu,
-- khong ai UPDATE/XOA thang duoc, kha nang sua/xoa nhat ky = 0.

create or replace function ghi_nhat_ky(
  p_bang text, p_dong_id uuid, p_hanh_dong text,
  p_ly_do text, p_du_lieu_truoc jsonb, p_du_lieu_sau jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nv_id uuid;
begin
  select id into v_nv_id from nhan_vien where auth_user_id = auth.uid();
  insert into nhat_ky_thao_tac (bang, dong_id, hanh_dong, nguoi_thuc_hien_id, ly_do, du_lieu_truoc, du_lieu_sau)
  values (p_bang, p_dong_id, p_hanh_dong, v_nv_id, p_ly_do, p_du_lieu_truoc, p_du_lieu_sau);
end;
$$;

-- ----------------------------------------------------------------------------
-- 2) mo_lai_cong_viec: bat buoc ly do, ghi nhat ky
--
-- QUAN TRONG: doi tu 2 tham so (uuid, uuid) sang 3 (uuid, uuid, text). Postgres
-- coi day la 1 ham KHAC (overload), "create or replace" KHONG tu xoa ham 2
-- tham so cu — phai drop tay, neu khong ham cu (khong bat buoc ly do) van con
-- goi duoc song song, vo hieu hoa hoan toan yeu cau nay.
-- ----------------------------------------------------------------------------
drop function if exists mo_lai_cong_viec(uuid, uuid);

create or replace function mo_lai_cong_viec(p_don_hang_id uuid, p_nhan_vien_id uuid, p_ly_do text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dong_id uuid;
  v_truoc jsonb;
begin
  if current_phong_ban() not in ('Kế toán', 'Giám đốc') then
    raise exception 'Chỉ Kế toán/Giám đốc được mở lại';
  end if;
  if p_ly_do is null or btrim(p_ly_do) = '' then
    raise exception 'Phải nhập lý do khi mở lại';
  end if;

  select id, to_jsonb(c) into v_dong_id, v_truoc
  from cong_viec_hoan_thanh c
  where don_hang_id = p_don_hang_id and nhan_vien_id = p_nhan_vien_id
    and trang_thai = 'Đã tiếp nhận';

  if v_dong_id is null then
    raise exception 'Không tìm thấy phần việc ở trạng thái "Đã tiếp nhận" để mở lại';
  end if;

  update cong_viec_hoan_thanh
  set trang_thai = 'Đã hoàn thành', tiep_nhan_luc = null, tiep_nhan_boi = null
  where id = v_dong_id;

  perform ghi_nhat_ky(
    'cong_viec_hoan_thanh', v_dong_id, 'mo_lai', p_ly_do,
    v_truoc,
    (select to_jsonb(c) from cong_viec_hoan_thanh c where c.id = v_dong_id)
  );
end;
$$;

grant execute on function mo_lai_cong_viec(uuid, uuid, text) to authenticated;

-- ----------------------------------------------------------------------------
-- 3) Helper tinh tong tam ung + chi treo cho 1 danh sach don hang cua 1 nhan
--    vien — dung lai o CA luc tao phieu (chup snapshot ban dau) LAN luc duyet
--    (tinh lai de so sanh), tranh viet trung logic 2 lan de khong bi lech.
-- ----------------------------------------------------------------------------
create or replace function tinh_tong_tam_ung_chi_treo(p_nhan_vien_id uuid, p_don_hang_ids uuid[])
returns table(tong_tam_ung numeric, tong_chi_treo numeric, don_hang_khong_du_dieu_kien uuid[])
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    coalesce((
      select sum(t.so_tien) from tam_ung_giai_chi t
      where t.don_hang_id = any(p_don_hang_ids) and t.nhan_vien_id = p_nhan_vien_id
        and t.loai = 'Tạm ứng' and t.trang_thai = 'Đã duyệt' and t.phieu_quyet_toan_id is null
    ), 0),
    coalesce((
      select sum(p.so_tien_da_chi) from phat_sinh_chi_phi p
      where p.don_hang_id = any(p_don_hang_ids) and p.nguoi_nhap_id = p_nhan_vien_id
        and p.nguon_thanh_toan = 'Tạm ứng nhân viên' and coalesce(p.so_tien_da_thanh_toan, 0) = 0
        and p.phieu_quyet_toan_id is null and p.trang_thai <> 'Từ chối'
    ), 0) + coalesce((
      select sum(d.so_tien_da_chi) from don_thue_ngoai d
      where d.don_hang_id = any(p_don_hang_ids) and d.nguoi_nhap_id = p_nhan_vien_id
        and d.nguon_thanh_toan = 'Tạm ứng nhân viên' and coalesce(d.so_tien_da_thanh_toan, 0) = 0
        and d.phieu_quyet_toan_id is null and d.trang_thai <> 'Từ chối'
    ), 0),
    coalesce(array_agg(dh_id) filter (where not da_hoan_thanh_phan_viec(dh_id, p_nhan_vien_id)), array[]::uuid[])
  from unnest(p_don_hang_ids) as dh_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- tao_phieu_quyet_toan_tam_ung: sau khi tao chi tiet, CHUP SNAPSHOT tong tam
-- ung/chi treo tai thoi diem tao vao chinh header — day la moc so sanh khi
-- Duyet sau nay. Truoc day 2 cot nay chi duoc dien luc Duyet (mac dinh 0 luc
-- Nhap), gio dien ngay tu luc tao de UI cung hien duoc so du kien som.
-- ----------------------------------------------------------------------------
create or replace function tao_phieu_quyet_toan_tam_ung(p_nhan_vien_id uuid, p_don_hang_ids uuid[])
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phieu_id uuid;
  v_don_hang_id uuid;
  v_tong record;
begin
  if array_length(p_don_hang_ids, 1) is null then
    raise exception 'Phải chọn ít nhất 1 đơn hàng';
  end if;

  foreach v_don_hang_id in array p_don_hang_ids loop
    if not da_hoan_thanh_phan_viec(v_don_hang_id, p_nhan_vien_id) then
      raise exception 'Đơn hàng % chưa xác nhận hoàn thành phần việc của nhân viên này — chưa thể đưa vào quyết toán', v_don_hang_id;
    end if;
    if exists (
      select 1 from phieu_quyet_toan_chi_tiet c
      join phieu_quyet_toan_tam_ung p on p.id = c.phieu_id
      where c.don_hang_id = v_don_hang_id
        and p.nhan_vien_id = p_nhan_vien_id
        and p.trang_thai in ('Nháp', 'Đã duyệt')
    ) then
      raise exception 'Đơn hàng % đang nằm trong 1 phiếu quyết toán khác chưa hoàn tất của nhân viên này', v_don_hang_id;
    end if;
  end loop;

  insert into phieu_quyet_toan_tam_ung (nhan_vien_id) values (p_nhan_vien_id)
  returning id into v_phieu_id;

  insert into phieu_quyet_toan_chi_tiet (phieu_id, don_hang_id)
  select v_phieu_id, unnest(p_don_hang_ids);

  select * into v_tong from tinh_tong_tam_ung_chi_treo(p_nhan_vien_id, p_don_hang_ids);
  update phieu_quyet_toan_tam_ung
  set tong_da_tam_ung = v_tong.tong_tam_ung,
      tong_chi_thuc_te = v_tong.tong_chi_treo,
      chenh_lech_rong = v_tong.tong_tam_ung - v_tong.tong_chi_treo
  where id = v_phieu_id;

  return v_phieu_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- RPC xem truoc — UI goi cai nay TRUOC khi bam Duyet de hien so sanh so lieu
-- luc tao phieu vs hien tai, khong phai doi loi tu duyet_phieu_quyet_toan_
-- tam_ung moi biet co doi hay khong.
-- ----------------------------------------------------------------------------
create or replace function xem_truoc_duyet_phieu_quyet_toan(p_phieu_id uuid)
returns table(
  tong_tam_ung_luc_tao numeric,
  tong_chi_luc_tao numeric,
  tong_tam_ung_hien_tai numeric,
  tong_chi_hien_tai numeric,
  co_thay_doi boolean,
  don_hang_khong_du_dieu_kien uuid[]
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nhan_vien_id uuid;
  v_snap_ung numeric;
  v_snap_chi numeric;
  v_don_hang_ids uuid[];
  v_hien_tai record;
begin
  select nhan_vien_id, tong_da_tam_ung, tong_chi_thuc_te
    into v_nhan_vien_id, v_snap_ung, v_snap_chi
  from phieu_quyet_toan_tam_ung where id = p_phieu_id;
  if not found then
    raise exception 'Không tìm thấy phiếu';
  end if;

  select coalesce(array_agg(don_hang_id), array[]::uuid[]) into v_don_hang_ids
  from phieu_quyet_toan_chi_tiet where phieu_id = p_phieu_id;

  select * into v_hien_tai from tinh_tong_tam_ung_chi_treo(v_nhan_vien_id, v_don_hang_ids);

  return query select
    v_snap_ung, v_snap_chi,
    v_hien_tai.tong_tam_ung, v_hien_tai.tong_chi_treo,
    (
      v_hien_tai.tong_tam_ung is distinct from v_snap_ung
      or v_hien_tai.tong_chi_treo is distinct from v_snap_chi
      or coalesce(array_length(v_hien_tai.don_hang_khong_du_dieu_kien, 1), 0) > 0
    ),
    v_hien_tai.don_hang_khong_du_dieu_kien;
end;
$$;

grant execute on function xem_truoc_duyet_phieu_quyet_toan(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- duyet_phieu_quyet_toan_tam_ung: them tham so p_xac_nhan_du_lieu_moi. Neu du
-- lieu da doi so voi luc tao phieu (tinh boi tinh_tong_tam_ung_chi_treo, cung
-- 1 cong thuc voi trigger enforce_phieu_quyet_toan_trang_thai ben duoi de
-- dam bao "pass o day" = "trigger se khoa dung nhu du kien") ma chua xac
-- nhan, CHAN va bao loi ro (khong am tham duyet voi so nho hon). Neu Ke toan
-- xac nhan lai (p_xac_nhan_du_lieu_moi = true), cho duyet tiep VOI SO LIEU
-- MOI va ghi nhat ky lai viec nay.
--
-- Cung ly do nhu mo_lai_cong_viec o tren: doi tu 1 tham so sang 2 la 1 ham
-- KHAC voi Postgres — phai drop ham (uuid) cu, neu khong callers cu van goi
-- duoc ham khong co kiem tra du lieu thay doi.
-- ----------------------------------------------------------------------------
drop function if exists duyet_phieu_quyet_toan_tam_ung(uuid);

create or replace function duyet_phieu_quyet_toan_tam_ung(p_phieu_id uuid, p_xac_nhan_du_lieu_moi boolean default false)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nhan_vien_id uuid;
  v_snap_ung numeric;
  v_snap_chi numeric;
  v_don_hang_ids uuid[];
  v_hien_tai record;
  v_co_doi boolean;
begin
  select nhan_vien_id, tong_da_tam_ung, tong_chi_thuc_te
    into v_nhan_vien_id, v_snap_ung, v_snap_chi
  from phieu_quyet_toan_tam_ung
  where id = p_phieu_id and trang_thai = 'Nháp'
  for update;

  if not found then
    raise exception 'Không tìm thấy phiếu ở trạng thái Nháp để duyệt';
  end if;

  select coalesce(array_agg(don_hang_id), array[]::uuid[]) into v_don_hang_ids
  from phieu_quyet_toan_chi_tiet where phieu_id = p_phieu_id;

  select * into v_hien_tai from tinh_tong_tam_ung_chi_treo(v_nhan_vien_id, v_don_hang_ids);

  v_co_doi := (
    v_hien_tai.tong_tam_ung is distinct from v_snap_ung
    or v_hien_tai.tong_chi_treo is distinct from v_snap_chi
    or coalesce(array_length(v_hien_tai.don_hang_khong_du_dieu_kien, 1), 0) > 0
  );

  if v_co_doi and not p_xac_nhan_du_lieu_moi then
    raise exception 'DU_LIEU_DA_THAY_DOI: Dữ liệu đã thay đổi so với lúc tạo phiếu (tạm ứng lúc tạo % → hiện tại %; chi phí treo lúc tạo % → hiện tại %). Vui lòng kiểm tra lại và xác nhận trước khi duyệt.',
      v_snap_ung, v_hien_tai.tong_tam_ung, v_snap_chi, v_hien_tai.tong_chi_treo;
  end if;

  update phieu_quyet_toan_tam_ung set trang_thai = 'Đã duyệt'
  where id = p_phieu_id and trang_thai = 'Nháp';

  if v_co_doi and p_xac_nhan_du_lieu_moi then
    perform ghi_nhat_ky(
      'phieu_quyet_toan_tam_ung', p_phieu_id, 'duyet_voi_du_lieu_thay_doi',
      'Kế toán xác nhận duyệt dù dữ liệu đã thay đổi so với lúc tạo phiếu',
      jsonb_build_object('tong_tam_ung', v_snap_ung, 'tong_chi_treo', v_snap_chi),
      jsonb_build_object('tong_tam_ung', v_hien_tai.tong_tam_ung, 'tong_chi_treo', v_hien_tai.tong_chi_treo,
        'don_hang_bi_loai', v_hien_tai.don_hang_khong_du_dieu_kien)
    );
  end if;
end;
$$;

grant execute on function duyet_phieu_quyet_toan_tam_ung(uuid, boolean) to authenticated;
