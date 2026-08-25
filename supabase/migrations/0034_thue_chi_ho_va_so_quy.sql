-- ============================================================================
-- 1) To khai hai quan: ai dong thue (Khach hang tu dong / CHP dong ho). Neu
--    CHP dong ho, tu dong sinh dong "Chi phi phat sinh" (chi ho = true) tuong
--    ung voi Thue nhap khau / Thue GTGT / Thue khac, de chay chung vao Bang ke
--    - Cong no phai thu - Hoa don nhu moi chi ho khac. Sua/xoa to khai se tu
--    cap nhat lai (khong bi trung).
-- ============================================================================

alter table to_khai_hai_quan add column if not exists ai_dong_thue text
  not null default 'Khách hàng tự đóng' check (ai_dong_thue in ('Khách hàng tự đóng', 'CHP đóng hộ'));

alter table phat_sinh_chi_phi add column if not exists to_khai_id uuid references to_khai_hai_quan(id) on delete cascade;
alter table phat_sinh_chi_phi add column if not exists nguon_tu_dong text;

create or replace function sync_thue_chi_ho_tu_to_khai()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ma_tax002 uuid;
  ma_tax001 uuid;
  ngay date;
begin
  if TG_OP = 'DELETE' then
    delete from phat_sinh_chi_phi where to_khai_id = old.id;
    return old;
  end if;

  delete from phat_sinh_chi_phi where to_khai_id = new.id;

  if new.ai_dong_thue = 'CHP đóng hộ' then
    select id into ma_tax002 from loai_chi_phi where ma_loai_chi_phi = 'TAX002' limit 1;
    select id into ma_tax001 from loai_chi_phi where ma_loai_chi_phi = 'TAX001' limit 1;
    ngay := coalesce(new.ngay_thong_quan, new.ngay_mo_to_khai, current_date);

    if coalesce(new.thue_nhap_khau, 0) > 0 then
      insert into phat_sinh_chi_phi
        (don_hang_id, loai_chi_phi_id, gia_von_buy, gia_ban_sell, chi_ho, noi_bo, trang_thai,
         ngay_phat_sinh, to_khai_id, nguon_tu_dong, ghi_chu)
      values
        (new.don_hang_id, ma_tax002, new.thue_nhap_khau, new.thue_nhap_khau, true, false, 'Đã duyệt',
         ngay, new.id, 'to_khai_thue_nk', 'Tự động từ Tờ khai hải quan (CHP đóng hộ)');
    end if;

    if coalesce(new.thue_vat_nk, 0) > 0 then
      insert into phat_sinh_chi_phi
        (don_hang_id, loai_chi_phi_id, gia_von_buy, gia_ban_sell, chi_ho, noi_bo, trang_thai,
         ngay_phat_sinh, to_khai_id, nguon_tu_dong, ghi_chu)
      values
        (new.don_hang_id, ma_tax001, new.thue_vat_nk, new.thue_vat_nk, true, false, 'Đã duyệt',
         ngay, new.id, 'to_khai_thue_vat', 'Tự động từ Tờ khai hải quan (CHP đóng hộ)');
    end if;

    if coalesce(new.thue_khac, 0) > 0 then
      insert into phat_sinh_chi_phi
        (don_hang_id, gia_von_buy, gia_ban_sell, chi_ho, noi_bo, trang_thai,
         ngay_phat_sinh, to_khai_id, nguon_tu_dong, ghi_chu)
      values
        (new.don_hang_id, new.thue_khac, new.thue_khac, true, false, 'Đã duyệt',
         ngay, new.id, 'to_khai_thue_khac', 'Tự động từ Tờ khai hải quan - thuế khác (CHP đóng hộ)');
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists after_to_khai_sync_thue on to_khai_hai_quan;
create trigger after_to_khai_sync_thue
  after insert or update or delete on to_khai_hai_quan
  for each row execute function sync_thue_chi_ho_tu_to_khai();

-- ============================================================================
-- 2) So quy (Tien mat / Tai khoan cong ty) — tu dong dong bo tu: Tam ung/Giai
--    chi, thanh toan Chi phi phat sinh, thanh toan Thue ngoai, thu tien Hoa
--    don. Moi nguon them 1 truong "phuong thuc" (TM/TK); moi lan thay doi so
--    tien da tra/da thu se tu cap nhat 1 dong duy nhat trong So quy (khong
--    bi trung khi sua di sua lai).
-- ============================================================================

create table if not exists so_quy (
  id uuid primary key default gen_random_uuid(),
  loai_so text not null check (loai_so in ('Tiền mặt', 'Tài khoản công ty')),
  loai_giao_dich text not null check (loai_giao_dich in ('Thu', 'Chi')),
  so_tien numeric not null,
  ngay date not null,
  noi_dung text,
  nguon_bang text not null,
  nguon_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (nguon_bang, nguon_id)
);

create trigger set_updated_at before update on so_quy
  for each row execute function set_updated_at();

alter table so_quy enable row level security;

create policy "so_quy_select" on so_quy for select to authenticated
  using (current_phong_ban() in ('Kế toán', 'Giám đốc'));

-- Khong co insert/update/delete policy cho client — chi ghi qua trigger
-- (security definer) tu cac bang nguon.

-- ----------------------------------------------------------------------------
alter table phat_sinh_chi_phi add column if not exists phuong_thuc_thanh_toan text
  check (phuong_thuc_thanh_toan in ('Tiền mặt', 'Tài khoản công ty'));
alter table don_thue_ngoai add column if not exists phuong_thuc_thanh_toan text
  check (phuong_thuc_thanh_toan in ('Tiền mặt', 'Tài khoản công ty'));
alter table hoa_don_xuat add column if not exists phuong_thuc_thu text
  check (phuong_thuc_thu in ('Tiền mặt', 'Tài khoản công ty'));
alter table tam_ung_giai_chi add column if not exists phuong_thuc text
  check (phuong_thuc in ('Tiền mặt', 'Tài khoản công ty'));

create or replace function sync_so_quy_chi_phi()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'DELETE' then
    delete from so_quy where nguon_bang = 'phat_sinh_chi_phi' and nguon_id = old.id;
    return old;
  end if;
  delete from so_quy where nguon_bang = 'phat_sinh_chi_phi' and nguon_id = new.id;
  if coalesce(new.so_tien_da_thanh_toan, 0) > 0 and new.phuong_thuc_thanh_toan is not null then
    insert into so_quy (loai_so, loai_giao_dich, so_tien, ngay, noi_dung, nguon_bang, nguon_id)
    values (new.phuong_thuc_thanh_toan, 'Chi', new.so_tien_da_thanh_toan,
            coalesce(new.ngay_phat_sinh, current_date), 'Thanh toán chi phí phát sinh',
            'phat_sinh_chi_phi', new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists after_psc_sync_so_quy on phat_sinh_chi_phi;
create trigger after_psc_sync_so_quy
  after insert or update or delete on phat_sinh_chi_phi
  for each row execute function sync_so_quy_chi_phi();

create or replace function sync_so_quy_thue_ngoai()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'DELETE' then
    delete from so_quy where nguon_bang = 'don_thue_ngoai' and nguon_id = old.id;
    return old;
  end if;
  delete from so_quy where nguon_bang = 'don_thue_ngoai' and nguon_id = new.id;
  if coalesce(new.so_tien_da_thanh_toan, 0) > 0 and new.phuong_thuc_thanh_toan is not null then
    insert into so_quy (loai_so, loai_giao_dich, so_tien, ngay, noi_dung, nguon_bang, nguon_id)
    values (new.phuong_thuc_thanh_toan, 'Chi', new.so_tien_da_thanh_toan,
            coalesce(new.ngay_thue, current_date), 'Thanh toán thuê dịch vụ ngoài',
            'don_thue_ngoai', new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists after_dtn_sync_so_quy on don_thue_ngoai;
create trigger after_dtn_sync_so_quy
  after insert or update or delete on don_thue_ngoai
  for each row execute function sync_so_quy_thue_ngoai();

create or replace function sync_so_quy_hoa_don()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'DELETE' then
    delete from so_quy where nguon_bang = 'hoa_don_xuat' and nguon_id = old.id;
    return old;
  end if;
  delete from so_quy where nguon_bang = 'hoa_don_xuat' and nguon_id = new.id;
  if coalesce(new.so_tien_da_thu, 0) > 0 and new.phuong_thuc_thu is not null then
    insert into so_quy (loai_so, loai_giao_dich, so_tien, ngay, noi_dung, nguon_bang, nguon_id)
    values (new.phuong_thuc_thu, 'Thu', new.so_tien_da_thu,
            coalesce(new.ngay_xuat, current_date), 'Thu tiền hóa đơn',
            'hoa_don_xuat', new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists after_hdx_sync_so_quy on hoa_don_xuat;
create trigger after_hdx_sync_so_quy
  after insert or update or delete on hoa_don_xuat
  for each row execute function sync_so_quy_hoa_don();

create or replace function sync_so_quy_tam_ung()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'DELETE' then
    delete from so_quy where nguon_bang = 'tam_ung_giai_chi' and nguon_id = old.id;
    return old;
  end if;
  delete from so_quy where nguon_bang = 'tam_ung_giai_chi' and nguon_id = new.id;
  if new.trang_thai = 'Đã duyệt' and new.phuong_thuc is not null and coalesce(new.so_tien, 0) > 0 then
    insert into so_quy (loai_so, loai_giao_dich, so_tien, ngay, noi_dung, nguon_bang, nguon_id)
    values (
      new.phuong_thuc,
      case when new.loai = 'Tạm ứng' then 'Chi' else 'Thu' end,
      new.so_tien,
      new.ngay_thuc_hien,
      new.loai || ' - ' || coalesce(new.so_phieu, ''),
      'tam_ung_giai_chi', new.id
    );
  end if;
  return new;
end;
$$;

drop trigger if exists after_tugc_sync_so_quy on tam_ung_giai_chi;
create trigger after_tugc_sync_so_quy
  after insert or update or delete on tam_ung_giai_chi
  for each row execute function sync_so_quy_tam_ung();
