-- ============================================================================
-- Phat hien qua ra soat go-live: RPC lay_gia_ban_chi_phi/lay_gia_ban_thue_ngoai
-- (migration 0061) dang cho ca "Chung tu" (va rieng thue ngoai con co ca
-- "Dieu phoi") xem duoc gia_ban_sell — trai voi yeu cau nghiep vu chinh thuc:
-- "Gia ban CHI hien thi cho Sale; Ke toan; Giam doc". Day la lop bao mat THAT
-- (RLS column-grant + RPC security definer), khong phai chi UI — phai sua
-- dung o day, sua rieng UI (canSeeSell trong ChiPhiGopSection.tsx) la khong
-- du vi API/RPC van tra ve du lieu cho Chung tu goi truc tiep.
--
-- Doi chieu voi canSeeLoiNhuan da dung o /don-hang/[id]/page.tsx (dung 3 role
-- Ke toan/Giam doc/Sale) de dam bao nhat quan toan he thong.
-- ============================================================================

create or replace function lay_gia_ban_chi_phi(p_ids uuid[])
returns table(id uuid, gia_ban_sell numeric)
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_phong_ban() in ('Kế toán', 'Giám đốc') then
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

create or replace function lay_gia_ban_thue_ngoai(p_ids uuid[])
returns table(id uuid, gia_ban_sell numeric)
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_phong_ban() in ('Kế toán', 'Giám đốc') then
    return query select t.id, t.gia_ban_sell from don_thue_ngoai t where t.id = any(p_ids);
  elsif current_phong_ban() = 'Sale' then
    return query
      select t.id, t.gia_ban_sell
      from don_thue_ngoai t
      join don_hang dh on dh.id = t.don_hang_id
      join nhan_vien nv on nv.id = dh.sale_phu_trach_id
      where t.id = any(p_ids) and nv.auth_user_id = auth.uid();
  end if;
  return;
end;
$$;
