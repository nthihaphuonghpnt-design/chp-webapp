-- ============================================================================
-- Ra soat truoc nghiem thu: 3 bang con anh huong TRUC TIEP den doanh
-- thu/chi phi tren hoa don nhung chua co audit log — phu_thu (cong thang vao
-- hoa don xuat), chi_phi_giao_nhan (chi phi giao nhan tinh luong/hoa hong),
-- bang_gia_khach_hang (gia thoa thuan dung de goi y xuat hoa don sau nay).
-- Cung pattern voi 0091/0096.
-- ============================================================================

create or replace function ghi_nhat_ky_phu_thu()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'DELETE' then
    perform ghi_nhat_ky('phu_thu', old.id, 'xoa_phu_thu', null, to_jsonb(old), null);
    return old;
  end if;
  perform ghi_nhat_ky('phu_thu', new.id, 'sua_phu_thu', null, to_jsonb(old), to_jsonb(new));
  return new;
end;
$$;

drop trigger if exists after_pt_ghi_nhat_ky on phu_thu;
create trigger after_pt_ghi_nhat_ky
  after update or delete on phu_thu
  for each row execute function ghi_nhat_ky_phu_thu();

create or replace function ghi_nhat_ky_chi_phi_giao_nhan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'DELETE' then
    perform ghi_nhat_ky('chi_phi_giao_nhan', old.id, 'xoa_chi_phi_giao_nhan', null, to_jsonb(old), null);
    return old;
  end if;
  perform ghi_nhat_ky('chi_phi_giao_nhan', new.id, 'sua_chi_phi_giao_nhan', null, to_jsonb(old), to_jsonb(new));
  return new;
end;
$$;

drop trigger if exists after_cpgn_ghi_nhat_ky on chi_phi_giao_nhan;
create trigger after_cpgn_ghi_nhat_ky
  after update or delete on chi_phi_giao_nhan
  for each row execute function ghi_nhat_ky_chi_phi_giao_nhan();

create or replace function ghi_nhat_ky_bang_gia_khach_hang()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'DELETE' then
    perform ghi_nhat_ky('bang_gia_khach_hang', old.id, 'xoa_bang_gia_khach_hang', null, to_jsonb(old), null);
    return old;
  end if;
  perform ghi_nhat_ky('bang_gia_khach_hang', new.id, 'sua_bang_gia_khach_hang', null, to_jsonb(old), to_jsonb(new));
  return new;
end;
$$;

drop trigger if exists after_bgkh_ghi_nhat_ky on bang_gia_khach_hang;
create trigger after_bgkh_ghi_nhat_ky
  after update or delete on bang_gia_khach_hang
  for each row execute function ghi_nhat_ky_bang_gia_khach_hang();
