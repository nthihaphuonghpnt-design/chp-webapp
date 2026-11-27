-- ============================================================================
-- Fix: migration 0123 (P2 muc 12) da them Ke toan vao danh sach duoc goi RPC
-- gan_sale_hang_loat, nhung trigger before_don_hang_update (enforce_don_hang_update,
-- 0015) van chi cho phep role 'Hien truong'/'Sale'/'Chung tu'/'Giam doc' sua
-- don_hang — Ke toan roi vao nhanh ELSE, bi chan voi loi "Khong co quyen sua
-- don hang." NGAY CA KHI goi dung qua RPC. Phat hien khi dung thu tinh nang
-- "Gan Sale hang loat" that voi tai khoan Ke toan (P2 muc 9, xu ly don gan
-- nham Sale cho Le Van Hieu — Le Van Hieu la Giam doc, khong phai Sale).
--
-- Fix: them nhanh rieng cho Ke toan, nhung CHI cho phep doi dung 1 cot
-- sale_phu_trach_id (giong kieu gioi han cua nhanh Hien truong o tren) —
-- khong mo rong them quyen sua cac cot khac cua don_hang cho Ke toan, dung
-- dung y dinh ban dau cua 0123 (tranh lap lai loi dung sai tung co o 0081).
-- ============================================================================

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
  elsif role = 'Kế toán' then
    if (to_jsonb(new) - 'sale_phu_trach_id' - 'updated_at')
       is distinct from (to_jsonb(old) - 'sale_phu_trach_id' - 'updated_at') then
      raise exception 'Kế toán chỉ được gán/bỏ gán Sale phụ trách cho đơn hàng.';
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
