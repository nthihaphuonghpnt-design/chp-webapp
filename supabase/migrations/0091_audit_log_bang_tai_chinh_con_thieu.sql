-- ============================================================================
-- Phat hien qua ra soat go-live: nhat_ky_thao_tac (0067) chi duoc gan trigger
-- AFTER UPDATE/DELETE day du cho 8 bang (dieu_chuyen_quy, dinh_phi_thang,
-- hoa_don_dau_vao, hoa_don_xuat, hop_dong_khach_hang, hop_dong_nhan_vien,
-- luong_da_tra, noi_quy_cong_ty) — CAC BANG TAI CHINH QUAN TRONG NHAT
-- (phat_sinh_chi_phi, don_thue_ngoai, tam_ung_giai_chi, phieu_quyet_toan_tam_ung,
-- don_hang) hoan toan CHUA CO audit log day du (chi co ghi_nhat_ky rieng le
-- cho vai hanh dong dac biet nhu "mo_lai"/"duyet voi du lieu thay doi" —
-- KHONG bao quat moi lan sua/xoa thong thuong).
--
-- Dung LAI dung 1 pattern generic da co (xem ghi_nhat_ky_hoa_don_dau_vao):
-- AFTER UPDATE OR DELETE, ghi ca ban ghi TRUOC/SAU dang jsonb. Khong ghi
-- INSERT (dung theo dung quy uoc 8 bang truoc — "tao moi" khong can audit,
-- chi "sua/xoa" moi can, vi du lieu tao moi da nam san trong chinh bang do).
-- ============================================================================

create or replace function ghi_nhat_ky_phat_sinh_chi_phi()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'DELETE' then
    perform ghi_nhat_ky('phat_sinh_chi_phi', old.id, 'xoa_phat_sinh_chi_phi', null, to_jsonb(old), null);
    return old;
  end if;
  perform ghi_nhat_ky('phat_sinh_chi_phi', new.id, 'sua_phat_sinh_chi_phi', null, to_jsonb(old), to_jsonb(new));
  return new;
end;
$$;

drop trigger if exists after_psc_ghi_nhat_ky on phat_sinh_chi_phi;
create trigger after_psc_ghi_nhat_ky
  after update or delete on phat_sinh_chi_phi
  for each row execute function ghi_nhat_ky_phat_sinh_chi_phi();

create or replace function ghi_nhat_ky_don_thue_ngoai()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'DELETE' then
    perform ghi_nhat_ky('don_thue_ngoai', old.id, 'xoa_don_thue_ngoai', null, to_jsonb(old), null);
    return old;
  end if;
  perform ghi_nhat_ky('don_thue_ngoai', new.id, 'sua_don_thue_ngoai', null, to_jsonb(old), to_jsonb(new));
  return new;
end;
$$;

drop trigger if exists after_dtn_ghi_nhat_ky on don_thue_ngoai;
create trigger after_dtn_ghi_nhat_ky
  after update or delete on don_thue_ngoai
  for each row execute function ghi_nhat_ky_don_thue_ngoai();

create or replace function ghi_nhat_ky_tam_ung_giai_chi()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'DELETE' then
    perform ghi_nhat_ky('tam_ung_giai_chi', old.id, 'xoa_tam_ung_giai_chi', null, to_jsonb(old), null);
    return old;
  end if;
  perform ghi_nhat_ky('tam_ung_giai_chi', new.id, 'sua_tam_ung_giai_chi', null, to_jsonb(old), to_jsonb(new));
  return new;
end;
$$;

drop trigger if exists after_tugc_ghi_nhat_ky on tam_ung_giai_chi;
create trigger after_tugc_ghi_nhat_ky
  after update or delete on tam_ung_giai_chi
  for each row execute function ghi_nhat_ky_tam_ung_giai_chi();

-- phieu_quyet_toan_tam_ung: da co ghi_nhat_ky rieng cho "duyet_voi_du_lieu_
-- thay_doi" (0067) — them AFTER UPDATE/DELETE generic de bao quat ca cac
-- lan sua/xoa khac (vd Ke toan sua ghi_chu, huy phieu qua RPC huy_phieu_
-- quyet_toan_tam_ung deu di qua UPDATE trang_thai='Đã hủy').
create or replace function ghi_nhat_ky_phieu_quyet_toan_tam_ung()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'DELETE' then
    perform ghi_nhat_ky('phieu_quyet_toan_tam_ung', old.id, 'xoa_phieu_quyet_toan_tam_ung', null, to_jsonb(old), null);
    return old;
  end if;
  perform ghi_nhat_ky('phieu_quyet_toan_tam_ung', new.id, 'sua_phieu_quyet_toan_tam_ung', null, to_jsonb(old), to_jsonb(new));
  return new;
end;
$$;

drop trigger if exists after_pqt_ghi_nhat_ky on phieu_quyet_toan_tam_ung;
create trigger after_pqt_ghi_nhat_ky
  after update or delete on phieu_quyet_toan_tam_ung
  for each row execute function ghi_nhat_ky_phieu_quyet_toan_tam_ung();

create or replace function ghi_nhat_ky_don_hang()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'DELETE' then
    perform ghi_nhat_ky('don_hang', old.id, 'xoa_don_hang', null, to_jsonb(old), null);
    return old;
  end if;
  perform ghi_nhat_ky('don_hang', new.id, 'sua_don_hang', null, to_jsonb(old), to_jsonb(new));
  return new;
end;
$$;

drop trigger if exists after_dh_ghi_nhat_ky on don_hang;
create trigger after_dh_ghi_nhat_ky
  after update or delete on don_hang
  for each row execute function ghi_nhat_ky_don_hang();
