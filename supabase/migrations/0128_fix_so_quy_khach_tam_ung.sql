-- ============================================================================
-- Sua loi hoi quy: migration 0122 viet lai sync_so_quy_tam_ung() va lam MAT quy
-- tac cua 0035 cho doi tuong 'Khách hàng':
--   khach tam ung  = tien VAO  (Thu)
--   hoan lai khach = tien RA   (Chi)
-- Tu 0122, moi khoan 'Tạm ứng' (ke ca cua khach) bi ghi 'Chi'.
--
-- Nen chay cau SELECT nay TRUOC de xem se doi bao nhieu dong:
--   select s.ngay, s.loai_so, s.loai_giao_dich, s.so_tien, t.loai
--   from so_quy s join tam_ung_giai_chi t on t.id = s.nguon_id
--   where s.nguon_bang = 'tam_ung_giai_chi' and t.doi_tuong = 'Khách hàng'
--     and s.loai_giao_dich <> case when t.loai = 'Tạm ứng' then 'Thu' else 'Chi' end
--   order by s.ngay;
-- ============================================================================

begin;

create or replace function sync_so_quy_tam_ung()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_loai_gd text;
begin
  if TG_OP = 'DELETE' then
    delete from so_quy where nguon_bang = 'tam_ung_giai_chi' and nguon_id = old.id;
    return old;
  end if;
  delete from so_quy where nguon_bang = 'tam_ung_giai_chi' and nguon_id = new.id;
  if new.trang_thai = 'Đã duyệt' and coalesce(new.so_tien, 0) > 0
     and new.phuong_thuc in ('Tiền mặt', 'Tài khoản công ty') then
    v_loai_gd := case
      when new.doi_tuong = 'Khách hàng' and new.loai = 'Tạm ứng' then 'Thu'
      when new.doi_tuong = 'Khách hàng' then 'Chi'
      when new.loai = 'Tạm ứng' then 'Chi'
      else 'Thu'
    end;
    insert into so_quy (loai_so, loai_giao_dich, so_tien, ngay, noi_dung, nguon_bang, nguon_id)
    values (
      new.phuong_thuc, v_loai_gd, new.so_tien, new.ngay_thuc_hien,
      new.loai || ' - ' || coalesce(new.so_phieu, ''),
      'tam_ung_giai_chi', new.id
    );
  end if;
  return new;
end;
$$;

-- Sua lai cac dong so quy da ghi sai chieu.
update so_quy s
set loai_giao_dich = case when t.loai = 'Tạm ứng' then 'Thu' else 'Chi' end
from tam_ung_giai_chi t
where s.nguon_bang = 'tam_ung_giai_chi'
  and s.nguon_id = t.id
  and t.doi_tuong = 'Khách hàng'
  and s.loai_giao_dich <> case when t.loai = 'Tạm ứng' then 'Thu' else 'Chi' end;

commit;
