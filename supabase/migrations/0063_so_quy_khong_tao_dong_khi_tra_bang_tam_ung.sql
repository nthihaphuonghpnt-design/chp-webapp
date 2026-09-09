-- ============================================================================
-- Chi phi/thue ngoai duoc tra bang "Tam ung nhan vien" khong duoc tao them
-- dong Chi trong so_quy — tien da roi quy that luc duyet tam ung (trigger
-- sync_so_quy_tam_ung, khong doi). Chi them dung 1 dieu kien loai tru, giu
-- nguyen toan bo logic con lai cua 2 trigger da co (0034).
--
-- coalesce(new.nguon_thanh_toan, 'Tiền mặt') dam bao MOI dong du lieu cu (chua
-- tung co cot nay, luon NULL) tiep tuc fire so_quy dung y het truoc gio —
-- khong dong du lieu lich su nao bi anh huong.
-- ============================================================================

create or replace function sync_so_quy_chi_phi()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'DELETE' then
    delete from so_quy where nguon_bang = 'phat_sinh_chi_phi' and nguon_id = old.id;
    return old;
  end if;
  delete from so_quy where nguon_bang = 'phat_sinh_chi_phi' and nguon_id = new.id;
  if coalesce(new.so_tien_da_thanh_toan, 0) > 0
     and new.phuong_thuc_thanh_toan is not null
     and coalesce(new.nguon_thanh_toan, 'Tiền mặt') <> 'Tạm ứng nhân viên'
  then
    insert into so_quy (loai_so, loai_giao_dich, so_tien, ngay, noi_dung, nguon_bang, nguon_id)
    values (new.phuong_thuc_thanh_toan, 'Chi', new.so_tien_da_thanh_toan,
            coalesce(new.ngay_phat_sinh, current_date), 'Thanh toán chi phí phát sinh',
            'phat_sinh_chi_phi', new.id);
  end if;
  return new;
end;
$$;

create or replace function sync_so_quy_thue_ngoai()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'DELETE' then
    delete from so_quy where nguon_bang = 'don_thue_ngoai' and nguon_id = old.id;
    return old;
  end if;
  delete from so_quy where nguon_bang = 'don_thue_ngoai' and nguon_id = new.id;
  if coalesce(new.so_tien_da_thanh_toan, 0) > 0
     and new.phuong_thuc_thanh_toan is not null
     and coalesce(new.nguon_thanh_toan, 'Tiền mặt') <> 'Tạm ứng nhân viên'
  then
    insert into so_quy (loai_so, loai_giao_dich, so_tien, ngay, noi_dung, nguon_bang, nguon_id)
    values (new.phuong_thuc_thanh_toan, 'Chi', new.so_tien_da_thanh_toan,
            coalesce(new.ngay_thue, current_date), 'Thanh toán thuê dịch vụ ngoài',
            'don_thue_ngoai', new.id);
  end if;
  return new;
end;
$$;
