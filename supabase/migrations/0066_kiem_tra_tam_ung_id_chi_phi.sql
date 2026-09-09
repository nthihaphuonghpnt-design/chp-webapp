-- ============================================================================
-- Trigger kiem tra tam_ung_id hop le tren phat_sinh_chi_phi/don_thue_ngoai —
-- tach rieng khoi 0062 vi can cot tam_ung_giai_chi.phieu_quyet_toan_id (them o
-- 0065 — Phieu quyet toan) da ton tai truoc khi tao duoc.
--
-- LUU Y: nguon_thanh_toan = 'Tam ung nhan vien' VOI tam_ung_id = null la HOP
-- LE (nguoi nhap tu bo tien chi truoc, don hang chua tung co tam ung nao —
-- xem 0062). Chi kiem tra khi tam_ung_id THUC SU duoc gan (khong bat buoc no
-- phai duoc gan).
-- ============================================================================

create or replace function kiem_tra_tam_ung_id_hop_le()
returns trigger
language plpgsql
as $$
declare
  v_don_hang uuid;
  v_nhan_vien uuid;
  v_phieu uuid;
begin
  if new.tam_ung_id is not null then
    select don_hang_id, nhan_vien_id, phieu_quyet_toan_id into v_don_hang, v_nhan_vien, v_phieu
    from tam_ung_giai_chi where id = new.tam_ung_id;

    if v_don_hang is distinct from new.don_hang_id then
      raise exception 'Khoản tạm ứng được chọn không thuộc đơn hàng này';
    end if;
    if v_nhan_vien is distinct from new.nguoi_nhap_id then
      raise exception 'Khoản tạm ứng được chọn không thuộc nhân viên đang nhập chi phí này';
    end if;
    if v_phieu is not null then
      raise exception 'Khoản tạm ứng này đã được đưa vào phiếu quyết toán, không thể dùng thêm';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists before_psc_kiem_tra_tam_ung on phat_sinh_chi_phi;
create trigger before_psc_kiem_tra_tam_ung
  before insert or update on phat_sinh_chi_phi
  for each row execute function kiem_tra_tam_ung_id_hop_le();

drop trigger if exists before_dtn_kiem_tra_tam_ung on don_thue_ngoai;
create trigger before_dtn_kiem_tra_tam_ung
  before insert or update on don_thue_ngoai
  for each row execute function kiem_tra_tam_ung_id_hop_le();

-- ----------------------------------------------------------------------------
-- Tang cuong lai tu_dong_nguon_thanh_toan_hien_truong() (0062): luc 0062 chay,
-- cot tam_ung_giai_chi.phieu_quyet_toan_id chua ton tai nen ham do KHONG loc
-- duoc tam ung "da bi khoa". Gio 0065 (Phieu quyet toan) da them cot do (va
-- da co the co phieu quyet toan that su ton tai), create or replace lai dung
-- 1 lan de bo sung dieu kien nay — khong doi gi khac, giu nguyen logic con lai.
-- ----------------------------------------------------------------------------
create or replace function tu_dong_nguon_thanh_toan_hien_truong()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phong_ban text;
  v_tam_ung_id uuid;
begin
  if new.nguon_thanh_toan is not null then
    return new;
  end if;

  select pb.ten into v_phong_ban
  from nhan_vien nv join phong_ban pb on pb.id = nv.phong_ban_id
  where nv.id = new.nguoi_nhap_id;

  if v_phong_ban not in ('Hiện trường', 'Chứng từ') then
    return new;
  end if;

  select id into v_tam_ung_id
  from tam_ung_giai_chi
  where don_hang_id = new.don_hang_id
    and nhan_vien_id = new.nguoi_nhap_id
    and loai = 'Tạm ứng'
    and trang_thai = 'Đã duyệt'
    and phieu_quyet_toan_id is null
  order by ngay_thuc_hien asc, created_at asc
  limit 1;

  new.nguon_thanh_toan := 'Tạm ứng nhân viên';
  new.tam_ung_id := v_tam_ung_id;
  return new;
end;
$$;
