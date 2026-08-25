-- ============================================================================
-- An han "Hop dong khach hang" khoi Chung tu — chi Sale (xem)/Ke toan
-- (them/sua/xoa)/Giam doc (xem) con thay duoc.
-- ============================================================================

drop policy if exists "hdkh_select" on hop_dong_khach_hang;
create policy "hdkh_select" on hop_dong_khach_hang for select to authenticated
  using (current_phong_ban() in ('Sale', 'Kế toán', 'Giám đốc'));

drop policy if exists "hdkh_insert" on hop_dong_khach_hang;
create policy "hdkh_insert" on hop_dong_khach_hang for insert to authenticated
  with check (current_phong_ban() = 'Kế toán');

drop policy if exists "hdkh_update" on hop_dong_khach_hang;
create policy "hdkh_update" on hop_dong_khach_hang for update to authenticated
  using (current_phong_ban() = 'Kế toán');

-- ============================================================================
-- Chi phi giao nhan/chuyen: Hien truong va Chung tu chi xem duoc dong cua
-- CHINH MINH (giong nhu da ap dung cho Chi phi phat sinh) — Sale/Ke toan/
-- Giam doc van xem duoc het.
-- ============================================================================

drop policy if exists "cpgn_select" on chi_phi_giao_nhan;
create policy "cpgn_select" on chi_phi_giao_nhan for select to authenticated
  using (
    current_phong_ban() not in ('Hiện trường', 'Chứng từ')
    or nhan_vien_id in (select id from nhan_vien where auth_user_id = auth.uid())
  );

-- ============================================================================
-- An "Phu thu khach hang" khoi Chung tu (khong lien quan cong viec chung tu).
-- ============================================================================

drop policy if exists "phu_thu_select" on phu_thu;
create policy "phu_thu_select" on phu_thu for select to authenticated
  using (current_phong_ban() <> 'Chứng từ');
