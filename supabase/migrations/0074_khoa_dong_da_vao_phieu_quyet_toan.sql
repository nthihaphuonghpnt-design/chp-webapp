-- ============================================================================
-- Phat hien khi ra soat mo rong sau Phase 5: fix 0073 khoa duoc chinh dong
-- phieu_quyet_toan_tam_ung, nhung 3 bang CON (tam_ung_giai_chi,
-- phat_sinh_chi_phi, don_thue_ngoai) — noi CHUA SO LIEU MA phieu tinh tong —
-- van hoan toan khong bi khoa gi ca mot khi da bi 1 phieu quyet toan "giu"
-- (phieu_quyet_toan_id is not null, tuc phieu dang o trang thai Da duyet/Da
-- thanh toan — chi dong nay duoc gan luc trigger enforce_phieu_quyet_toan_
-- trang_thai chuyen Nhap -> Da duyet, xem 0065):
--   - tugc_update/tugc_delete (tam_ung_giai_chi): "current_phong_ban() = 'Kế
--     toán'" khong dieu kien gi khac — Ke toan sua/xoa duoc THANG mot khoan
--     tam ung DA nam trong 1 phieu da duyet/da thanh toan.
--   - psc_delete (phat_sinh_chi_phi) + enforce_phat_sinh_chi_phi_update
--     nhanh Ke toan ("if role = 'Kế toán' then return new;", khong dieu kien
--     gi) — tuong tu, xoa/sua duoc chi phi da khoa trong phieu.
--   - dtn_delete (don_thue_ngoai) + enforce_don_thue_ngoai_update nhanh Ke
--     toan — tuong tu cho thue ngoai.
--
-- Hau qua: da vao 1 phieu quyet toan DA DUYET/DA THANH TOAN (tien co the da
-- chi that ngoai doi) van co the bi Ke toan (hoac ai chiem duoc quyen do)
-- sua so tien hoac xoa hang di truc tiep qua API — phieu van hien nguyen so
-- cu (snapshot), khong ai biet du lieu goc da bi doi/mat, PHA VO CHINH co che
-- khoa vua lam o 0073.
--
-- Fix:
-- - tam_ung_giai_chi / phat_sinh_chi_phi (delete) / don_thue_ngoai (delete):
--   RLS chan luon neu dong dang bi 1 phieu giu (phieu_quyet_toan_id is not
--   null). Khong anh huong luong khoa/mo khoa noi bo (trigger tren
--   phieu_quyet_toan_tam_ung chay SECURITY DEFINER — RLS scoped "to
--   authenticated" khong ap dung cho no).
-- - phat_sinh_chi_phi / don_thue_ngoai (update, qua trigger enforce_*_update
--   — trigger LUON chay bat ke role/RLS nao, kha voi RLS): nhanh Ke toan chi
--   chan neu dong DANG bi giu (old.phieu_quyet_toan_id is not null) VA thao
--   tac nay KHONG PHAI chinh buoc gan/go phieu_quyet_toan_id (new khac old)
--   — dam bao khong chan nham chinh luong khoa/mo khoa hop le do trigger noi
--   bo thuc hien.
-- ============================================================================

drop policy if exists "tugc_update" on tam_ung_giai_chi;
create policy "tugc_update" on tam_ung_giai_chi for update to authenticated
  using (current_phong_ban() = 'Kế toán' and phieu_quyet_toan_id is null);

drop policy if exists "tugc_delete" on tam_ung_giai_chi;
create policy "tugc_delete" on tam_ung_giai_chi for delete to authenticated
  using (current_phong_ban() = 'Kế toán' and phieu_quyet_toan_id is null);

drop policy if exists "psc_delete" on phat_sinh_chi_phi;
create policy "psc_delete" on phat_sinh_chi_phi for delete to authenticated
  using (current_phong_ban() = 'Kế toán' and phieu_quyet_toan_id is null);

drop policy if exists "dtn_delete" on don_thue_ngoai;
create policy "dtn_delete" on don_thue_ngoai for delete to authenticated
  using (current_phong_ban() = 'Kế toán' and phieu_quyet_toan_id is null);

create or replace function enforce_phat_sinh_chi_phi_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  role text := current_phong_ban();
begin
  if role = 'Kế toán' then
    if old.phieu_quyet_toan_id is not null and new.phieu_quyet_toan_id is not distinct from old.phieu_quyet_toan_id then
      raise exception 'Dòng chi phí này đã nằm trong 1 phiếu quyết toán tạm ứng đã duyệt/đã thanh toán — không thể sửa trực tiếp. Hủy phiếu quyết toán trước nếu cần sửa lại.';
    end if;
    return new;
  elsif role = 'Sale' then
    if (to_jsonb(new) - 'gia_ban_sell' - 'updated_at') is distinct from (to_jsonb(old) - 'gia_ban_sell' - 'updated_at') then
      raise exception 'Sale chỉ được sửa giá bán (sell).';
    end if;
  elsif role in ('Hiện trường', 'Điều phối', 'Chứng từ') then
    if role <> 'Điều phối' and exists (
      select 1 from cong_viec_hoan_thanh c
      where c.don_hang_id = old.don_hang_id and c.nhan_vien_id = old.nguoi_nhap_id
        and c.trang_thai = 'Đã tiếp nhận'
    ) then
      raise exception 'Kế toán đã tiếp nhận phần việc này, không thể sửa chi phí — liên hệ Kế toán.';
    end if;
    if old.trang_thai = 'Đã duyệt' then
      raise exception 'Chi phí đã được duyệt, không thể sửa.';
    end if;
    if new.gia_ban_sell is distinct from old.gia_ban_sell then
      raise exception 'Không có quyền sửa giá bán (sell).';
    end if;
    if new.trang_thai in ('Đã duyệt', 'Từ chối') then
      raise exception 'Không có quyền duyệt/từ chối chi phí.';
    end if;
    if new.tinh_trang_thanh_toan is distinct from old.tinh_trang_thanh_toan
       or new.so_tien_da_thanh_toan is distinct from old.so_tien_da_thanh_toan then
      raise exception 'Không có quyền cập nhật tình trạng thanh toán.';
    end if;
  else
    raise exception 'Không có quyền sửa chi phí.';
  end if;
  return new;
end;
$$;

create or replace function enforce_don_thue_ngoai_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  role text := current_phong_ban();
begin
  if role = 'Kế toán' then
    if old.phieu_quyet_toan_id is not null and new.phieu_quyet_toan_id is not distinct from old.phieu_quyet_toan_id then
      raise exception 'Dòng thuê ngoài này đã nằm trong 1 phiếu quyết toán tạm ứng đã duyệt/đã thanh toán — không thể sửa trực tiếp. Hủy phiếu quyết toán trước nếu cần sửa lại.';
    end if;
    return new;
  elsif role in ('Hiện trường', 'Điều phối') then
    if role = 'Hiện trường' and exists (
      select 1 from cong_viec_hoan_thanh c
      where c.don_hang_id = old.don_hang_id and c.nhan_vien_id = old.nguoi_nhap_id
        and c.trang_thai = 'Đã tiếp nhận'
    ) then
      raise exception 'Kế toán đã tiếp nhận phần việc này, không thể sửa — liên hệ Kế toán.';
    end if;
    if old.trang_thai = 'Đã duyệt' then
      raise exception 'Đơn thuê ngoài đã được duyệt, không thể sửa.';
    end if;
    if new.trang_thai in ('Đã duyệt', 'Từ chối') then
      raise exception 'Không có quyền duyệt/từ chối.';
    end if;
  else
    raise exception 'Không có quyền sửa.';
  end if;
  return new;
end;
$$;
