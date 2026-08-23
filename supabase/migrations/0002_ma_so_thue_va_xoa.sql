-- ============================================================================
-- Bo sung: Ma so thue cho Nha cung cap va Doi tac thue ngoai (de tra cuu tu dong)
-- ============================================================================

alter table nha_cung_cap add column if not exists ma_so_thue text;
alter table doi_tac_thue_ngoai add column if not exists ma_so_thue text;

-- ============================================================================
-- Bo sung: cho phep Ke toan xoa han cac dong danh muc (ben canh "ngung hoat dong")
-- Neu dong dang duoc du lieu khac tham chieu toi, Postgres se chan xoa (loi FK)
-- va giao dien se bao "khong xoa duoc, hay chuyen sang Ngung hoat dong".
-- ============================================================================

create policy "nhan_vien_delete" on nhan_vien for delete to authenticated using (current_phong_ban() = 'Kế toán');

do $$
declare
  t text;
begin
  foreach t in array array['khach_hang','nha_cung_cap','doi_tac_thue_ngoai','loai_chi_phi','loai_container','hang_hoa','dia_diem','xe_van_chuyen']
  loop
    execute format('create policy "%s_delete" on %I for delete to authenticated using (current_phong_ban() = ''Kế toán'')', t, t);
  end loop;
end $$;
