-- ============================================================================
-- P2 muc 12 (2026-11-27): "Gan Sale hang loat" cho don hang chua gan ("—").
-- Khong mo rong RLS UPDATE cua don_hang cho Ke toan (se cho phep sua ca gia/
-- khach_hang_id/ngay... rong hon can thiet, dung dung sai nhu ghi chu trong
-- 0081) — thay vao do dung 1 RPC SECURITY DEFINER CHI duoc sua dung cot
-- sale_phu_trach_id, mo cho ca Ke toan (nguoi phat hien van de nay) lan cac
-- phong ban da duoc quan ly don hang (Sale/Chung tu/Giam doc).
-- ============================================================================

create or replace function gan_sale_hang_loat(p_don_hang_ids uuid[], p_sale_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_phong_ban() not in ('Sale', 'Chứng từ', 'Giám đốc', 'Kế toán') then
    raise exception 'Không có quyền gán Sale hàng loạt.';
  end if;
  update don_hang set sale_phu_trach_id = p_sale_id where id = any(p_don_hang_ids);
end;
$$;

grant execute on function gan_sale_hang_loat(uuid[], uuid) to authenticated;
