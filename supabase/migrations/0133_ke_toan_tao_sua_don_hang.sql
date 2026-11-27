-- ============================================================================
-- Bo sung muc 0 (2026-11-27, 18:06 — "VIEC GAP NHAT"): tai khoan Ke toan
-- (act@chauhoangphat.com, Phan Thi Minh Trang) can tao/sua don hang + nhap
-- Excel de nhap 12 lo TCB va cac lo thang 11 con thieu, nhung dang bi chan o
-- ca RLS (don_hang_insert/don_hang_update chi cho 'Sale'/'Chung tu'/'Giam doc')
-- lan trigger enforce_don_hang_update (0126/0127 chi cho Ke toan doi
-- sale_phu_trach_id/khach_hang_id). Nguoi dung xac nhan ro rang muon cap quyen
-- nay — Ke toan duoc coi ngang Sale/Chung tu/Giam doc cho B1 (tao/sua thong
-- tin lo hang), KHONG rieng nua.
-- ============================================================================

drop policy if exists "don_hang_insert" on don_hang;
create policy "don_hang_insert" on don_hang for insert to authenticated
  with check (current_phong_ban() in ('Sale', 'Chứng từ', 'Giám đốc', 'Kế toán'));

drop policy if exists "don_hang_update" on don_hang;
create policy "don_hang_update" on don_hang for update to authenticated
  using (current_phong_ban() in ('Sale', 'Hiện trường', 'Chứng từ', 'Giám đốc', 'Kế toán'));

create or replace function enforce_don_hang_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  role text := current_phong_ban();
  my_nhan_vien_id uuid;
begin
  select id into my_nhan_vien_id from nhan_vien where auth_user_id = auth.uid();

  if role = 'Hiện trường' then
    if (to_jsonb(new) - 'ops_xac_nhan' - 'trang_thai' - 'updated_at' - 'hien_truong_phu_trach_id')
       is distinct from (to_jsonb(old) - 'ops_xac_nhan' - 'trang_thai' - 'updated_at' - 'hien_truong_phu_trach_id') then
      raise exception 'Hiện trường chỉ được xác nhận hoàn thành phần hiện trường.';
    end if;
    if new.ops_xac_nhan and not old.ops_xac_nhan then
      new.hien_truong_phu_trach_id := my_nhan_vien_id;
    end if;
  elsif role in ('Sale', 'Chứng từ', 'Giám đốc', 'Kế toán') then
    if new.ops_xac_nhan is distinct from old.ops_xac_nhan then
      raise exception 'Chỉ Hiện trường mới được xác nhận hoàn thành phần hiện trường.';
    end if;
    if role = 'Chứng từ' and new.cs_xac_nhan and not old.cs_xac_nhan then
      new.chung_tu_phu_trach_id := my_nhan_vien_id;
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
