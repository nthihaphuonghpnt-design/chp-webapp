-- ============================================================================
-- Gop toan bo tien bac ve "Chi phi phat sinh" (mot noi duy nhat theo doi:
-- no ai/no bao nhieu/da tra chua/co chi ho hay khong), tranh trung voi
-- "Chi tiet van chuyen" (chi con la thong tin dieu dong: ngay, xe, tai xe,
-- diem di/den, trang thai).
-- ============================================================================

-- Cho phep 1 dong chi phi ghi nhan no VOI DOI TAC THUE NGOAI (ben van tai)
-- thay vi chi Nha cung cap — dung khi ben van tai tra chi ho phi nang/ha...
alter table phat_sinh_chi_phi add column if not exists doi_tac_thue_ngoai_id uuid references doi_tac_thue_ngoai(id);

-- Gan 1 dong chi phi voi dung CHANG van chuyen nao (tuy chon)
alter table phat_sinh_chi_phi add column if not exists chi_tiet_van_chuyen_id uuid references chi_tiet_van_chuyen(id) on delete set null;

-- Bo cac cot tien trong chi_tiet_van_chuyen — chuyen het sang phat_sinh_chi_phi
alter table chi_tiet_van_chuyen drop column if exists tien_vc_noi_bo;
alter table chi_tiet_van_chuyen drop column if exists tien_vc_thue_ngoai;
alter table chi_tiet_van_chuyen drop column if exists tien_thue;
alter table chi_tiet_van_chuyen drop column if exists phu_thu;

-- ============================================================================
-- Lien ket 2 chieu Dia diem giua Don hang (B1) va Chi tiet van chuyen:
-- - Neu don hang da co noi_lay/noi_dong/noi_ha, chang moi tao se duoc goi y
--   san (xu ly o client).
-- - Neu chang nhap dia diem ma don hang CHUA co, tu dong dien nguoc lai vao
--   don hang (chi khi con trong, khong ghi de du lieu da co).
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
    noi_ha_tra_rong_id = coalesce(noi_ha_tra_rong_id, new.diem_3_id)
  where id = new.don_hang_id
    and (noi_lay_cont_hang_id is null and new.diem_1_id is not null
      or noi_dong_giao_id is null and new.diem_2_id is not null
      or noi_ha_tra_rong_id is null and new.diem_3_id is not null);
  return new;
end;
$$;

drop trigger if exists after_ctvc_sync_diem on chi_tiet_van_chuyen;
create trigger after_ctvc_sync_diem
  after insert or update of diem_1_id, diem_2_id, diem_3_id on chi_tiet_van_chuyen
  for each row execute function sync_diem_ve_don_hang();
