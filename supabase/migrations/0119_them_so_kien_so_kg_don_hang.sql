-- Thêm số kiện / số kg cho đơn hàng lẻ (LCL) — tương đương vai trò của số
-- container đối với hàng FCL, nhưng dvt/so_luong hiện tại chỉ lưu được 1 đơn
-- vị duy nhất nên không đủ cho trường hợp cần cả 2 (vd: 2 kiện, 947 kg).
alter table don_hang
  add column if not exists so_kien integer,
  add column if not exists so_kg numeric;
