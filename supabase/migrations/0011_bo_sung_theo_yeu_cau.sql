-- ============================================================================
-- 1) Loai chi phi: bo sung Ma + Ten tieng Anh (de tim theo ma hoac ten),
--    nap san danh sach loai chi phi thuong dung.
-- ============================================================================

alter table loai_chi_phi add column if not exists ma_loai_chi_phi text;
alter table loai_chi_phi add column if not exists ten_tieng_anh text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'loai_chi_phi_ma_unique') then
    alter table loai_chi_phi add constraint loai_chi_phi_ma_unique unique (ma_loai_chi_phi);
  end if;
end $$;

insert into loai_chi_phi (ma_loai_chi_phi, ten, ten_tieng_anh, nhom_chi_phi) values
('TR001', 'Cước xe container', 'Tractor Trucking Charge', 'Cước vận chuyển nội địa'),
('TR002', 'Phí cước xe tải', 'Trucking Charge', 'Cước vận chuyển nội địa'),
('TR003', 'Phí cước vận chuyển nội địa', 'Inland Transportation Charge', 'Cước vận chuyển nội địa'),
('SEA001', 'Cước đường biển', 'Ocean Freight', 'Cước vận chuyển quốc tế'),
('AIR001', 'Cước hàng không', 'Air Freight', 'Cước vận chuyển quốc tế'),
('CT001', 'Phí nâng cont', 'Container Lift-on Charge', 'Phí container'),
('CT002', 'Phí hạ cont', 'Container Lift-off Charge', 'Phí container'),
('CT003', 'Phí DEM', 'Demurrage Charge', 'Phí container'),
('CT004', 'Phí DET', 'Detention Charge', 'Phí container'),
('SH001', 'Phí THC', 'Terminal Handling Charge (THC)', 'Phí hãng tàu'),
('SH002', 'Phí D/O', 'Delivery Order Fee (D/O)', 'Phí hãng tàu'),
('SH003', 'Phí CIC', 'Container Imbalance Charge (CIC)', 'Phí hãng tàu'),
('SH004', 'Phí EBS', 'Emergency Bunker Surcharge (EBS)', 'Phí hãng tàu'),
('SH005', 'Phí BAF', 'Bunker Adjustment Factor (BAF)', 'Phí hãng tàu'),
('SH006', 'Phí PSS', 'Peak Season Surcharge (PSS)', 'Phí hãng tàu'),
('SH007', 'Phí Seal', 'Seal Charge', 'Phí hãng tàu'),
('LC001', 'LCC đầu nước ngoài', 'Overseas Local Charge', 'Local charge'),
('LC002', 'LCC đầu Việt Nam', 'Vietnam Local Charge', 'Local charge'),
('CS001', 'Phí khai hải quan', 'Customs Declaration Fee', 'Phí hải quan/kiểm tra'),
('CS002', 'Phí kiểm hóa', 'Customs Inspection Fee', 'Phí hải quan/kiểm tra'),
('CS003', 'Phí kiểm dịch', 'Quarantine Inspection Fee', 'Phí hải quan/kiểm tra'),
('CS004', 'Phí kiểm tra chuyên ngành', 'Specialized Inspection Fee', 'Phí hải quan/kiểm tra'),
('CS005', 'Phí lấy mẫu', 'Sampling Fee', 'Phí hải quan/kiểm tra'),
('DOC001', 'Phí chứng từ', 'Documentation Fee', 'Phí chứng từ'),
('DOC002', 'Phí C/O', 'Certificate of Origin Fee (C/O)', 'Phí chứng từ'),
('WH001', 'Phí lưu kho', 'Storage Charge', 'Phí kho bãi'),
('WH002', 'Phí bốc xếp', 'Loading & Unloading Charge', 'Phí kho bãi'),
('WH003', 'Phí đóng hàng', 'Stuffing Charge', 'Phí kho bãi'),
('WH004', 'Phí rút hàng', 'Unstuffing Charge', 'Phí kho bãi'),
('WH005', 'Phí lưu bãi', 'Yard Storage Charge', 'Phí kho bãi'),
('TAX001', 'Thuế GTGT', 'Value Added Tax (VAT)', 'Thuế'),
('TAX002', 'Thuế nhập khẩu', 'Import Duty', 'Thuế'),
('TAX003', 'Thuế xuất khẩu', 'Export Duty', 'Thuế'),
('BK001', 'Phí ngân hàng', 'Bank Charge', 'Khác'),
('OTH001', 'Chi phí khác', 'Other Expense', 'Khác')
on conflict (ma_loai_chi_phi) do nothing;

-- ============================================================================
-- 2) Chi tiet van chuyen: mo them quyen cho Chung tu + Ke toan (ngoai Hien
--    truong + Dieu phoi da co san) — vi thong tin diem di/den, kho, bien so
--    xe co the do nhieu phong ban nhap tuy tinh huong thuc te.
-- ============================================================================

drop policy if exists "ctvc_insert" on chi_tiet_van_chuyen;
create policy "ctvc_insert" on chi_tiet_van_chuyen for insert to authenticated
  with check (current_phong_ban() in ('Hiện trường', 'Điều phối', 'Chứng từ', 'Kế toán'));

drop policy if exists "ctvc_update" on chi_tiet_van_chuyen;
create policy "ctvc_update" on chi_tiet_van_chuyen for update to authenticated
  using (current_phong_ban() in ('Hiện trường', 'Điều phối', 'Chứng từ', 'Kế toán'));

drop policy if exists "ctvc_delete" on chi_tiet_van_chuyen;
create policy "ctvc_delete" on chi_tiet_van_chuyen for delete to authenticated
  using (current_phong_ban() in ('Hiện trường', 'Điều phối', 'Chứng từ', 'Kế toán'));

-- ============================================================================
-- 3) Chi phi phat sinh: 1 dong khong duoc vua la "Noi bo" vua la "Chi ho"
--    (2 khai niem loai tru nhau — Chi ho khong tinh vao lai/lo).
-- ============================================================================

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'psc_noi_bo_chi_ho_exclusive') then
    alter table phat_sinh_chi_phi
      add constraint psc_noi_bo_chi_ho_exclusive check (not (noi_bo and chi_ho));
  end if;
end $$;
