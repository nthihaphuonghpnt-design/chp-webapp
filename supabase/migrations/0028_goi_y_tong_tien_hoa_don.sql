-- ============================================================================
-- Ham tinh tong tien "da ban cho khach" (khong gom chi ho) cho 1 nhom don
-- hang — dung de goi y "Tong tien truoc thue" khi lap Hoa don xuat.
-- Chay security definer de tinh dung ke ca voi tai khoan Chung tu (vi RLS
-- rieng cua phat_sinh_chi_phi gioi han Chung tu chi xem duoc dong minh nhap —
-- ham nay chi tra ve 1 con so tong hop, khong lo tung dong chi phi).
-- ============================================================================

create or replace function tong_sell_khong_chi_ho(p_don_hang_ids uuid[])
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce((select sum(gia_ban_sell) from phat_sinh_chi_phi where don_hang_id = any(p_don_hang_ids) and chi_ho = false), 0)
    + coalesce((select sum(thanh_tien) from phu_thu where don_hang_id = any(p_don_hang_ids)), 0)
    + coalesce((select sum(gia_ban_sell) from don_thue_ngoai where don_hang_id = any(p_don_hang_ids)), 0)
$$;

grant execute on function tong_sell_khong_chi_ho(uuid[]) to authenticated;
