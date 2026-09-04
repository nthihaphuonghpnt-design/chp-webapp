-- ============================================================================
-- Cham cong (va don xin nghi phep) chi ap dung cho nhan vien van phong
-- (NVVP) — Hien truong va Sale khong cham cong, nen khong duoc tu insert
-- (che an giao dien la chua du, chan luon o RLS de chac chan). Ke toan/
-- Giam doc van thao tac duoc cho bat ky ai (phong khi can dieu chinh du
-- lieu cu con sot lai).
-- ============================================================================

drop policy if exists "cham_cong_insert" on cham_cong;
create policy "cham_cong_insert" on cham_cong for insert to authenticated
  with check (
    (
      nhan_vien_id in (select id from nhan_vien where auth_user_id = auth.uid())
      and ngay = (now() at time zone 'Asia/Ho_Chi_Minh')::date
      and trang_thai = 'Đi làm'
      and nguoi_dieu_chinh_id is null
      and current_phong_ban() not in ('Hiện trường', 'Sale')
    )
    or current_phong_ban() in ('Kế toán', 'Giám đốc')
  );

drop policy if exists "don_xin_nghi_phep_insert" on don_xin_nghi_phep;
create policy "don_xin_nghi_phep_insert" on don_xin_nghi_phep for insert to authenticated
  with check (
    (
      nhan_vien_id in (select id from nhan_vien where auth_user_id = auth.uid())
      and ngay_bat_dau >= (now() at time zone 'Asia/Ho_Chi_Minh')::date
      and trang_thai = 'Chờ duyệt'
      and current_phong_ban() not in ('Hiện trường', 'Sale')
    )
    or current_phong_ban() in ('Kế toán', 'Giám đốc')
  );
