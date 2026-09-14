-- ============================================================================
-- Tiep tuc fix 0079: sau khi vá xong trigger enforce_don_thue_ngoai_update de
-- them nhanh Sale, phat hien qua kiem tra truc tiep (RLS-simulation as Sale,
-- update that roi doi chieu so hang bi anh huong) rang ban than RLS POLICY
-- "dtn_update" tren don_thue_ngoai chua bao gio cho phep role Sale — using
-- clause chi co ('Hiện trường','Điều phối','Kế toán'), thieu han 'Sale'. Vi
-- vay update cua Sale bi RLS loc con 0 dong TRUOC CA KHI toi trigger — nhanh
-- Sale vua them trong 0079 la dead code, khong bao gio chay duoc.
--
-- Fix: them 'Sale' vao danh sach role duoc phep trong RLS "dtn_update" —
-- trigger enforce_don_thue_ngoai_update (da co nhanh Sale tu 0079) se la lop
-- gioi han that su ve viec Sale CHI duoc sua gia_ban_sell.
-- ============================================================================

drop policy if exists "dtn_update" on don_thue_ngoai;
create policy "dtn_update" on don_thue_ngoai for update to authenticated
  using (current_phong_ban() = any (array['Hiện trường', 'Điều phối', 'Kế toán', 'Sale']));
