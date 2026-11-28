-- ============================================================================
-- Bao cao cua nguoi dung (28/11/2026): tai khoan Ke toan khong sua duoc "so
-- cont" trong trang chi tiet don hang — sua xong khong luu duoc.
--
-- Nguyen nhan: migration 0133 (Muc 0, 27/11) da them 'Kế toán' vao
-- CAN_MANAGE_DON_HANG_B1 (permissions.ts) nen UI cho Ke toan vao sua tab
-- Container/hang hoa, nhung CHI sua RLS cua bang don_hang — khong dong bo
-- sang 2 bang ve tinh don_hang_container (so cont) va to_khai_hai_quan (so to
-- khai), nen Postgres tu choi am tham INSERT/UPDATE/DELETE (UI tuong nhu luu
-- duoc nhung khong co dong nao duoc ghi).
--
-- Dong bo lai ca 2 bang theo dung CAN_MANAGE_DON_HANG_B1 ('Sale', 'Chứng từ',
-- 'Giám đốc', 'Kế toán'). to_khai_hai_quan truoc gio con khong dong bo NGAY
-- CA VOI CHINH NO (insert dung 1 danh sach, update/delete dung danh sach khac
-- thieu ca 'Giám đốc') — gop lai dung 1 danh sach duy nhat cho ca 3 thao tac.
-- ============================================================================

drop policy if exists "container_insert" on don_hang_container;
create policy "container_insert" on don_hang_container for insert to authenticated
  with check (current_phong_ban() in ('Sale', 'Chứng từ', 'Giám đốc', 'Kế toán'));

drop policy if exists "container_update" on don_hang_container;
create policy "container_update" on don_hang_container for update to authenticated
  using (current_phong_ban() in ('Sale', 'Chứng từ', 'Giám đốc', 'Kế toán'));

drop policy if exists "container_delete" on don_hang_container;
create policy "container_delete" on don_hang_container for delete to authenticated
  using (current_phong_ban() in ('Sale', 'Chứng từ', 'Giám đốc', 'Kế toán'));

drop policy if exists "to_khai_insert" on to_khai_hai_quan;
create policy "to_khai_insert" on to_khai_hai_quan for insert to authenticated
  with check (current_phong_ban() in ('Sale', 'Chứng từ', 'Giám đốc', 'Kế toán'));

drop policy if exists "to_khai_update" on to_khai_hai_quan;
create policy "to_khai_update" on to_khai_hai_quan for update to authenticated
  using (current_phong_ban() in ('Sale', 'Chứng từ', 'Giám đốc', 'Kế toán'));

drop policy if exists "to_khai_delete" on to_khai_hai_quan;
create policy "to_khai_delete" on to_khai_hai_quan for delete to authenticated
  using (current_phong_ban() in ('Sale', 'Chứng từ', 'Giám đốc', 'Kế toán'));
