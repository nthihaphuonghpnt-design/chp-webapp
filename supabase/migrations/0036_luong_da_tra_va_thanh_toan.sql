-- ============================================================================
-- Ghi nhan da tra luong cho tung nhan vien theo thang, tu dong chay vao So quy
-- (tien ra - Chi). Giai quyet: "Bang luong" truoc chi TINH luong, chua co buoc
-- xac nhan DA TRA thuc te bang tien mat/chuyen khoan.
-- ============================================================================

create table if not exists luong_da_tra (
  id uuid primary key default gen_random_uuid(),
  nhan_vien_id uuid not null references nhan_vien(id),
  thang_luong text not null, -- 'YYYY-MM'
  so_tien numeric not null,
  phuong_thuc text not null check (phuong_thuc in ('Tiền mặt', 'Tài khoản công ty')),
  ngay_tra date not null default current_date,
  ghi_chu text,
  nguoi_tra_id uuid references nhan_vien(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (nhan_vien_id, thang_luong)
);

create trigger set_updated_at before update on luong_da_tra
  for each row execute function set_updated_at();

alter table luong_da_tra enable row level security;

create policy "ldt_select" on luong_da_tra for select to authenticated
  using (
    current_phong_ban() in ('Kế toán', 'Giám đốc')
    or nhan_vien_id in (select id from nhan_vien where auth_user_id = auth.uid())
  );
create policy "ldt_insert" on luong_da_tra for insert to authenticated
  with check (current_phong_ban() = 'Kế toán');
create policy "ldt_update" on luong_da_tra for update to authenticated
  using (current_phong_ban() = 'Kế toán');
create policy "ldt_delete" on luong_da_tra for delete to authenticated
  using (current_phong_ban() = 'Kế toán');

create or replace function sync_so_quy_luong()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'DELETE' then
    delete from so_quy where nguon_bang = 'luong_da_tra' and nguon_id = old.id;
    return old;
  end if;
  delete from so_quy where nguon_bang = 'luong_da_tra' and nguon_id = new.id;
  if coalesce(new.so_tien, 0) > 0 then
    insert into so_quy (loai_so, loai_giao_dich, so_tien, ngay, noi_dung, nguon_bang, nguon_id)
    select new.phuong_thuc, 'Chi', new.so_tien, new.ngay_tra,
           'Trả lương tháng ' || new.thang_luong || ' - ' || nv.ho_ten,
           'luong_da_tra', new.id
    from nhan_vien nv where nv.id = new.nhan_vien_id;
  end if;
  return new;
end;
$$;

drop trigger if exists after_ldt_sync_so_quy on luong_da_tra;
create trigger after_ldt_sync_so_quy
  after insert or update or delete on luong_da_tra
  for each row execute function sync_so_quy_luong();
