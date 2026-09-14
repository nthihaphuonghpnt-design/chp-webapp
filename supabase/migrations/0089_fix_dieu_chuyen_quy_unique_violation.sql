-- ============================================================================
-- Fix loi phat hien qua QA truc tiep tren production: bam "+ Chuyen quy noi
-- bo" -> Luu bi loi "duplicate key value violates unique constraint
-- so_quy_nguon_bang_nguon_id_key".
--
-- Nguyen nhan: sync_so_quy_dieu_chuyen() (migration 0086) insert 2 dong vao
-- so_quy cho 1 lan chuyen quy, CA 2 DONG DEU DUNG nguon_bang = 'dieu_chuyen_quy'
-- va CUNG nguon_id = new.id — vi pham unique (nguon_bang, nguon_id) da dinh
-- nghia tu migration 0034. Tinh nang nay bi loi ngay tu lan insert dau tien,
-- chua bao gio chay duoc tren production.
--
-- Fix: dung 2 gia tri nguon_bang rieng cho 2 chan cua giao dich
-- ('dieu_chuyen_quy_no' = chan Chi/nguon, 'dieu_chuyen_quy_co' = chan Thu/
-- dich), van giu chung nguon_id = dieu_chuyen_quy.id de xoa-roi-tao-lai dung
-- ca 2 dong khi update/delete.
-- ============================================================================

create or replace function sync_so_quy_dieu_chuyen()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'DELETE' then
    delete from so_quy where nguon_bang in ('dieu_chuyen_quy_no', 'dieu_chuyen_quy_co') and nguon_id = old.id;
    return old;
  end if;
  delete from so_quy where nguon_bang in ('dieu_chuyen_quy_no', 'dieu_chuyen_quy_co') and nguon_id = new.id;
  if new.chieu = 'Ngân hàng → Tiền mặt' then
    insert into so_quy (loai_so, loai_giao_dich, so_tien, ngay, noi_dung, nguon_bang, nguon_id) values
      ('Tài khoản công ty', 'Chi', new.so_tien, new.ngay, coalesce('Chuyển quỹ nội bộ: ' || new.ghi_chu, 'Chuyển quỹ nội bộ: rút tiền về quỹ tiền mặt'), 'dieu_chuyen_quy_no', new.id),
      ('Tiền mặt', 'Thu', new.so_tien, new.ngay, coalesce('Chuyển quỹ nội bộ: ' || new.ghi_chu, 'Chuyển quỹ nội bộ: rút tiền về quỹ tiền mặt'), 'dieu_chuyen_quy_co', new.id);
  else
    insert into so_quy (loai_so, loai_giao_dich, so_tien, ngay, noi_dung, nguon_bang, nguon_id) values
      ('Tiền mặt', 'Chi', new.so_tien, new.ngay, coalesce('Chuyển quỹ nội bộ: ' || new.ghi_chu, 'Chuyển quỹ nội bộ: nộp tiền mặt vào ngân hàng'), 'dieu_chuyen_quy_no', new.id),
      ('Tài khoản công ty', 'Thu', new.so_tien, new.ngay, coalesce('Chuyển quỹ nội bộ: ' || new.ghi_chu, 'Chuyển quỹ nội bộ: nộp tiền mặt vào ngân hàng'), 'dieu_chuyen_quy_co', new.id);
  end if;
  return new;
end;
$$;
