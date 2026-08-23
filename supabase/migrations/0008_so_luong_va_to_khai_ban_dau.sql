-- ============================================================================
-- Bo sung: "So luong" (di kem DVT) nhap ngay luc tiep nhan don hang, vi luc
-- nhan don da biet so cont/so ky du kien (chi tiet tung container van nhap
-- sau o trang chi tiet don hang).
-- ============================================================================

alter table don_hang add column if not exists so_luong numeric;

-- ============================================================================
-- Cho phep nguoi tao don hang (Sale/Chung tu/Giam doc) duoc nhap luon so to
-- khai NEU da co san (truong hop lam qua dich vu, biet truoc so to khai) —
-- truoc day chi Chung tu duoc them to_khai_hai_quan. Sua/hoan thien sau van
-- chi danh cho Chung tu.
-- ============================================================================

drop policy if exists "to_khai_insert" on to_khai_hai_quan;
create policy "to_khai_insert" on to_khai_hai_quan for insert to authenticated
  with check (current_phong_ban() in ('Sale', 'Chứng từ', 'Giám đốc'));
