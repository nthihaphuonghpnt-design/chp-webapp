-- ============================================================================
-- Nhom khach hang (vd Apple Trans -> Hong Moc / Amal / Atlas): hoa don DICH VU
-- xuat cho cong ty me, hoa don CHI HO xuat cho cong ty con.
--   don_hang.khach_hang_id          = khach cua lo = khach xuat HD chi ho
--   don_hang.khach_hang_dich_vu_id  = khach xuat HD dich vu; NULL = mac dinh
--                                     (cong ty me cua nhom, neu khong co thi
--                                     chinh khach cua lo)
--   nhom_khach_hang.khach_hang_me_id = cong ty me cua nhom
-- Chi them cot, khong doi du lieu cu.
-- ============================================================================

alter table nhom_khach_hang
  add column if not exists khach_hang_me_id uuid references khach_hang(id) on delete set null;

alter table don_hang
  add column if not exists khach_hang_dich_vu_id uuid references khach_hang(id) on delete set null;
