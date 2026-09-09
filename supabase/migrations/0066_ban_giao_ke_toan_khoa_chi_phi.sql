-- ============================================================================
-- "Da ban giao Ke toan" — moc rieng do Ke toan/Giam doc tu danh dau, TACH BIET
-- hoan toan voi ops_xac_nhan (Hien truong tu xac nhan) / cs_xac_nhan (Chung tu
-- tu xac nhan). Da audit: khong dung lai duoc cs_xac_nhan lam moc nay vi
-- khong phai lo hang nao cung can ca Hien truong lan Chung tu xac nhan — co
-- lo chi lien quan 1 trong 2, cs_xac_nhan co the khong bao gio len true.
--
-- Sau khi danh dau, Hien truong/Dieu phoi/Chung tu KHONG con them/sua duoc
-- chi phi/thue ngoai cua don hang do (DELETE von da bi chan rieng cho Ke toan
-- tu truoc, khong can dong toi). Ke toan/Giam doc khong bi anh huong.
-- ============================================================================

alter table don_hang add column if not exists da_ban_giao_ke_toan boolean not null default false;
alter table don_hang add column if not exists ngay_ban_giao_ke_toan timestamptz;
alter table don_hang add column if not exists nguoi_ban_giao_ke_toan_id uuid references nhan_vien(id);

create or replace function enforce_ban_giao_ke_toan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.da_ban_giao_ke_toan is distinct from old.da_ban_giao_ke_toan then
    if current_phong_ban() not in ('Kế toán', 'Giám đốc') then
      raise exception 'Chỉ Kế toán/Giám đốc được đánh dấu bàn giao Kế toán';
    end if;
    if new.da_ban_giao_ke_toan then
      new.ngay_ban_giao_ke_toan := now();
      new.nguoi_ban_giao_ke_toan_id := (select id from nhan_vien where auth_user_id = auth.uid());
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists before_dh_ban_giao_ke_toan on don_hang;
create trigger before_dh_ban_giao_ke_toan
  before update of da_ban_giao_ke_toan on don_hang
  for each row execute function enforce_ban_giao_ke_toan();

-- ----------------------------------------------------------------------------
-- phat_sinh_chi_phi: chan them moi tu Hien truong/Dieu phoi/Chung tu khi don
-- hang da ban giao. Ke toan khong bi anh huong (van insert binh thuong).
-- ----------------------------------------------------------------------------
drop policy if exists "psc_insert" on phat_sinh_chi_phi;
create policy "psc_insert" on phat_sinh_chi_phi for insert to authenticated
  with check (
    current_phong_ban() = 'Kế toán'
    or (
      current_phong_ban() in ('Hiện trường', 'Điều phối', 'Chứng từ')
      and not coalesce((select da_ban_giao_ke_toan from don_hang where id = don_hang_id), false)
    )
  );

create or replace function enforce_phat_sinh_chi_phi_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  role text := current_phong_ban();
  v_da_ban_giao boolean;
begin
  if role = 'Kế toán' then
    return new;
  elsif role = 'Sale' then
    if (to_jsonb(new) - 'gia_ban_sell' - 'updated_at') is distinct from (to_jsonb(old) - 'gia_ban_sell' - 'updated_at') then
      raise exception 'Sale chỉ được sửa giá bán (sell).';
    end if;
  elsif role in ('Hiện trường', 'Điều phối', 'Chứng từ') then
    select da_ban_giao_ke_toan into v_da_ban_giao from don_hang where id = old.don_hang_id;
    if coalesce(v_da_ban_giao, false) then
      raise exception 'Đơn hàng đã bàn giao Kế toán, không thể sửa chi phí — liên hệ Kế toán.';
    end if;
    if old.trang_thai = 'Đã duyệt' then
      raise exception 'Chi phí đã được duyệt, không thể sửa.';
    end if;
    if new.gia_ban_sell is distinct from old.gia_ban_sell then
      raise exception 'Không có quyền sửa giá bán (sell).';
    end if;
    if new.trang_thai in ('Đã duyệt', 'Từ chối') then
      raise exception 'Không có quyền duyệt/từ chối chi phí.';
    end if;
    if new.tinh_trang_thanh_toan is distinct from old.tinh_trang_thanh_toan
       or new.so_tien_da_thanh_toan is distinct from old.so_tien_da_thanh_toan then
      raise exception 'Không có quyền cập nhật tình trạng thanh toán.';
    end if;
  else
    raise exception 'Không có quyền sửa chi phí.';
  end if;
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- don_thue_ngoai: cung logic nhu tren.
-- ----------------------------------------------------------------------------
drop policy if exists "dtn_insert" on don_thue_ngoai;
create policy "dtn_insert" on don_thue_ngoai for insert to authenticated
  with check (
    current_phong_ban() = 'Kế toán'
    or (
      current_phong_ban() in ('Hiện trường', 'Điều phối')
      and not coalesce((select da_ban_giao_ke_toan from don_hang where id = don_hang_id), false)
    )
  );

create or replace function enforce_don_thue_ngoai_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  role text := current_phong_ban();
  v_da_ban_giao boolean;
begin
  if role = 'Kế toán' then
    return new;
  elsif role in ('Hiện trường', 'Điều phối') then
    select da_ban_giao_ke_toan into v_da_ban_giao from don_hang where id = old.don_hang_id;
    if coalesce(v_da_ban_giao, false) then
      raise exception 'Đơn hàng đã bàn giao Kế toán, không thể sửa — liên hệ Kế toán.';
    end if;
    if old.trang_thai = 'Đã duyệt' then
      raise exception 'Đơn thuê ngoài đã được duyệt, không thể sửa.';
    end if;
    if new.trang_thai in ('Đã duyệt', 'Từ chối') then
      raise exception 'Không có quyền duyệt/từ chối.';
    end if;
  else
    raise exception 'Không có quyền sửa.';
  end if;
  return new;
end;
$$;

grant select (da_ban_giao_ke_toan, ngay_ban_giao_ke_toan, nguoi_ban_giao_ke_toan_id) on don_hang to authenticated;
