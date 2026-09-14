-- ============================================================================
-- BUG-10 (audit, Phase 9): dang_lam_viec=false CHI dang tac dung an khoi cac
-- dropdown/danh sach UI (moi truy van .eq("dang_lam_viec", true) trong code)
-- — KHONG he chan API/RLS o bat ky dau. Ly do goc re: current_phong_ban()
-- (0001) — ham duy nhat ma 37/57 file migration dung lam nen tang cho MOI RLS
-- policy phan quyen theo phong ban trong toan he thong — tra ve phong ban cua
-- 1 nhan_vien MIEN LA auth_user_id khop, khong quan tam dang_lam_viec la gi.
--
-- Hau qua: 1 nhan vien bi nghi viec nhung tai khoan Supabase Auth cua ho chua
-- bi xoa/vo hieu hoa rieng thi VAN CO DAY DU QUYEN nhu luc con lam — goi API
-- Supabase truc tiep tu trinh duyet (khong qua Next.js server/middleware) la
-- du, khong can dang nhap lai qua UI.
--
-- Fix dung 1 cho duy nhat: cho current_phong_ban() tra ve NULL khi
-- dang_lam_viec = false. Vi day la ham nen tang cho toan bo 37+ file RLS, moi
-- policy dang viet kieu "current_phong_ban() = 'X'" hoac "current_phong_ban()
-- in (...)" se tu dong tra ve false/NULL cho nguoi da nghi viec — KHONG can
-- sua tung policy rieng le. Cac policy loai "hoac chinh minh" (vd
-- "current_phong_ban() in (...) or nhan_vien_id in (select id from nhan_vien
-- where auth_user_id = auth.uid())") van cho phep nguoi da nghi viec XEM lai
-- du lieu lich su cua chinh minh qua nhanh "hoac chinh minh" — dung y, vi yeu
-- cau la "chan hanh dong moi, giu du lieu lich su", khong phai xoa quyen xem
-- lai cua chinh ho.
--
-- Lop UX/chan som (dang xuat cuong buc, khong cho dieu huong tiep) nam o
-- src/lib/supabase/middleware.ts; getCurrentUser() (src/lib/auth.ts) cung coi
-- nguoi da nghi viec la "chua dang nhap". Ca 2 lop do KHONG the thay the lop
-- RLS nay, vi goi Supabase API truc tiep khong bao gio di qua middleware.
-- ============================================================================

create or replace function current_phong_ban()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select pb.ten
  from nhan_vien nv
  join phong_ban pb on pb.id = nv.phong_ban_id
  where nv.auth_user_id = auth.uid()
    and nv.dang_lam_viec = true
  limit 1
$$;
