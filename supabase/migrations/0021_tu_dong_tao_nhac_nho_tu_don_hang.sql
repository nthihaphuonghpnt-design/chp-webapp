-- ============================================================================
-- Mo rong quyen sua/xoa Lich nhac nho: cho phep ca phong ban duoc giao (khong
-- chi rieng 1 nguoi phu trach) — can thiet vi nhac nho tu dong sinh ra se
-- khong gan san 1 nguoi cu the.
-- ============================================================================

drop policy if exists "lnn_update" on lich_nhac_nho;
create policy "lnn_update" on lich_nhac_nho for update to authenticated
  using (
    current_phong_ban() = 'Kế toán'
    or nguoi_phu_trach_id in (select id from nhan_vien where auth_user_id = auth.uid())
    or nguoi_tao_id in (select id from nhan_vien where auth_user_id = auth.uid())
    or phong_ban_id in (select id from phong_ban where ten = current_phong_ban())
  );

drop policy if exists "lnn_delete" on lich_nhac_nho;
create policy "lnn_delete" on lich_nhac_nho for delete to authenticated
  using (
    current_phong_ban() = 'Kế toán'
    or nguoi_phu_trach_id in (select id from nhan_vien where auth_user_id = auth.uid())
    or nguoi_tao_id in (select id from nhan_vien where auth_user_id = auth.uid())
    or phong_ban_id in (select id from phong_ban where ten = current_phong_ban())
  );

-- ============================================================================
-- Tu dong sinh nhac nho tu su kien don hang:
-- 1) Tao don moi -> nhac Hien truong chuan bi van chuyen (han = ngay van
--    chuyen, neu chua co thi lay ngay len don).
-- 2) Hien truong xac nhan xong (ops_xac_nhan) -> nhac Chung tu tiep nhan.
-- 3) Chung tu xac nhan xong (cs_xac_nhan) -> nhac Ke toan ra soat chi phi.
-- ============================================================================

create or replace function auto_lich_nhac_nho_don_hang()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  pb_hien_truong uuid;
  pb_chung_tu uuid;
  pb_ke_toan uuid;
begin
  select id into pb_hien_truong from phong_ban where ten = 'Hiện trường';
  select id into pb_chung_tu from phong_ban where ten = 'Chứng từ';
  select id into pb_ke_toan from phong_ban where ten = 'Kế toán';

  if TG_OP = 'INSERT' then
    if pb_hien_truong is not null then
      insert into lich_nhac_nho (phong_ban_id, don_hang_id, noi_dung, ngay_du_kien)
      values (pb_hien_truong, new.id, 'Chuẩn bị vận chuyển đơn hàng ' || new.so_don_hang,
              coalesce(new.ngay_van_chuyen, new.ngay_len_don));
    end if;
  elsif TG_OP = 'UPDATE' then
    if new.ops_xac_nhan and not old.ops_xac_nhan and pb_chung_tu is not null then
      insert into lich_nhac_nho (phong_ban_id, don_hang_id, noi_dung, ngay_du_kien)
      values (pb_chung_tu, new.id, 'Tiếp nhận chứng từ đơn hàng ' || new.so_don_hang || ' (Hiện trường đã hoàn thành)', current_date);
    end if;
    if new.cs_xac_nhan and not old.cs_xac_nhan and pb_ke_toan is not null then
      insert into lich_nhac_nho (phong_ban_id, don_hang_id, noi_dung, ngay_du_kien)
      values (pb_ke_toan, new.id, 'Rà soát chi phí đơn hàng ' || new.so_don_hang || ' (Chứng từ đã hoàn thành)', current_date);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists after_don_hang_auto_nhac_nho on don_hang;
create trigger after_don_hang_auto_nhac_nho
  after insert or update of ops_xac_nhan, cs_xac_nhan on don_hang
  for each row execute function auto_lich_nhac_nho_don_hang();
