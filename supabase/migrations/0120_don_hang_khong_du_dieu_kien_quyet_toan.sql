-- Ham bo sung cho don_hang_cho_quyet_toan: tra ve cac don hang CUNG nhan vien
-- do co tam ung/chi phi treo chua quyet toan, nhung bi loai khoi danh sach
-- "du dieu kien" vi 1 trong 2 ly do cu the — de UI (PhieuQuyetToanView) hien
-- ro tung don ly do gi thay vi chi bao chung chung "chua du dieu kien".
create or replace function public.don_hang_khong_du_dieu_kien_quyet_toan(p_nhan_vien_id uuid)
returns table(don_hang_id uuid, so_don_hang text, ly_do text)
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if current_phong_ban() not in ('Kế toán', 'Giám đốc') then
    raise exception 'Chỉ Kế toán/Giám đốc được xem danh sách đơn hàng chờ quyết toán';
  end if;

  return query
  select
    dh.id,
    dh.so_don_hang,
    case
      when exists (
        select 1
        from phieu_quyet_toan_chi_tiet c
        join phieu_quyet_toan_tam_ung p on p.id = c.phieu_id
        where c.don_hang_id = dh.id
          and p.nhan_vien_id = p_nhan_vien_id
          and p.trang_thai in ('Nháp', 'Đã duyệt')
      ) then 'Đã nằm trong 1 phiếu quyết toán khác (Nháp/Đã duyệt) của nhân viên này — không gộp 2 lần.'
      when not da_hoan_thanh_phan_viec(dh.id, p_nhan_vien_id) then
        'Kế toán chưa tiếp nhận phần việc của nhân viên này trên đơn hàng này.'
      else 'Chưa rõ lý do.'
    end as ly_do
  from don_hang dh
  where (
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
  )
  and not (
    da_hoan_thanh_phan_viec(dh.id, p_nhan_vien_id)
    and not exists (
      select 1
      from phieu_quyet_toan_chi_tiet c
      join phieu_quyet_toan_tam_ung p on p.id = c.phieu_id
      where c.don_hang_id = dh.id
        and p.nhan_vien_id = p_nhan_vien_id
        and p.trang_thai in ('Nháp', 'Đã duyệt')
    )
  );
end;
$function$;
