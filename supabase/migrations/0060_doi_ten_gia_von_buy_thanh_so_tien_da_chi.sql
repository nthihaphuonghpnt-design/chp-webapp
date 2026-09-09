-- ============================================================================
-- Doi ten gia_von_buy -> so_tien_da_chi tren phat_sinh_chi_phi va don_thue_ngoai
-- (thong nhat thuat ngu: "Gia von" khong con phu hop vi Hien truong khong lam
-- viec voi khai niem gia von/kinh doanh, chi chi tien thuc te cho lo hang).
--
-- RENAME COLUMN giu nguyen toan bo du lieu, khong DROP/tao lai. Postgres tu
-- dong cap nhat bieu thuc cua 2 cot generated (tien_thue, tong_tien) va moi
-- CHECK constraint/index lien quan — khong can dong toi.
--
-- Chi 1 function can sua tay vi tham chieu ten cot trong than PL/pgSQL (insert
-- co liet ke ten cot, khong tu cap nhat theo rename): sync_thue_chi_ho_tu_to_khai().
-- Da audit toan bo 58 migration + 16 file src/: khong con function/trigger nao
-- khac tham chieu gia_von_buy. enforce_phat_sinh_chi_phi_update() (0017) dung
-- to_jsonb(...) - 'gia_ban_sell' nen khong bi anh huong. tong_sell_khong_chi_ho()
-- (0028) chi dung gia_ban_sell, khong dung gia_von_buy, khong bi anh huong.
-- ============================================================================

alter table phat_sinh_chi_phi rename column gia_von_buy to so_tien_da_chi;
alter table don_thue_ngoai rename column gia_von_buy to so_tien_da_chi;

create or replace function sync_thue_chi_ho_tu_to_khai()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ma_tax002 uuid;
  ma_tax001 uuid;
  ngay date;
begin
  if TG_OP = 'DELETE' then
    delete from phat_sinh_chi_phi where to_khai_id = old.id;
    return old;
  end if;

  delete from phat_sinh_chi_phi where to_khai_id = new.id;

  if new.ai_dong_thue = 'CHP đóng hộ' then
    select id into ma_tax002 from loai_chi_phi where ma_loai_chi_phi = 'TAX002' limit 1;
    select id into ma_tax001 from loai_chi_phi where ma_loai_chi_phi = 'TAX001' limit 1;
    ngay := coalesce(new.ngay_thong_quan, new.ngay_mo_to_khai, current_date);

    if coalesce(new.thue_nhap_khau, 0) > 0 then
      insert into phat_sinh_chi_phi
        (don_hang_id, loai_chi_phi_id, so_tien_da_chi, gia_ban_sell, chi_ho, noi_bo, trang_thai,
         ngay_phat_sinh, to_khai_id, nguon_tu_dong, ghi_chu)
      values
        (new.don_hang_id, ma_tax002, new.thue_nhap_khau, new.thue_nhap_khau, true, false, 'Đã duyệt',
         ngay, new.id, 'to_khai_thue_nk', 'Tự động từ Tờ khai hải quan (CHP đóng hộ)');
    end if;

    if coalesce(new.thue_vat_nk, 0) > 0 then
      insert into phat_sinh_chi_phi
        (don_hang_id, loai_chi_phi_id, so_tien_da_chi, gia_ban_sell, chi_ho, noi_bo, trang_thai,
         ngay_phat_sinh, to_khai_id, nguon_tu_dong, ghi_chu)
      values
        (new.don_hang_id, ma_tax001, new.thue_vat_nk, new.thue_vat_nk, true, false, 'Đã duyệt',
         ngay, new.id, 'to_khai_thue_vat', 'Tự động từ Tờ khai hải quan (CHP đóng hộ)');
    end if;

    if coalesce(new.thue_khac, 0) > 0 then
      insert into phat_sinh_chi_phi
        (don_hang_id, so_tien_da_chi, gia_ban_sell, chi_ho, noi_bo, trang_thai,
         ngay_phat_sinh, to_khai_id, nguon_tu_dong, ghi_chu)
      values
        (new.don_hang_id, new.thue_khac, new.thue_khac, true, false, 'Đã duyệt',
         ngay, new.id, 'to_khai_thue_khac', 'Tự động từ Tờ khai hải quan - thuế khác (CHP đóng hộ)');
    end if;
  end if;

  return new;
end;
$$;
