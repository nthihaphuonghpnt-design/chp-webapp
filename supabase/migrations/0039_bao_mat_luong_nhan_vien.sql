-- ============================================================================
-- Fix bao mat: RLS cua nhan_vien dang mo "select ... using (true)" cho MOI
-- nguoi dang nhap, nghia la bat ky nhan vien nao cung co the goi thang API
-- Supabase (vi du tu DevTools, khong qua giao dien web) de xem duoc
-- luong_co_dinh + muc_dong_bhxh cua TAT CA nhan vien khac, khong chi cua
-- rieng minh. Man hinh "Bang luong" tren web van an toan (chi Ke toan/Giam
-- doc vao duoc trang), nhung du lieu goc thi RLS khong chan.
--
-- Luu y: Supabase anh xa MOI nguoi dang nhap vao CUNG 1 Postgres role
-- "authenticated" (phan quyen theo phong ban chi la dieu kien trong RLS,
-- khong phai role rieng), nen KHONG THE dung GRANT/REVOKE cot don thuan de
-- phan biet Ke toan voi nguoi khac — REVOKE 1 cot se chan ca Ke toan. Vi vay
-- cach dung: bo 2 cot nay ra khoi quyen SELECT truc tiep tren bang cho TAT CA,
-- roi cung cap lai qua 1 ham security-definer co dieu kien (Ke toan/Giam doc
-- xem duoc het, nguoi khac chi xem duoc dong cua chinh minh).
--
-- SAU migration nay, code phia web PHAI doi 2 cho dang select truc tiep
-- luong_co_dinh/muc_dong_bhxh tu bang nhan_vien sang goi RPC
-- luong_cua_nhan_vien(...) — da cap nhat trong cung lan deploy nay
-- (chi-phi/bang-luong/page.tsx va luong-cua-toi/page.tsx).
-- ============================================================================

revoke select (luong_co_dinh, muc_dong_bhxh) on nhan_vien from authenticated;

create or replace function luong_cua_nhan_vien(p_nhan_vien_id uuid default null)
returns table (id uuid, luong_co_dinh numeric, muc_dong_bhxh numeric)
language sql
security definer
set search_path = public
stable
as $$
  select nv.id, nv.luong_co_dinh, nv.muc_dong_bhxh
  from nhan_vien nv
  where (
      current_phong_ban() in ('Kế toán', 'Giám đốc')
      or nv.auth_user_id = auth.uid()
    )
    and (p_nhan_vien_id is null or nv.id = p_nhan_vien_id);
$$;

grant execute on function luong_cua_nhan_vien(uuid) to authenticated;
