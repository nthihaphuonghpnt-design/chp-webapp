-- ============================================================================
-- Tu dong sinh Chi phi giao nhan (dung de tinh Bang luong cho Hien
-- truong/Chung tu) khi don hang chuyen sang trang thai "Hoan tat", theo dinh
-- muc co dinh:
--
-- 1) Lam tu cong bo / An toan thuc pham (theo SO BO — lay tu so_luong cua
--    dong phat_sinh_chi_phi co Loai chi phi ten chua "tu cong bo" hoac
--    "an toan thuc pham", cong hoi tat ca dong nhu vay trong don):
--      - Hien truong phu trach: 30.000 / bo
--      - Chung tu phu trach:    20.000 / bo
--
-- 2) Theo container (chi khi Dvt = 'Cont', so cont = don_hang.so_luong),
--    CHI Chung tu phu trach nhan:
--      - Xuat + co keo xe (co dong Chi tiet van chuyen):  50.000 / cont
--      - Nhap (luon luon):                                 70.000 / cont
--      - Nhap + co keo xe: cong them                      +50.000 / cont
--      - Xuat khong keo xe, hoac loai khac Xuat/Nhap:      khong tinh
--
-- Chi chay 1 lan khi trang_thai CHUYEN SANG "Hoan tat" (khong chay lai moi
-- lan sua don da hoan tat), va co kiem tra trung de khong tao lap neu vo
-- tinh chuyen trang thai qua lai "Hoan tat" nhieu lan.
--
-- LUU Y: tu khoa nhan dien "tu cong bo"/"an toan thuc pham" dung ILIKE
-- (khong phan biet hoa/thuong, khop 1 phan chuoi) tren ten Loai chi phi da
-- co san trong Danh muc — neu ten dat khac di (vd viet tat "ATTP" khong kem
-- chu "an toan thuc pham") thi doi ten lai trong Danh muc > Loai chi phi cho
-- khop, hoac bao lai de sua migration.
-- ============================================================================

create or replace function auto_sinh_chi_phi_giao_nhan_hoan_tat()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  so_bo numeric;
  co_keo_xe boolean;
  gia_theo_cont numeric;
  nhan_da_co boolean;
begin
  if new.trang_thai <> 'Hoàn tất' or old.trang_thai = 'Hoàn tất' then
    return new;
  end if;

  -- 1) Lam tu cong bo / An toan thuc pham
  select coalesce(sum(psc.so_luong), 0) into so_bo
  from phat_sinh_chi_phi psc
  join loai_chi_phi lcp on lcp.id = psc.loai_chi_phi_id
  where psc.don_hang_id = new.id
    and psc.trang_thai <> 'Từ chối'
    and (lcp.ten ilike '%tự công bố%' or lcp.ten ilike '%an toàn thực phẩm%' or lcp.ten ilike '%attp%');

  if so_bo > 0 then
    if new.hien_truong_phu_trach_id is not null then
      select exists(
        select 1 from chi_phi_giao_nhan
        where don_hang_id = new.id and nhan_vien_id = new.hien_truong_phu_trach_id
          and loai = 'Làm tự công bố/ATTP (tự động)'
      ) into nhan_da_co;
      if not nhan_da_co then
        insert into chi_phi_giao_nhan (don_hang_id, loai, nhan_vien_id, thanh_tien, ghi_chu)
        values (new.id, 'Làm tự công bố/ATTP (tự động)', new.hien_truong_phu_trach_id, so_bo * 30000,
                format('Tự động: %s bộ x 30.000', so_bo));
      end if;
    end if;

    if new.chung_tu_phu_trach_id is not null then
      select exists(
        select 1 from chi_phi_giao_nhan
        where don_hang_id = new.id and nhan_vien_id = new.chung_tu_phu_trach_id
          and loai = 'Làm tự công bố/ATTP (tự động)'
      ) into nhan_da_co;
      if not nhan_da_co then
        insert into chi_phi_giao_nhan (don_hang_id, loai, nhan_vien_id, thanh_tien, ghi_chu)
        values (new.id, 'Làm tự công bố/ATTP (tự động)', new.chung_tu_phu_trach_id, so_bo * 20000,
                format('Tự động: %s bộ x 20.000', so_bo));
      end if;
    end if;
  end if;

  -- 2) Theo container — chi Chung tu phu trach nhan
  if new.dvt = 'Cont' and coalesce(new.so_luong, 0) > 0 and new.chung_tu_phu_trach_id is not null then
    select exists(select 1 from chi_tiet_van_chuyen where don_hang_id = new.id) into co_keo_xe;

    gia_theo_cont := case
      when new.loai_don_hang = 'Xuất' and co_keo_xe then 50000
      when new.loai_don_hang = 'Nhập' then 70000 + (case when co_keo_xe then 50000 else 0 end)
      else 0
    end;

    if gia_theo_cont > 0 then
      select exists(
        select 1 from chi_phi_giao_nhan
        where don_hang_id = new.id and nhan_vien_id = new.chung_tu_phu_trach_id
          and loai = 'Chi phí giao nhận theo cont (tự động)'
      ) into nhan_da_co;
      if not nhan_da_co then
        insert into chi_phi_giao_nhan (don_hang_id, loai, nhan_vien_id, thanh_tien, ghi_chu)
        values (
          new.id, 'Chi phí giao nhận theo cont (tự động)', new.chung_tu_phu_trach_id, gia_theo_cont * new.so_luong,
          format('Tự động: %s x %s cont%s', gia_theo_cont, new.so_luong, case when co_keo_xe then ' (có kéo xe)' else '' end)
        );
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists after_don_hang_hoan_tat_sinh_chi_phi_giao_nhan on don_hang;
create trigger after_don_hang_hoan_tat_sinh_chi_phi_giao_nhan
  after update on don_hang
  for each row execute function auto_sinh_chi_phi_giao_nhan_hoan_tat();
