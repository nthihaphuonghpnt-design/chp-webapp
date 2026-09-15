-- ============================================================================
-- Ra soat truoc nghiem thu: nhan_vien la bang chua truong nhay cam nhat he
-- thong (luong_co_dinh, muc_dong_bhxh) nhung chua co audit log cho UPDATE/
-- DELETE — chi co khoa SELECT cot luong (0039/0057/0058), khong ai ghi lai
-- LICH SU thay doi luong. Them trigger theo dung pattern da dung o migration
-- 0091 (ghi_nhat_ky_phat_sinh_chi_phi lam mau). nhat_ky_thao_tac chi Ke
-- toan/Giam doc doc duoc (RLS tu 0067) nen ghi full old/new vao day khong
-- lam ho gi them — ho da xem duoc luong qua RPC luong_cua_nhan_vien() roi.
-- ============================================================================

create or replace function ghi_nhat_ky_nhan_vien()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'DELETE' then
    perform ghi_nhat_ky('nhan_vien', old.id, 'xoa_nhan_vien', null, to_jsonb(old), null);
    return old;
  end if;
  perform ghi_nhat_ky('nhan_vien', new.id, 'sua_nhan_vien', null, to_jsonb(old), to_jsonb(new));
  return new;
end;
$$;

drop trigger if exists after_nv_ghi_nhat_ky on nhan_vien;
create trigger after_nv_ghi_nhat_ky
  after update or delete on nhan_vien
  for each row execute function ghi_nhat_ky_nhan_vien();
