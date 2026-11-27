-- ============================================================================
-- P2 muc 15 (2026-11-27, YEU_CAU_SUA_WEBAPP_CHP.md): 262 viec qua han, toan
-- bo la "Chuẩn bị vận chuyển đơn hàng …" tu dong sinh tu 01/2025 — nguyen
-- nhan: trigger auto_lich_nhac_nho_don_hang (0112) tao viec tiep theo khi
-- Hien truong/Chung tu xac nhan xong, nhung KHONG TUNG dong lai viec truoc
-- do cua chinh lo ay, nen moi "Chuan bi van chuyen" cu mai nam "Chua thuc
-- hien" du lo da xong tu lau.
-- ============================================================================

-- Dong het nhac viec tu dong da qua han cua cac don hang THUC SU da xong
-- buoc tuong ung (du lieu cu, truoc khi co fix duoi day).
update lich_nhac_nho l
set trang_thai = 'Đã thực hiện'
from don_hang d
where l.don_hang_id = d.id and l.trang_thai = 'Chưa thực hiện'
  and (
    (l.ma_buoc_tu_dong = 'chuan_bi_van_chuyen' and d.ops_xac_nhan)
    or (l.ma_buoc_tu_dong = 'tiep_nhan_chung_tu' and d.cs_xac_nhan)
    or (l.ma_buoc_tu_dong is not null and d.trang_thai = 'Hoàn tất')
  );

create or replace function auto_lich_nhac_nho_don_hang()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  pb_hien_truong uuid;
  pb_chung_tu uuid;
  pb_ke_toan uuid;
begin
  select id into pb_hien_truong from phong_ban where ten = 'Hiện trường';
  select id into pb_chung_tu from phong_ban where ten = 'Chứng từ';
  select id into pb_ke_toan from phong_ban where ten = 'Kế toán';

  if tg_op = 'INSERT' then
    -- Don nhap vao da danh dau Hien truong xong (vd nhap lai lo hang cu/da
    -- giao tu Excel) thi KHONG sinh nhac "Chuan bi van chuyen" nua — tranh
    -- spam nhac viec qua han ngay tu luc nhap cho du lieu lich su.
    if pb_hien_truong is not null and not new.ops_xac_nhan then
      insert into lich_nhac_nho
        (phong_ban_id, don_hang_id, noi_dung, ngay_du_kien, nguoi_phu_trach_id, ma_buoc_tu_dong)
      values (pb_hien_truong, new.id, 'Chuẩn bị vận chuyển đơn hàng ' || new.so_don_hang,
        coalesce(new.ngay_van_chuyen, new.ngay_len_don), new.hien_truong_phu_trach_id, 'chuan_bi_van_chuyen')
      on conflict (don_hang_id, ma_buoc_tu_dong)
        where don_hang_id is not null and ma_buoc_tu_dong is not null do nothing;
    end if;
  else
    if new.hien_truong_phu_trach_id is distinct from old.hien_truong_phu_trach_id
       and new.hien_truong_phu_trach_id is not null then
      update lich_nhac_nho set nguoi_phu_trach_id = new.hien_truong_phu_trach_id
      where don_hang_id = new.id and ma_buoc_tu_dong = 'chuan_bi_van_chuyen'
        and trang_thai = 'Chưa thực hiện';
    end if;
    if new.chung_tu_phu_trach_id is distinct from old.chung_tu_phu_trach_id
       and new.chung_tu_phu_trach_id is not null then
      update lich_nhac_nho set nguoi_phu_trach_id = new.chung_tu_phu_trach_id
      where don_hang_id = new.id and ma_buoc_tu_dong = 'tiep_nhan_chung_tu'
        and trang_thai = 'Chưa thực hiện';
    end if;
    if new.ops_xac_nhan and not old.ops_xac_nhan then
      -- Dong luon viec "Chuan bi van chuyen" cua chinh lo nay — da xong buoc
      -- nay, khong con can nhac nua (truoc gio bi bo sot, gay qua han ao).
      update lich_nhac_nho set trang_thai = 'Đã thực hiện'
      where don_hang_id = new.id and ma_buoc_tu_dong = 'chuan_bi_van_chuyen' and trang_thai = 'Chưa thực hiện';
      if pb_chung_tu is not null then
        insert into lich_nhac_nho
          (phong_ban_id, don_hang_id, noi_dung, ngay_du_kien, nguoi_phu_trach_id, ma_buoc_tu_dong)
        values (pb_chung_tu, new.id, 'Tiếp nhận chứng từ đơn hàng ' || new.so_don_hang || ' (Hiện trường đã hoàn thành)',
          current_date, new.chung_tu_phu_trach_id, 'tiep_nhan_chung_tu')
        on conflict (don_hang_id, ma_buoc_tu_dong)
          where don_hang_id is not null and ma_buoc_tu_dong is not null do nothing;
      end if;
    end if;
    if new.cs_xac_nhan and not old.cs_xac_nhan then
      update lich_nhac_nho set trang_thai = 'Đã thực hiện'
      where don_hang_id = new.id and ma_buoc_tu_dong = 'tiep_nhan_chung_tu' and trang_thai = 'Chưa thực hiện';
      if pb_ke_toan is not null then
        insert into lich_nhac_nho
          (phong_ban_id, don_hang_id, noi_dung, ngay_du_kien, ma_buoc_tu_dong)
        values (pb_ke_toan, new.id, 'Rà soát chi phí đơn hàng ' || new.so_don_hang || ' (Chứng từ đã hoàn thành)',
          current_date, 'ra_soat_chi_phi')
        on conflict (don_hang_id, ma_buoc_tu_dong)
          where don_hang_id is not null and ma_buoc_tu_dong is not null do nothing;
      end if;
    end if;
    -- Don hang chuyen sang "Hoan tat" -> dong het moi viec tu dong con lai
    -- cua chinh lo do (vd "Ra soat chi phi" chua ai tich).
    if new.trang_thai = 'Hoàn tất' and old.trang_thai is distinct from 'Hoàn tất' then
      update lich_nhac_nho set trang_thai = 'Đã thực hiện'
      where don_hang_id = new.id and ma_buoc_tu_dong is not null and trang_thai = 'Chưa thực hiện';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists after_don_hang_auto_nhac_nho on don_hang;
create trigger after_don_hang_auto_nhac_nho
  after insert or update of ops_xac_nhan, cs_xac_nhan, hien_truong_phu_trach_id, chung_tu_phu_trach_id, trang_thai on don_hang
  for each row execute function auto_lich_nhac_nho_don_hang();
