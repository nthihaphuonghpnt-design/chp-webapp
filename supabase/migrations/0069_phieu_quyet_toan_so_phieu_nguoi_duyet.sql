-- ============================================================================
-- Chuan bi cho UI Phieu quyet toan tam ung (Phase 3):
--
-- 1) duyet_phieu_quyet_toan_tam_ung chua BAO GIO gan nguoi_duyet_id — cot nay
--    luon la NULL, mat dau vet "ai da duyet phieu nay". Sua RPC de tu dong
--    dien tu auth.uid() ngay trong buoc UPDATE (khong doi UI phai tu truyen
--    len de tranh gia mao, va khong the bi bo sot vi day la duong duy nhat
--    hop le de duyet — RLS van cho Ke toan UPDATE truc tiep nhung nghiep vu
--    "duyet" luon phai qua RPC nay vi no la noi giu logic chan silent
--    recalculation).
--
-- 2) tao_phieu_quyet_toan_tam_ung chua tung dien so_phieu — de UI hien thi ro
--    rang (danh sach/tim kiem), tu dien mot ma de doc ngay luc tao, dua tren
--    ngay quyet toan + 8 ky tu dau cua id (khong can sequence rieng, khong
--    the trung vi id la uuid).
-- ============================================================================

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
      chenh_lech_rong = v_tong.tong_tam_ung - v_tong.tong_chi_treo,
      so_phieu = 'PQT-' || to_char(current_date, 'YYYYMMDD') || '-' || substr(v_phieu_id::text, 1, 8)
  where id = v_phieu_id;

  return v_phieu_id;
end;
$$;
