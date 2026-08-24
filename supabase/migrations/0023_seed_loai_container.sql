-- ============================================================================
-- Nap san danh muc "Loai container" pho bien trong nganh logistics.
-- ============================================================================

insert into loai_container (ten) values
  ('Container khô (Dry / General Purpose)'),
  ('Container lạnh (Reefer)'),
  ('Container mở nóc (Open Top)'),
  ('Container mặt phẳng (Flat Rack)'),
  ('Container bồn (Tank)'),
  ('Container hàng rời (Bulk)')
on conflict do nothing;
