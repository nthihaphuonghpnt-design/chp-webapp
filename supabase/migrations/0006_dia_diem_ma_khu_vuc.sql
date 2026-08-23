-- ============================================================================
-- Bo sung Danh muc Dia diem: Ma dia diem (tim theo ten hoac ma), Khu vuc,
-- them loai "Depot". Sau do nap san danh sach dia diem thuc te cua CHP.
-- ============================================================================

alter table dia_diem add column if not exists ma_dia_diem text;
alter table dia_diem add column if not exists khu_vuc text;

do $$
begin
  if exists (
    select 1 from information_schema.table_constraints
    where table_name = 'dia_diem' and constraint_name = 'dia_diem_loai_check'
  ) then
    alter table dia_diem drop constraint dia_diem_loai_check;
  end if;
end $$;

alter table dia_diem add constraint dia_diem_loai_check
  check (loai in ('Cảng', 'Kho', 'Depot', 'Nơi giao nhận', 'Khác'));

create unique index if not exists dia_diem_ma_dia_diem_key on dia_diem (ma_dia_diem) where ma_dia_diem is not null;

-- ----------------------------------------------------------------------------
-- Nap danh sach dia diem (kho / cang / depot) thuc te
-- ----------------------------------------------------------------------------
insert into dia_diem (ma_dia_diem, ten, dia_chi, loai, khu_vuc) values
('KH001', 'KCN Mỹ Phước 3', 'Phường Thới Hòa, TP. Hồ Chí Minh', 'Kho', 'TP. Hồ Chí Minh'),
('KH002', 'KCN Xuyên Á', 'Xã Mỹ Hạnh Bắc, Tỉnh Tây Ninh', 'Kho', 'Tỉnh Tây Ninh'),
('KH003', 'Tân Uyên', 'Phường Uyên Hưng, TP. Hồ Chí Minh', 'Kho', 'TP. Hồ Chí Minh'),
('KH004', 'Bình Chuẩn', 'Phường Bình Chuẩn, TP. Hồ Chí Minh', 'Kho', 'TP. Hồ Chí Minh'),
('KH005', 'KCN Mỹ Phước 1', 'Phường Mỹ Phước, TP. Hồ Chí Minh', 'Kho', 'TP. Hồ Chí Minh'),
('KH006', 'KCN Sóng Thần 3', 'Phường Phú Tân, TP. Hồ Chí Minh', 'Kho', 'TP. Hồ Chí Minh'),
('KH007', 'KCN Tân Bình', 'Phường Tây Thạnh, TP. Hồ Chí Minh', 'Kho', 'TP. Hồ Chí Minh'),
('KH008', 'KCN Tân Đức', 'Xã Hựu Thạnh, Tỉnh Tây Ninh', 'Kho', 'Tỉnh Tây Ninh'),
('KH009', 'KCN Hải Sơn', 'Xã Đức Hòa Hạ, Tỉnh Tây Ninh', 'Kho', 'Tỉnh Tây Ninh'),
('KH010', 'Bình Tiền, Đức Hòa', 'Xã Đức Hòa Hạ, Tỉnh Tây Ninh', 'Kho', 'Tỉnh Tây Ninh'),
('KH011', 'KCN Hựu Thạnh', 'Xã Hựu Thạnh, Tỉnh Tây Ninh', 'Kho', 'Tỉnh Tây Ninh'),
('KH012', 'Đức Hòa', 'Thị trấn Đức Hòa, Tỉnh Tây Ninh', 'Kho', 'Tỉnh Tây Ninh'),
('KH013', 'Cụm SX An Thạnh, Thuận An', 'Phường An Thạnh, TP. Hồ Chí Minh', 'Kho', 'TP. Hồ Chí Minh'),
('KH014', 'Khu Công Nghệ Cao', 'Phường Tăng Nhơn Phú A, TP. Hồ Chí Minh', 'Kho', 'TP. Hồ Chí Minh'),
('KH015', 'Đại Nam', 'Phường Hiệp An, TP. Hồ Chí Minh', 'Kho', 'TP. Hồ Chí Minh'),
('KH016', 'KCN Long Hậu', 'Xã Long Hậu, Tỉnh Tây Ninh', 'Kho', 'Tỉnh Tây Ninh'),
('KH017', 'Đức Lập', 'Xã Đức Lập Hạ, Tỉnh Tây Ninh', 'Kho', 'Tỉnh Tây Ninh'),
('KH018', 'Bình Chuẩn, Thuận An', 'Phường Bình Chuẩn, TP. Hồ Chí Minh', 'Kho', 'TP. Hồ Chí Minh'),
('KH019', 'Cụm CN Liên Hưng', 'Xã Đức Hòa Hạ, Tỉnh Tây Ninh', 'Kho', 'Tỉnh Tây Ninh'),
('KH020', 'KCN Tân Đô', 'Xã Hựu Thạnh, Tỉnh Tây Ninh', 'Kho', 'Tỉnh Tây Ninh'),
('KH021', 'KCN TMTC, Bến Cầu', 'Xã Lợi Thuận, Tỉnh Tây Ninh', 'Kho', 'Tỉnh Tây Ninh'),
('KH022', 'KCN Thành Thành Công', 'Phường An Hòa, Tỉnh Tây Ninh', 'Kho', 'Tỉnh Tây Ninh'),
('KH023', 'KCN Bàu Bàng', 'Xã Lai Uyên, TP. Hồ Chí Minh', 'Kho', 'TP. Hồ Chí Minh'),
('KH024', 'An Phú', 'Phường An Phú, TP. Hồ Chí Minh', 'Kho', 'TP. Hồ Chí Minh'),
('KH025', 'KCN Vĩnh Lộc', 'Phường Bình Hưng Hòa B, TP. Hồ Chí Minh', 'Kho', 'TP. Hồ Chí Minh'),
('KH026', 'Khu Phố 3, Tăng Nhơn Phú', 'Phường Tăng Nhơn Phú B, TP. Hồ Chí Minh', 'Kho', 'TP. Hồ Chí Minh'),
('KH027', 'Hòa Lợi', 'Phường Hòa Lợi, TP. Hồ Chí Minh', 'Kho', 'TP. Hồ Chí Minh'),
('KH028', 'KCN VSIP II-A', 'Phường Vĩnh Tân, TP. Hồ Chí Minh', 'Kho', 'TP. Hồ Chí Minh'),
('KH029', 'KCN Vĩnh Lộc 2', 'Xã Long Định, Tỉnh Tây Ninh', 'Kho', 'Tỉnh Tây Ninh'),
('KH030', 'Tóc Tiên, Phú Mỹ', 'Xã Châu Pha, TP. Hồ Chí Minh', 'Kho', 'TP. Hồ Chí Minh'),
('KH031', 'Thới Hòa, Bến Cát', 'Phường Thới Hòa, TP. Hồ Chí Minh', 'Kho', 'TP. Hồ Chí Minh'),
('KH032', 'KCN Mỹ Phước', 'Phường Mỹ Phước, TP. Hồ Chí Minh', 'Kho', 'TP. Hồ Chí Minh'),
('KH033', 'KCN Nam Tân Uyên', 'Phường Khánh Bình, TP. Hồ Chí Minh', 'Kho', 'TP. Hồ Chí Minh'),
('KH034', 'Mỹ Hạnh', 'Xã Mỹ Hạnh Nam, Tỉnh Tây Ninh', 'Kho', 'Tỉnh Tây Ninh'),
('KH035', 'KCN Đức Hòa III', 'Xã Đức Lập Hạ, Tỉnh Tây Ninh', 'Kho', 'Tỉnh Tây Ninh'),
('CG001', 'Cảng Cát Lái', null, 'Cảng', 'TP. Hồ Chí Minh'),
('CG002', 'Cảng Sowatco', null, 'Cảng', 'TP. Hồ Chí Minh'),
('CG003', 'Cảng Cát Lái Giang Nam', null, 'Cảng', 'TP. Hồ Chí Minh'),
('CG004', 'Cảng SP-ITC', null, 'Cảng', 'TP. Hồ Chí Minh'),
('CG005', 'Cảng Tân Cảng Hiệp Phước', null, 'Cảng', 'TP. Hồ Chí Minh'),
('CG006', 'Cảng Tân Cảng Mỹ Thủy', null, 'Cảng', 'TP. Hồ Chí Minh'),
('CG007', 'Cảng Tân Cảng Suối Tiên', null, 'Cảng', 'TP. Hồ Chí Minh'),
('CG008', 'Cảng Tân Cảng Rạch Chiếc', null, 'Cảng', 'TP. Hồ Chí Minh'),
('CG010', 'Cảng Bình Dương', null, 'Cảng', 'TP. Hồ Chí Minh'),
('CG011', 'Cảng Thạnh Phước', null, 'Cảng', 'TP. Hồ Chí Minh'),
('CG012', 'Cảng Đồng Nai', null, 'Cảng', 'Tỉnh Đồng Nai'),
('CG013', 'Cảng Tân Cảng Nhơn Trạch', null, 'Cảng', 'Tỉnh Đồng Nai'),
('CG014', 'Cảng ICD Phước Long 3', null, 'Cảng', 'TP. Hồ Chí Minh'),
('CG015', 'Cảng ICD Phước Long 2', null, 'Cảng', 'TP. Hồ Chí Minh'),
('CG016', 'Cảng ICD Phước Long', null, 'Cảng', 'TP. Hồ Chí Minh'),
('CG017', 'Cảng ICD Tanamexco', null, 'Cảng', 'TP. Hồ Chí Minh'),
('CG018', 'Cảng ICD Sotrans', null, 'Cảng', 'TP. Hồ Chí Minh'),
('CG019', 'Cảng ICD Sóng Thần', null, 'Cảng', 'TP. Hồ Chí Minh'),
('CG020', 'Cảng ICD Transimex', null, 'Cảng', 'TP. Hồ Chí Minh'),
('CG021', 'Cảng ICD Tân Cảng Long Bình', null, 'Cảng', 'Tỉnh Đồng Nai'),
('CG022', 'Cảng ICD TBS Tân Vạn', null, 'Cảng', 'TP. Hồ Chí Minh'),
('CG023', 'Cảng ICD An Sơn', null, 'Cảng', 'TP. Hồ Chí Minh'),
('CG024', 'Cảng ICD Phúc Long', null, 'Cảng', 'TP. Hồ Chí Minh'),
('DP002', 'Gfortune Thủ Đức', null, 'Depot', 'TP. Hồ Chí Minh'),
('DP003', 'Gfortune Đồng An', null, 'Depot', 'TP. Hồ Chí Minh'),
('DP004', 'Solog Sóng Thần', null, 'Depot', 'TP. Hồ Chí Minh'),
('DP005', 'Suối Tiên - Long Thạnh Mỹ', null, 'Depot', 'TP. Hồ Chí Minh'),
('DP006', 'Sinovnl Cát Lái', null, 'Depot', 'TP. Hồ Chí Minh'),
('DP007', 'Chân Thật - Suối Tiên Long Thạnh Mỹ', null, 'Depot', 'TP. Hồ Chí Minh'),
('DP008', 'Phú Hưng', null, 'Depot', 'TP. Hồ Chí Minh'),
('DP009', 'SITC Giang Nam', null, 'Depot', 'TP. Hồ Chí Minh'),
('DP010', 'Sinovnl Tân Vạn', null, 'Depot', 'TP. Hồ Chí Minh'),
('DP011', 'Phúc Xuân Tân Vạn', null, 'Depot', 'TP. Hồ Chí Minh'),
('DP012', 'Green Logistics', null, 'Depot', 'TP. Hồ Chí Minh'),
('DP013', 'Solog', null, 'Depot', 'TP. Hồ Chí Minh'),
('DP014', 'Chân Thật Sóng Thần', null, 'Depot', 'TP. Hồ Chí Minh'),
('DP015', 'Tâm Cảng', null, 'Depot', 'TP. Hồ Chí Minh'),
('DP017', 'Gfortune Tân Vạn 2', null, 'Depot', 'TP. Hồ Chí Minh'),
('DP018', 'Medlog Sóng Thần 3', null, 'Depot', 'TP. Hồ Chí Minh'),
('DP019', 'TP-MT', null, 'Depot', 'TP. Hồ Chí Minh'),
('DP020', 'AP622', null, 'Depot', 'TP. Hồ Chí Minh'),
('DP021', 'Bình Quy', null, 'Depot', 'TP. Hồ Chí Minh'),
('DP022', 'Solog Thủ Đức', null, 'Depot', 'TP. Hồ Chí Minh'),
('DP023', 'Macstar Tân Vạn', null, 'Depot', 'TP. Hồ Chí Minh'),
('DP024', 'Depot 5A', null, 'Depot', 'TP. Hồ Chí Minh'),
('DP025', 'Đông Bình Dương', null, 'Depot', 'TP. Hồ Chí Minh'),
('DP026', 'Tâm Cảng Cát Lái (SNK)', null, 'Depot', 'TP. Hồ Chí Minh'),
('DP027', 'Sen Vàng Depot', null, 'Depot', 'TP. Hồ Chí Minh'),
('DP028', 'Mỹ Thủy 1', null, 'Depot', 'TP. Hồ Chí Minh'),
('DP029', 'Nam Khánh Sóng Thần', null, 'Depot', 'TP. Hồ Chí Minh'),
('DP030', 'Nam Khánh (Đồng Nai)', null, 'Depot', 'Tỉnh Đồng Nai'),
('DP031', 'Gfortune Sóng Thần', null, 'Depot', 'TP. Hồ Chí Minh'),
('DP032', 'Interserco Mỹ Phước', null, 'Depot', 'TP. Hồ Chí Minh'),
('DP033', 'Tân Cảng Sóng Thần', null, 'Depot', 'TP. Hồ Chí Minh'),
('DP034', 'YCH Bình Dương', null, 'Depot', 'TP. Hồ Chí Minh'),
('DP035', 'Tân Cảng Hiệp Phước', null, 'Depot', 'TP. Hồ Chí Minh'),
('DP036', 'Straightway Container', null, 'Depot', 'TP. Hồ Chí Minh'),
('DP037', 'TCS Bình Dương', null, 'Depot', 'TP. Hồ Chí Minh')
on conflict (ma_dia_diem) do nothing;
