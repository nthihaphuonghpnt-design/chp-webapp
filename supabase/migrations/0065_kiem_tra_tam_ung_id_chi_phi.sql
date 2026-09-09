-- ============================================================================
-- Trigger kiem tra tam_ung_id hop le tren phat_sinh_chi_phi/don_thue_ngoai —
-- tach rieng khoi 0062 vi can cot tam_ung_giai_chi.phieu_quyet_toan_id (them o
-- 0064) da ton tai truoc khi tao duoc.
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
  v_phieu uuid;
begin
  if new.tam_ung_id is not null then
    select don_hang_id, phieu_quyet_toan_id into v_don_hang, v_phieu
    from tam_ung_giai_chi where id = new.tam_ung_id;

    if v_don_hang is distinct from new.don_hang_id then
      raise exception 'Khoản tạm ứng được chọn không thuộc đơn hàng này';
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
