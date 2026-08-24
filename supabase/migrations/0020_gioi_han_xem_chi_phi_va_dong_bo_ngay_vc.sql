-- ============================================================================
-- Hien truong / Chung tu chi xem duoc dong chi phi phat sinh do CHINH MINH
-- nhap (nguoi_nhap_id) — cac dong khac khong lien quan se khong thay.
-- Cac phong ban khac (Sale, Dieu phoi, Ke toan, Giam doc) van xem duoc het.
-- ============================================================================

drop policy if exists "psc_select" on phat_sinh_chi_phi;
create policy "psc_select" on phat_sinh_chi_phi for select to authenticated
  using (
    current_phong_ban() not in ('Hiện trường', 'Chứng từ')
    or nguoi_nhap_id in (select id from nhan_vien where auth_user_id = auth.uid())
  );

-- ============================================================================
-- Dong bo them "Ngay van chuyen" tu chang (ngay_vc) nguoc len don hang
-- (ngay_van_chuyen), giong nhu da lam voi dia diem — chi dien khi don hang
-- con dang trong.
-- ============================================================================

create or replace function sync_diem_ve_don_hang()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update don_hang
  set
    noi_lay_cont_hang_id = coalesce(noi_lay_cont_hang_id, new.diem_1_id),
    noi_dong_giao_id = coalesce(noi_dong_giao_id, new.diem_2_id),
    noi_ha_tra_rong_id = coalesce(noi_ha_tra_rong_id, new.diem_3_id),
    ngay_van_chuyen = coalesce(ngay_van_chuyen, new.ngay_vc)
  where id = new.don_hang_id
    and (noi_lay_cont_hang_id is null and new.diem_1_id is not null
      or noi_dong_giao_id is null and new.diem_2_id is not null
      or noi_ha_tra_rong_id is null and new.diem_3_id is not null
      or ngay_van_chuyen is null and new.ngay_vc is not null);
  return new;
end;
$$;

drop trigger if exists after_ctvc_sync_diem on chi_tiet_van_chuyen;
create trigger after_ctvc_sync_diem
  after insert or update of diem_1_id, diem_2_id, diem_3_id, ngay_vc on chi_tiet_van_chuyen
  for each row execute function sync_diem_ve_don_hang();
