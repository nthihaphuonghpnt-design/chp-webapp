-- ============================================================================
-- Theo yeu cau nguoi dung: "chuyen tien noi bo tu ngan hang qua tien mat thi
-- sao" — hien So quy KHONG co cach nao ghi nhan viec dieu chuyen tien GIUA 2
-- so (Tien mat <-> Tai khoan cong ty), vi So quy hien tai chi la BANG DAN
-- XUAT (100% tu dong sinh tu tam_ung_giai_chi/phat_sinh_chi_phi/
-- don_thue_ngoai/hoa_don_xuat/luong_da_tra/hoa_don_dau_vao qua trigger),
-- khong co nguon nao dai dien cho "rut tien ngan hang ve quy tien mat" hay
-- "nop tien mat vao ngan hang".
--
-- Them bang dieu_chuyen_quy rieng — 1 lan dieu chuyen sinh ra 2 dong trong
-- So quy (Chi o so nguon, Thu o so dich) cung nguon_id, giu dung nguyen tac
-- "So quy la bang dan xuat, khong ghi truc tiep" da dung xuyen suot du an.
-- ============================================================================

create table if not exists dieu_chuyen_quy (
  id uuid primary key default gen_random_uuid(),
  ngay date not null default current_date,
  chieu text not null check (chieu in ('Ngân hàng → Tiền mặt', 'Tiền mặt → Ngân hàng')),
  so_tien numeric not null check (so_tien > 0),
  ghi_chu text,
  nguoi_thuc_hien_id uuid references nhan_vien(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on dieu_chuyen_quy
  for each row execute function set_updated_at();

create or replace function sync_so_quy_dieu_chuyen()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'DELETE' then
    delete from so_quy where nguon_bang = 'dieu_chuyen_quy' and nguon_id = old.id;
    return old;
  end if;
  delete from so_quy where nguon_bang = 'dieu_chuyen_quy' and nguon_id = new.id;
  if new.chieu = 'Ngân hàng → Tiền mặt' then
    insert into so_quy (loai_so, loai_giao_dich, so_tien, ngay, noi_dung, nguon_bang, nguon_id) values
      ('Tài khoản công ty', 'Chi', new.so_tien, new.ngay, coalesce('Chuyển quỹ nội bộ: ' || new.ghi_chu, 'Chuyển quỹ nội bộ: rút tiền về quỹ tiền mặt'), 'dieu_chuyen_quy', new.id),
      ('Tiền mặt', 'Thu', new.so_tien, new.ngay, coalesce('Chuyển quỹ nội bộ: ' || new.ghi_chu, 'Chuyển quỹ nội bộ: rút tiền về quỹ tiền mặt'), 'dieu_chuyen_quy', new.id);
  else
    insert into so_quy (loai_so, loai_giao_dich, so_tien, ngay, noi_dung, nguon_bang, nguon_id) values
      ('Tiền mặt', 'Chi', new.so_tien, new.ngay, coalesce('Chuyển quỹ nội bộ: ' || new.ghi_chu, 'Chuyển quỹ nội bộ: nộp tiền mặt vào ngân hàng'), 'dieu_chuyen_quy', new.id),
      ('Tài khoản công ty', 'Thu', new.so_tien, new.ngay, coalesce('Chuyển quỹ nội bộ: ' || new.ghi_chu, 'Chuyển quỹ nội bộ: nộp tiền mặt vào ngân hàng'), 'dieu_chuyen_quy', new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists after_dcq_sync_so_quy on dieu_chuyen_quy;
create trigger after_dcq_sync_so_quy
  after insert or update or delete on dieu_chuyen_quy
  for each row execute function sync_so_quy_dieu_chuyen();

create or replace function ghi_nhat_ky_dieu_chuyen_quy()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'DELETE' then
    perform ghi_nhat_ky('dieu_chuyen_quy', old.id, 'xoa_dieu_chuyen_quy', null, to_jsonb(old), null);
    return old;
  end if;
  perform ghi_nhat_ky('dieu_chuyen_quy', new.id, 'sua_dieu_chuyen_quy', null, to_jsonb(old), to_jsonb(new));
  return new;
end;
$$;

drop trigger if exists after_dcq_ghi_nhat_ky on dieu_chuyen_quy;
create trigger after_dcq_ghi_nhat_ky
  after update or delete on dieu_chuyen_quy
  for each row execute function ghi_nhat_ky_dieu_chuyen_quy();

alter table dieu_chuyen_quy enable row level security;

create policy "dcq_select" on dieu_chuyen_quy for select to authenticated
  using (current_phong_ban() in ('Kế toán', 'Giám đốc'));
create policy "dcq_insert" on dieu_chuyen_quy for insert to authenticated
  with check (current_phong_ban() = 'Kế toán');
create policy "dcq_update" on dieu_chuyen_quy for update to authenticated
  using (current_phong_ban() = 'Kế toán');
create policy "dcq_delete" on dieu_chuyen_quy for delete to authenticated
  using (current_phong_ban() = 'Kế toán');
