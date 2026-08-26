-- ============================================================================
-- Fix: Sale dang xem duoc TOAN BO hoa don xuat (cua ca Sale khac), khong chi
-- cua cac lo hang minh phu trach. Nguyen nhan la RLS "hdx_select"/"hddh_select"
-- (migration 0026) cho phep bat ky ai co phong ban Sale doc het bang
-- hoa_don_xuat / hoa_don_don_hang, khong loc theo don_hang.sale_phu_trach_id.
--
-- Chung tu/Ke toan/Giam doc van xem duoc het (Chung tu xu ly chung tu/hoa don
-- cho tat ca Sale, khong rieng ai).
--
-- Hoa don chua gan don hang nao (tao tay, khong qua Bang ke) se KHONG hien
-- voi Sale — an toan mac dinh, Ke toan/Chung tu van thay va gan don hang lai
-- neu can cho Sale xem.
-- ============================================================================

drop policy if exists "hdx_select" on hoa_don_xuat;
create policy "hdx_select" on hoa_don_xuat for select to authenticated
  using (
    current_phong_ban() in ('Chứng từ', 'Kế toán', 'Giám đốc')
    or (
      current_phong_ban() = 'Sale'
      and exists (
        select 1
        from hoa_don_don_hang hddh
        join don_hang dh on dh.id = hddh.don_hang_id
        join nhan_vien nv on nv.id = dh.sale_phu_trach_id
        where hddh.hoa_don_id = hoa_don_xuat.id
          and nv.auth_user_id = auth.uid()
      )
    )
  );

drop policy if exists "hddh_select" on hoa_don_don_hang;
create policy "hddh_select" on hoa_don_don_hang for select to authenticated
  using (
    current_phong_ban() in ('Chứng từ', 'Kế toán', 'Giám đốc')
    or (
      current_phong_ban() = 'Sale'
      and exists (
        select 1
        from don_hang dh
        join nhan_vien nv on nv.id = dh.sale_phu_trach_id
        where dh.id = hoa_don_don_hang.don_hang_id
          and nv.auth_user_id = auth.uid()
      )
    )
  );
