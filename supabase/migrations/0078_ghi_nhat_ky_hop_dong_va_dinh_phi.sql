-- ============================================================================
-- Tiep tuc dot ra soat mo rong (0074-0077): 3 bang con lai duoc yeu cau ra
-- soat (hop dong nhan vien, hop dong khach hang, dinh phi thang thang) deu
-- cho phep Ke toan (+ Chung tu voi hop dong khach hang) sua/xoa KHONG GIOI
-- HAN, khong luu vet gi — giong tinh trang hoa_don_xuat/luong_da_tra truoc
-- 0076. Khac voi cac bang o 0074 (tam_ung_giai_chi/phat_sinh_chi_phi/
-- don_thue_ngoai), o day KHONG co bang tong hop rieng nao bi lech theo khi
-- sua (hop dong chi la ho so tham khao, hien thi rieng; dinh_phi_thang duoc
-- Bao cao doanh thu/loi nhuan TINH LAI TRUC TIEP moi lan xem, khong luu
-- snapshot) — nen ap dung dung Phase 11 cua ke hoach: GHI NHAT KY thay vi
-- khoa cung, de biet AI sua/xoa GI/KHI NAO tren 1 hop dong hoac 1 dong dinh
-- phi da nhap, ma khong lam gian doan viec sua loi chinh ta thong thuong.
--
-- hop_dong_nhan_vien: du lieu luong/chuc vu nhay cam nhat he thong (chi Ke
-- toan/Giam doc xem duoc, xem 0042) — ghi log MOI lan sua/xoa.
-- hop_dong_khach_hang: ghi log MOI lan sua/xoa (Chung tu cung sua duoc).
-- dinh_phi_thang: ghi log khi sua so_tien/dang_hoat_dong cua 1 thang DA QUA
-- (thang_nam < thang hien tai, gio VN) — sua thang hien tai/tuong lai la
-- nhap lieu binh thuong, khong dang ghi log ram.
-- ============================================================================

create or replace function ghi_nhat_ky_hop_dong_nhan_vien()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'DELETE' then
    perform ghi_nhat_ky('hop_dong_nhan_vien', old.id, 'xoa_hop_dong_nhan_vien', null, to_jsonb(old), null);
    return old;
  end if;
  perform ghi_nhat_ky('hop_dong_nhan_vien', new.id, 'sua_hop_dong_nhan_vien', null, to_jsonb(old), to_jsonb(new));
  return new;
end;
$$;

drop trigger if exists after_hdnv_ghi_nhat_ky on hop_dong_nhan_vien;
create trigger after_hdnv_ghi_nhat_ky
  after update or delete on hop_dong_nhan_vien
  for each row execute function ghi_nhat_ky_hop_dong_nhan_vien();

create or replace function ghi_nhat_ky_hop_dong_khach_hang()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'DELETE' then
    perform ghi_nhat_ky('hop_dong_khach_hang', old.id, 'xoa_hop_dong_khach_hang', null, to_jsonb(old), null);
    return old;
  end if;
  perform ghi_nhat_ky('hop_dong_khach_hang', new.id, 'sua_hop_dong_khach_hang', null, to_jsonb(old), to_jsonb(new));
  return new;
end;
$$;

drop trigger if exists after_hdkh_ghi_nhat_ky on hop_dong_khach_hang;
create trigger after_hdkh_ghi_nhat_ky
  after update or delete on hop_dong_khach_hang
  for each row execute function ghi_nhat_ky_hop_dong_khach_hang();

create or replace function ghi_nhat_ky_dinh_phi_thang()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'DELETE' then
    if old.thang_nam < to_char(now() at time zone 'Asia/Ho_Chi_Minh', 'YYYY-MM') then
      perform ghi_nhat_ky('dinh_phi_thang', old.id, 'xoa_dinh_phi_thang_da_qua', null, to_jsonb(old), null);
    end if;
    return old;
  end if;
  if old.thang_nam < to_char(now() at time zone 'Asia/Ho_Chi_Minh', 'YYYY-MM')
     and (new.so_tien is distinct from old.so_tien or new.dang_hoat_dong is distinct from old.dang_hoat_dong)
  then
    perform ghi_nhat_ky('dinh_phi_thang', new.id, 'sua_dinh_phi_thang_da_qua', null, to_jsonb(old), to_jsonb(new));
  end if;
  return new;
end;
$$;

drop trigger if exists after_dpt_ghi_nhat_ky on dinh_phi_thang;
create trigger after_dpt_ghi_nhat_ky
  after update or delete on dinh_phi_thang
  for each row execute function ghi_nhat_ky_dinh_phi_thang();
