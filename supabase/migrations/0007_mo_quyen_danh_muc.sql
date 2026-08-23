-- ============================================================================
-- Mo quyen Danh muc Dung chung: MOI phong ban duoc them/sua (vi thong tin
-- thuc te hay phat sinh thay doi, ai gap cung can cap nhat duoc ngay).
-- Rieng "Nhan vien" van gioi han: chi Ke toan + Giam doc duoc them/sua.
-- (Xoa (DELETE) van chi danh cho Ke toan, khong doi.)
-- ============================================================================

do $$
declare
  t text;
begin
  foreach t in array array['khach_hang','nha_cung_cap','doi_tac_thue_ngoai','loai_chi_phi','loai_container','hang_hoa','dia_diem','xe_van_chuyen']
  loop
    execute format('drop policy if exists "%s_insert" on %I', t, t);
    execute format('create policy "%s_insert" on %I for insert to authenticated with check (true)', t, t);

    execute format('drop policy if exists "%s_update" on %I', t, t);
    execute format('create policy "%s_update" on %I for update to authenticated using (true)', t, t);
  end loop;
end $$;

drop policy if exists "nhan_vien_insert" on nhan_vien;
create policy "nhan_vien_insert" on nhan_vien for insert to authenticated
  with check (current_phong_ban() in ('Kế toán', 'Giám đốc'));

drop policy if exists "nhan_vien_update" on nhan_vien;
create policy "nhan_vien_update" on nhan_vien for update to authenticated
  using (current_phong_ban() in ('Kế toán', 'Giám đốc'));
