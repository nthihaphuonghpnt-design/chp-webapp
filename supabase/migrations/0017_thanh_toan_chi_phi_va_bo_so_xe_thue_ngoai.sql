-- ============================================================================
-- Them tinh trang thanh toan cho Chi phi phat sinh (Module B) — de theo doi da
-- tra nha cung cap chua, ap dung cho moi dong co nha cung cap (phi nang/ha,
-- chi ho...). Bo cot "so xe/ro mooc ben thue" trong Thue dich vu ngoai (khong
-- con phu hop khi mo rong sang dich vu khac ngoai van tai).
-- ============================================================================

alter table phat_sinh_chi_phi add column if not exists tinh_trang_thanh_toan text
  not null default 'Chưa thanh toán' check (tinh_trang_thanh_toan in ('Chưa thanh toán', 'Một phần', 'Đã đủ'));
alter table phat_sinh_chi_phi add column if not exists so_tien_da_thanh_toan numeric;

alter table don_thue_ngoai drop column if exists so_xe_romooc_ben_thue;

create or replace function enforce_phat_sinh_chi_phi_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  role text := current_phong_ban();
begin
  if role = 'Kế toán' then
    return new;
  elsif role = 'Sale' then
    if (to_jsonb(new) - 'gia_ban_sell' - 'updated_at') is distinct from (to_jsonb(old) - 'gia_ban_sell' - 'updated_at') then
      raise exception 'Sale chỉ được sửa giá bán (sell).';
    end if;
  elsif role in ('Hiện trường', 'Điều phối', 'Chứng từ') then
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
