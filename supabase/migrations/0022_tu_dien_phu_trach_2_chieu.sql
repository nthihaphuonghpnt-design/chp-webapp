-- ============================================================================
-- Tu dong dien Hien truong phu trach / Chung tu phu trach ngay tu lan dau
-- nguoi cua phong ban do dong gop du lieu cho don hang (khong can doi den
-- luc xac nhan hoan thanh) — chi dien khi con dang trong (khong ghi de).
-- ============================================================================

create or replace function auto_dien_phu_trach()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  my_id uuid;
  my_pb text;
begin
  select nv.id, pb.ten into my_id, my_pb
  from nhan_vien nv join phong_ban pb on pb.id = nv.phong_ban_id
  where nv.auth_user_id = auth.uid();

  if my_pb = 'Hiện trường' then
    update don_hang set hien_truong_phu_trach_id = coalesce(hien_truong_phu_trach_id, my_id)
    where id = new.don_hang_id and hien_truong_phu_trach_id is null;
  elsif my_pb = 'Chứng từ' then
    update don_hang set chung_tu_phu_trach_id = coalesce(chung_tu_phu_trach_id, my_id)
    where id = new.don_hang_id and chung_tu_phu_trach_id is null;
  end if;
  return new;
end;
$$;

drop trigger if exists after_ctvc_dien_phu_trach on chi_tiet_van_chuyen;
create trigger after_ctvc_dien_phu_trach
  after insert on chi_tiet_van_chuyen
  for each row execute function auto_dien_phu_trach();

drop trigger if exists after_tk_dien_phu_trach on to_khai_hai_quan;
create trigger after_tk_dien_phu_trach
  after insert on to_khai_hai_quan
  for each row execute function auto_dien_phu_trach();

drop trigger if exists after_psc_dien_phu_trach on phat_sinh_chi_phi;
create trigger after_psc_dien_phu_trach
  after insert on phat_sinh_chi_phi
  for each row execute function auto_dien_phu_trach();
