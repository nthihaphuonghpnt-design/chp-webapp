-- ============================================================================
-- Sua LAI cho DUNG cach chan quyen xem luong (0039/0057 lam SAI ky thuat,
-- du co chay cung khong chan duoc — xem giai thich duoi).
--
-- Ly do 0039 khong hieu qua: Postgres kiem tra quyen SELECT tren 1 cot bang
-- cach OR giua quyen cap BANG va quyen cap COT — neu role da co SELECT cap
-- toan bang (authenticated gan nhu chac chan co, do Supabase cap mac dinh
-- luc tao project), thi REVOKE SELECT (cot) sau do KHONG loai bo duoc
-- quyen, vi quyen van con hieu luc tu grant cap bang. Column-level REVOKE
-- chi co tac dung khi KHONG CON grant cap bang nao bao trum no.
--
-- Cach dung: REVOKE SELECT cap TOAN BANG truoc (xoa het), roi GRANT lai
-- SELECT rieng cho tung cot duoc phep xem cong khai (khong gom
-- luong_co_dinh, muc_dong_bhxh). RPC luong_cua_nhan_vien() (da tao o 0039)
-- van giu nguyen, khong doi — van la duong duy nhat de xem 2 cot luong.
--
-- An toan chay lai nhieu lan; tu dam bao du 2 cot loai_nhan_su/ngay_vao_lam
-- da ton tai (phong truong hop 0050/0057 chua chay truoc do).
-- ============================================================================

alter table nhan_vien add column if not exists loai_nhan_su text not null default 'Cố định'
  check (loai_nhan_su in ('Cố định', 'Outsource'));
alter table nhan_vien add column if not exists ngay_vao_lam date;

revoke select on nhan_vien from authenticated;

grant select (
  id, ho_ten, phong_ban_id, email_tai_khoan, so_dien_thoai, auth_user_id,
  dang_lam_viec, created_at, updated_at, so_nguoi_phu_thuoc,
  loai_nhan_su, ngay_vao_lam
) on nhan_vien to authenticated;

-- luong_co_dinh, muc_dong_bhxh CO Y KHONG grant lai — chi xem duoc qua RPC
-- luong_cua_nhan_vien(), da tao san o migration 0039.
