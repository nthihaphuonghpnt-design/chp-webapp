-- ============================================================================
-- Dieu chinh quyen Module A: Sale, Chung tu, Giam doc deu duoc tao/sua thong tin
-- lo hang (B1) — vi day la nhung nguoi tiep nhan thong tin lo hang tu khach hang.
-- Hien truong van chi duoc xac nhan hoan thanh phan hien truong (khong doi).
-- ============================================================================

drop policy if exists "don_hang_insert" on don_hang;
create policy "don_hang_insert" on don_hang for insert to authenticated
  with check (current_phong_ban() in ('Sale', 'Chứng từ', 'Giám đốc'));

drop policy if exists "don_hang_update" on don_hang;
create policy "don_hang_update" on don_hang for update to authenticated
  using (current_phong_ban() in ('Sale', 'Hiện trường', 'Chứng từ', 'Giám đốc'));

create or replace function enforce_don_hang_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  role text := current_phong_ban();
begin
  if role = 'Hiện trường' then
    if (to_jsonb(new) - 'ops_xac_nhan' - 'trang_thai' - 'updated_at')
       is distinct from (to_jsonb(old) - 'ops_xac_nhan' - 'trang_thai' - 'updated_at') then
      raise exception 'Hiện trường chỉ được xác nhận hoàn thành phần hiện trường.';
    end if;
  elsif role in ('Sale', 'Chứng từ', 'Giám đốc') then
    if new.ops_xac_nhan is distinct from old.ops_xac_nhan then
      raise exception 'Chỉ Hiện trường mới được xác nhận hoàn thành phần hiện trường.';
    end if;
  else
    raise exception 'Không có quyền sửa đơn hàng.';
  end if;

  if new.ops_xac_nhan and new.cs_xac_nhan then
    new.trang_thai := 'Hoàn tất';
  end if;

  return new;
end;
$$;
