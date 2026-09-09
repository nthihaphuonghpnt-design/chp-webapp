-- ============================================================================
-- Chan Hien truong doc truc tiep gia_ban_sell qua API/DB (khong chi an UI).
--
-- Vi toan bo nguoi dung dung chung 1 Postgres role "authenticated" (khong co
-- role rieng theo phong ban), REVOKE cap cot don thuan tren 1 grant toan bang
-- da co KHONG co tac dung — dung lai dung bai hoc tu vu lo luong (0039 sai ky
-- thuat, va lai o 0058): REVOKE toan bang roi GRANT lai dung cot an toan, cot
-- nhay cam (gia_ban_sell) chi doc duoc qua 1 RPC security definer tu kiem tra
-- quyen truoc khi tra ve.
-- ============================================================================

-- Xay danh sach cot GRANT lai TU CHINH information_schema tai thoi diem chay
-- migration, thay vi liet ke tay — liet ke tay da chung minh sai o ban nhap
-- dau tien (thieu tt_thue tren phat_sinh_chi_phi; thieu loai_dich_vu_thue,
-- noi_dung, tinh_trang_thanh_toan, trang_thai, nguoi_nhap_id tren
-- don_thue_ngoai). Cach nay luon dung voi schema THAT tren production tai
-- thoi diem chay, khong phu thuoc tri nho/tai lieu co the da lech.
do $$
declare
  v_cols text;
begin
  select string_agg(quote_ident(column_name), ', ') into v_cols
  from information_schema.columns
  where table_schema = 'public' and table_name = 'phat_sinh_chi_phi'
    and column_name <> 'gia_ban_sell';

  execute 'revoke select on phat_sinh_chi_phi from authenticated';
  execute format('grant select (%s) on phat_sinh_chi_phi to authenticated', v_cols);

  select string_agg(quote_ident(column_name), ', ') into v_cols
  from information_schema.columns
  where table_schema = 'public' and table_name = 'don_thue_ngoai'
    and column_name <> 'gia_ban_sell';

  execute 'revoke select on don_thue_ngoai from authenticated';
  execute format('grant select (%s) on don_thue_ngoai to authenticated', v_cols);
end;
$$;

create or replace function lay_gia_ban_chi_phi(p_ids uuid[])
returns table(id uuid, gia_ban_sell numeric)
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_phong_ban() in ('Kế toán', 'Giám đốc', 'Chứng từ') then
    return query select p.id, p.gia_ban_sell from phat_sinh_chi_phi p where p.id = any(p_ids);
  elsif current_phong_ban() = 'Sale' then
    return query
      select p.id, p.gia_ban_sell
      from phat_sinh_chi_phi p
      join don_hang dh on dh.id = p.don_hang_id
      join nhan_vien nv on nv.id = dh.sale_phu_trach_id
      where p.id = any(p_ids) and nv.auth_user_id = auth.uid();
  end if;
  return;
end;
$$;

grant execute on function lay_gia_ban_chi_phi(uuid[]) to authenticated;

create or replace function lay_gia_ban_thue_ngoai(p_ids uuid[])
returns table(id uuid, gia_ban_sell numeric)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- don_thue_ngoai hien khong co RLS rieng theo Sale (moi phong ban co quyen
  -- xem het) — giu dung nguyen trang, khong tu them han che moi o day.
  if current_phong_ban() in ('Kế toán', 'Giám đốc', 'Chứng từ', 'Sale', 'Điều phối') then
    return query select t.id, t.gia_ban_sell from don_thue_ngoai t where t.id = any(p_ids);
  end if;
  return;
end;
$$;

grant execute on function lay_gia_ban_thue_ngoai(uuid[]) to authenticated;

-- ----------------------------------------------------------------------------
-- Chay sau khi ap dung, xac nhan gia_ban_sell KHONG con doc truc tiep duoc,
-- va cac cot khac VAN doc duoc binh thuong (vd so_tien_da_chi):
--   select has_column_privilege('authenticated', 'phat_sinh_chi_phi', 'gia_ban_sell', 'SELECT'); -- phai la false
--   select has_column_privilege('authenticated', 'don_thue_ngoai', 'gia_ban_sell', 'SELECT');     -- phai la false
--   select has_column_privilege('authenticated', 'phat_sinh_chi_phi', 'so_tien_da_chi', 'SELECT'); -- phai la true
--   select has_column_privilege('authenticated', 'don_thue_ngoai', 'so_tien_da_chi', 'SELECT');    -- phai la true
-- ============================================================================
