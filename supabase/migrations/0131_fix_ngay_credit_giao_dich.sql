-- ============================================================================
-- Bo sung yeu cau V4 Phan I.1.3 / III (2026-11-27): 2 dong "Phat sinh credit"
-- (Dac Ung 250.000, Dai Hung Thinh 500.000) bi vao So quy ngay Ke toan NHAP
-- LIEU (23/11/2026) thay vi ngay giao dich that (05/12/2025 va 05/09/2025),
-- lam So quy thang 11/2026 bi cong nham 2 khoan Thu khong phai cua thang nay.
--
-- Nguyen nhan: sync_so_quy_credit_giao_dich() dung "current_date" (ngay
-- INSERT) lam ngay So quy cho MOI credit_giao_dich, khac voi hoa_don_xuat/
-- tam_ung_giai_chi (da dung dung ngay giao dich that tu truoc). credit_giao_dich
-- chua co cot luu ngay giao dich that.
--
-- Fix pham vi hep (CHU Y — phien lam viec song song khac dang sua
-- thu_tien_hoa_don_xuat/thanh_toan_hoa_don_dau_vao cung luc, nen KHONG dong
-- cham toi 2 ham do o day de tranh tao overload/xung dot; viec cho phep nhap
-- ngay giao dich that qua UI luc "Thu tien"/"Thanh toan" (them tham so vao 2
-- RPC do) de lai cho sau):
--   - Them cot ngay_giao_dich (mac dinh current_date — khong doi hanh vi cho
--     cac dong moi binh thuong).
--   - Sua trigger dung dung cot nay, mo rong chay ca luc UPDATE (de sua lai
--     ngay cho du lieu cu ma khong can insert lai dong moi).
--   - Backfill dung 2 dong da biet ve ngay giao dich that.
-- ============================================================================

alter table credit_giao_dich add column if not exists ngay_giao_dich date not null default current_date;

create or replace function sync_so_quy_credit_giao_dich()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_chieu text;
begin
  if TG_OP = 'DELETE' then
    delete from so_quy where nguon_bang = 'credit_giao_dich' and nguon_id = old.id;
    return old;
  end if;

  if new.doi_tuong = 'Khách hàng' then
    v_chieu := case new.loai when 'Phát sinh' then 'Thu' when 'Cấn trừ' then 'Chi' else 'Chi' end;
  else
    v_chieu := case new.loai when 'Phát sinh' then 'Chi' when 'Cấn trừ' then 'Thu' else 'Thu' end;
  end if;

  delete from so_quy where nguon_bang = 'credit_giao_dich' and nguon_id = new.id;
  insert into so_quy (loai_so, loai_giao_dich, so_tien, ngay, noi_dung, nguon_bang, nguon_id)
  values (
    new.phuong_thuc, v_chieu, new.so_tien, new.ngay_giao_dich,
    new.loai || ' credit — ' || coalesce(new.ly_do, ''),
    'credit_giao_dich', new.id
  );
  return new;
end;
$$;

drop trigger if exists after_cgd_sync_so_quy on credit_giao_dich;
create trigger after_cgd_sync_so_quy
  after insert or update on credit_giao_dich
  for each row execute function sync_so_quy_credit_giao_dich();

-- Backfill 2 dong da biet (P2 "Phat sinh credit" 23/11/2026, giao dich that
-- 05/09/2025 va 05/12/2025).
update credit_giao_dich set ngay_giao_dich = '2025-12-05' where id = '9e3d7404-5a10-496e-830a-f71b448f4c2f';
update credit_giao_dich set ngay_giao_dich = '2025-09-05' where id = '38aab2e3-62e6-4c99-9ddd-379fd7018591';
