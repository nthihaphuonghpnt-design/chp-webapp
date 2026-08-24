-- ============================================================================
-- Tu dong ghi nhan Hien truong / Chung tu phu trach ngay khi ho bam "Xac nhan
-- hoan thanh" — khong can chon tay, dung de gan chi phi giao nhan dung nguoi
-- va lam bang luong cuoi thang. Giu nguyen quyen B1 nhu migration 0004
-- (Sale/Chung tu/Giam doc sua toan bo B1 tru ops_xac_nhan; Hien truong chi
-- duoc doi ops_xac_nhan).
-- ============================================================================

alter table don_hang add column if not exists hien_truong_phu_trach_id uuid references nhan_vien(id);
alter table don_hang add column if not exists chung_tu_phu_trach_id uuid references nhan_vien(id);

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
  elsif role in ('Sale', 'Chứng từ', 'Giám đốc') then
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
