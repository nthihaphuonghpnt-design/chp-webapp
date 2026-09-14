-- ============================================================================
-- Phat hien khi ra soat mo rong (tiep theo Phase 5/0074/0075): hoa_don_xuat
-- va luong_da_tra deu cho Ke toan (+ Chung tu voi hoa don) sua/xoa KHONG GIOI
-- HAN, ke ca sau khi da co tien thu/da tra that ngoai doi — khac voi
-- tam_ung_giai_chi/phat_sinh_chi_phi/don_thue_ngoai (0074), o day KHONG co 1
-- bang tong hop rieng nao bi lech theo (trigger sync_so_quy_* tu xoa-roi-tao-
-- lai dong So quy moi lan sua nen So quy luon khop voi ban ghi hien tai) —
-- nen khong khoa cung nhu 0074, chi them GHI NHAT KY (dung Phase 11 cua ke
-- hoach: "audit log cho nghiep vu quan trong") de biet AI sua/xoa GI/KHI NAO
-- tren 1 ban ghi da co tien, thay vi khoa cung lam gian doan cong viec sua
-- loi chinh ta/gia tri that su can sua.
--
-- hoa_don_xuat: chi ghi log khi SUA cac cot tien/trang thai thu tien tren 1
-- hoa don DA CO tien thu hoac da khac "Chua thu" (sua truoc do — vd them
-- ghi_chu — khong dang ghi log); XOA thi luon ghi neu da co tien.
-- luong_da_tra: moi dong deu la "da tra tien that" theo dung ban chat bang
-- nay — ghi log MOI lan sua/xoa, khong dieu kien gi them.
-- ============================================================================

create or replace function ghi_nhat_ky_hoa_don_xuat()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'DELETE' then
    if coalesce(old.so_tien_da_thu, 0) > 0 or old.trang_thai_thanh_toan <> 'Chưa thu' then
      perform ghi_nhat_ky('hoa_don_xuat', old.id, 'xoa_hoa_don_da_co_tien_thu', null, to_jsonb(old), null);
    end if;
    return old;
  end if;

  if (coalesce(old.so_tien_da_thu, 0) > 0 or old.trang_thai_thanh_toan <> 'Chưa thu')
     and (
       new.tong_tien_truoc_thue is distinct from old.tong_tien_truoc_thue
       or new.vat_percent is distinct from old.vat_percent
       or new.so_tien_da_thu is distinct from old.so_tien_da_thu
       or new.trang_thai_thanh_toan is distinct from old.trang_thai_thanh_toan
       or new.khach_hang_id is distinct from old.khach_hang_id
       or new.so_hoa_don is distinct from old.so_hoa_don
     )
  then
    perform ghi_nhat_ky('hoa_don_xuat', new.id, 'sua_hoa_don_da_co_tien_thu', null, to_jsonb(old), to_jsonb(new));
  end if;
  return new;
end;
$$;

drop trigger if exists after_hdx_ghi_nhat_ky on hoa_don_xuat;
create trigger after_hdx_ghi_nhat_ky
  after update or delete on hoa_don_xuat
  for each row execute function ghi_nhat_ky_hoa_don_xuat();

create or replace function ghi_nhat_ky_luong_da_tra()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'DELETE' then
    perform ghi_nhat_ky('luong_da_tra', old.id, 'xoa_luong_da_tra', null, to_jsonb(old), null);
    return old;
  end if;
  perform ghi_nhat_ky('luong_da_tra', new.id, 'sua_luong_da_tra', null, to_jsonb(old), to_jsonb(new));
  return new;
end;
$$;

drop trigger if exists after_ldt_ghi_nhat_ky on luong_da_tra;
create trigger after_ldt_ghi_nhat_ky
  after update or delete on luong_da_tra
  for each row execute function ghi_nhat_ky_luong_da_tra();
