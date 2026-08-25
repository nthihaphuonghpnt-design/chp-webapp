-- ============================================================================
-- 1) Cho phep "Khach hang" la 1 doi tuong trong Tam ung & Giai chi, de ghi
--    nhan khoan khach hang ung truoc tien cho 1 lo hang cu the. Sale hoac
--    Ke toan deu ghi nhan duoc; tien tu dong chay vao So quy dung chieu Thu/Chi.
-- 2) Mo khoa cho Giam doc duoc nhap Bang gia khach hang (truoc chi Sale + Ke toan).
-- ============================================================================

alter table tam_ung_giai_chi add column if not exists khach_hang_id uuid references khach_hang(id);

alter table tam_ung_giai_chi drop constraint if exists tam_ung_giai_chi_doi_tuong_check;
alter table tam_ung_giai_chi add constraint tam_ung_giai_chi_doi_tuong_check
  check (doi_tuong in ('Nhân viên', 'Tài xế', 'Khách hàng'));

alter table tam_ung_giai_chi drop constraint if exists doi_tuong_hop_le;
alter table tam_ung_giai_chi add constraint doi_tuong_hop_le check (
  (doi_tuong = 'Nhân viên' and nhan_vien_id is not null)
  or (doi_tuong = 'Tài xế' and ten_tai_xe is not null)
  or (doi_tuong = 'Khách hàng' and khach_hang_id is not null)
);

drop policy if exists "tugc_select" on tam_ung_giai_chi;
create policy "tugc_select" on tam_ung_giai_chi for select to authenticated
  using (
    current_phong_ban() in ('Kế toán', 'Giám đốc')
    or nguoi_de_nghi_id in (select id from nhan_vien where auth_user_id = auth.uid())
    or nhan_vien_id in (select id from nhan_vien where auth_user_id = auth.uid())
    or (doi_tuong = 'Khách hàng' and current_phong_ban() = 'Sale')
  );

drop policy if exists "tugc_insert" on tam_ung_giai_chi;
create policy "tugc_insert" on tam_ung_giai_chi for insert to authenticated
  with check (
    current_phong_ban() = 'Kế toán'
    or (loai = 'Tạm ứng' and doi_tuong = 'Nhân viên' and nhan_vien_id in (select id from nhan_vien where auth_user_id = auth.uid()))
    or (doi_tuong = 'Khách hàng' and current_phong_ban() = 'Sale')
  );

-- Cap nhat lai chieu Thu/Chi trong So quy: khach hang tam ung = Thu (tien vao),
-- khach hang duoc hoan (giai chi) = Chi (tien ra); nhan vien/tai xe giu nguyen
-- logic cu (tam ung = Chi, giai chi = Thu).
create or replace function sync_so_quy_tam_ung()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_loai_gd text;
begin
  if TG_OP = 'DELETE' then
    delete from so_quy where nguon_bang = 'tam_ung_giai_chi' and nguon_id = old.id;
    return old;
  end if;
  delete from so_quy where nguon_bang = 'tam_ung_giai_chi' and nguon_id = new.id;
  if new.trang_thai = 'Đã duyệt' and new.phuong_thuc is not null and coalesce(new.so_tien, 0) > 0 then
    v_loai_gd := case
      when new.doi_tuong = 'Khách hàng' and new.loai = 'Tạm ứng' then 'Thu'
      when new.doi_tuong = 'Khách hàng' and new.loai = 'Giải chi' then 'Chi'
      when new.loai = 'Tạm ứng' then 'Chi'
      else 'Thu'
    end;
    insert into so_quy (loai_so, loai_giao_dich, so_tien, ngay, noi_dung, nguon_bang, nguon_id)
    values (
      new.phuong_thuc,
      v_loai_gd,
      new.so_tien,
      new.ngay_thuc_hien,
      new.loai || ' - ' || coalesce(new.so_phieu, ''),
      'tam_ung_giai_chi', new.id
    );
  end if;
  return new;
end;
$$;

drop policy if exists "bgkh_insert" on bang_gia_khach_hang;
create policy "bgkh_insert" on bang_gia_khach_hang for insert to authenticated
  with check (current_phong_ban() in ('Sale', 'Kế toán', 'Giám đốc'));
drop policy if exists "bgkh_update" on bang_gia_khach_hang;
create policy "bgkh_update" on bang_gia_khach_hang for update to authenticated
  using (current_phong_ban() in ('Sale', 'Kế toán', 'Giám đốc'));
drop policy if exists "bgkh_delete" on bang_gia_khach_hang;
create policy "bgkh_delete" on bang_gia_khach_hang for delete to authenticated
  using (current_phong_ban() in ('Sale', 'Kế toán', 'Giám đốc'));
