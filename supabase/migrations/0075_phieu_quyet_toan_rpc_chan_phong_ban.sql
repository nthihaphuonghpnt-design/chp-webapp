-- ============================================================================
-- Phat hien khi ra soat mo rong: 5/6 RPC cua module Phieu quyet toan tam ung
-- (tao_phieu_quyet_toan_tam_ung, duyet_phieu_quyet_toan_tam_ung,
-- huy_phieu_quyet_toan_tam_ung, don_hang_cho_quyet_toan,
-- xem_truoc_duyet_phieu_quyet_toan — chi rieng thanh_toan_phieu_quyet_toan_
-- tam_ung, viet o 0073, la co check) KHONG CO BAT KY KIEM TRA PHONG BAN NAO
-- ben trong than ham. Vi ca 6 ham deu la SECURITY DEFINER (bo qua RLS cua
-- bang phieu_quyet_toan_tam_ung/phieu_quyet_toan_chi_tiet), UI chi an nut cho
-- Ke toan/Giam doc KHONG PHAI la lop bao ve that (dung nguyen tac Phase 8 da
-- ap dung xuyen suot audit nay) — bat ky nhan vien phong ban nao (Sale, Hien
-- truong, Chung tu, Dieu phoi) goi thang API deu:
--   - tao_phieu_quyet_toan_tam_ung: tao duoc 1 phieu that cho BAT KY nhan
--     vien nao.
--   - duyet_phieu_quyet_toan_tam_ung: DUYET duoc phieu — khoa that tam ung/
--     chi phi tren toan he thong, tu dien ten CHINH MINH vao nguoi_duyet_id
--     du khong phai Ke toan.
--   - huy_phieu_quyet_toan_tam_ung: huy duoc bat ky phieu nao (ke ca cua Ke
--     toan tao), giai phong lai du lieu da khoa.
--   - don_hang_cho_quyet_toan / xem_truoc_duyet_phieu_quyet_toan: xem duoc
--     so tien tam ung/chi treo cua NGUOI KHAC — lo du lieu tien luong nhay
--     cam ra ngoai pham vi Ke toan/Giam doc.
--
-- Fix: them dung 1 dieu kien dau moi ham — "current_phong_ban() not in
-- ('Kế toán', 'Giám đốc') then raise exception" — giu nguyen toan bo logic
-- nghiep vu con lai.
-- ============================================================================

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
  if current_phong_ban() not in ('Kế toán', 'Giám đốc') then
    raise exception 'Chỉ Kế toán/Giám đốc được tạo phiếu quyết toán';
  end if;

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
      chenh_lech_rong = v_tong.tong_tam_ung - v_tong.tong_chi_treo,
      so_phieu = 'PQT-' || to_char(current_date, 'YYYYMMDD') || '-' || substr(v_phieu_id::text, 1, 8)
  where id = v_phieu_id;

  return v_phieu_id;
end;
$$;

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
  if current_phong_ban() not in ('Kế toán', 'Giám đốc') then
    raise exception 'Chỉ Kế toán/Giám đốc được duyệt phiếu quyết toán';
  end if;

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

  update phieu_quyet_toan_tam_ung
  set trang_thai = 'Đã duyệt',
      nguoi_duyet_id = (select id from nhan_vien where auth_user_id = auth.uid())
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

create or replace function huy_phieu_quyet_toan_tam_ung(p_phieu_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_phong_ban() not in ('Kế toán', 'Giám đốc') then
    raise exception 'Chỉ Kế toán/Giám đốc được hủy phiếu quyết toán';
  end if;

  update phieu_quyet_toan_tam_ung set trang_thai = 'Đã hủy'
  where id = p_phieu_id and trang_thai in ('Nháp', 'Đã duyệt');
  if not found then
    raise exception 'Không thể hủy — không tìm thấy phiếu, hoặc phiếu đã thanh toán/đã hủy';
  end if;
end;
$$;

create or replace function don_hang_cho_quyet_toan(p_nhan_vien_id uuid)
returns table(don_hang_id uuid, so_don_hang text, tong_tam_ung numeric, tong_chi_treo numeric)
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_phong_ban() not in ('Kế toán', 'Giám đốc') then
    raise exception 'Chỉ Kế toán/Giám đốc được xem danh sách đơn hàng chờ quyết toán';
  end if;

  return query
  select
    dh.id,
    dh.so_don_hang,
    coalesce((
      select sum(t.so_tien) from tam_ung_giai_chi t
      where t.don_hang_id = dh.id and t.nhan_vien_id = p_nhan_vien_id
        and t.loai = 'Tạm ứng' and t.trang_thai = 'Đã duyệt' and t.phieu_quyet_toan_id is null
    ), 0) as tong_tam_ung,
    coalesce((
      select sum(p.so_tien_da_chi) from phat_sinh_chi_phi p
      where p.don_hang_id = dh.id and p.nguoi_nhap_id = p_nhan_vien_id
        and p.nguon_thanh_toan = 'Tạm ứng nhân viên' and coalesce(p.so_tien_da_thanh_toan, 0) = 0
        and p.phieu_quyet_toan_id is null and p.trang_thai <> 'Từ chối'
    ), 0) + coalesce((
      select sum(d.so_tien_da_chi) from don_thue_ngoai d
      where d.don_hang_id = dh.id and d.nguoi_nhap_id = p_nhan_vien_id
        and d.nguon_thanh_toan = 'Tạm ứng nhân viên' and coalesce(d.so_tien_da_thanh_toan, 0) = 0
        and d.phieu_quyet_toan_id is null and d.trang_thai <> 'Từ chối'
    ), 0) as tong_chi_treo
  from don_hang dh
  where da_hoan_thanh_phan_viec(dh.id, p_nhan_vien_id)
    and not exists (
      select 1 from phieu_quyet_toan_chi_tiet c
      join phieu_quyet_toan_tam_ung p on p.id = c.phieu_id
      where c.don_hang_id = dh.id
        and p.nhan_vien_id = p_nhan_vien_id
        and p.trang_thai in ('Nháp', 'Đã duyệt')
    )
    and (
      exists (
        select 1 from tam_ung_giai_chi t
        where t.don_hang_id = dh.id and t.nhan_vien_id = p_nhan_vien_id
          and t.loai = 'Tạm ứng' and t.trang_thai = 'Đã duyệt' and t.phieu_quyet_toan_id is null
      )
      or exists (
        select 1 from phat_sinh_chi_phi p
        where p.don_hang_id = dh.id and p.nguoi_nhap_id = p_nhan_vien_id
          and p.nguon_thanh_toan = 'Tạm ứng nhân viên' and coalesce(p.so_tien_da_thanh_toan, 0) = 0
          and p.phieu_quyet_toan_id is null and p.trang_thai <> 'Từ chối'
      )
      or exists (
        select 1 from don_thue_ngoai d
        where d.don_hang_id = dh.id and d.nguoi_nhap_id = p_nhan_vien_id
          and d.nguon_thanh_toan = 'Tạm ứng nhân viên' and coalesce(d.so_tien_da_thanh_toan, 0) = 0
          and d.phieu_quyet_toan_id is null and d.trang_thai <> 'Từ chối'
      )
    );
end;
$$;

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
  if current_phong_ban() not in ('Kế toán', 'Giám đốc') then
    raise exception 'Chỉ Kế toán/Giám đốc được xem trước khi duyệt';
  end if;

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
