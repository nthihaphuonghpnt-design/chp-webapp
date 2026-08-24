-- ============================================================================
-- Module E: Thue van tai ngoai & Mua cuoc ngoai
-- ============================================================================

create table if not exists don_thue_ngoai (
  id uuid primary key default gen_random_uuid(),
  don_hang_id uuid not null references don_hang(id) on delete cascade,
  loai_dich_vu_thue text check (loai_dich_vu_thue in (
    'Vận tải nội địa thuê ngoài', 'Cước đường biển', 'Dịch vụ bên thứ 3 khác'
  )),
  doi_tac_thue_ngoai_id uuid references doi_tac_thue_ngoai(id),
  noi_dung text,
  gia_von_buy numeric,
  gia_ban_sell numeric,
  so_xe_romooc_ben_thue text,
  tinh_trang_thanh_toan text not null default 'Chưa thanh toán'
    check (tinh_trang_thanh_toan in ('Chưa thanh toán', 'Một phần', 'Đã đủ')),
  so_tien_da_thanh_toan numeric,
  ngay_thue date not null default current_date,
  trang_thai text not null default 'Chờ duyệt'
    check (trang_thai in ('Chờ duyệt', 'Đã duyệt', 'Từ chối')),
  nguoi_nhap_id uuid references nhan_vien(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on don_thue_ngoai
  for each row execute function set_updated_at();

alter table don_thue_ngoai enable row level security;

-- Xem: moi nguoi. Them: Hien truong + Dieu phoi. Duyet/Sua toan quyen: Ke toan.
create policy "dtn_select" on don_thue_ngoai for select to authenticated using (true);
create policy "dtn_insert" on don_thue_ngoai for insert to authenticated
  with check (current_phong_ban() in ('Hiện trường', 'Điều phối', 'Kế toán'));
create policy "dtn_update" on don_thue_ngoai for update to authenticated
  using (current_phong_ban() in ('Hiện trường', 'Điều phối', 'Kế toán'));
create policy "dtn_delete" on don_thue_ngoai for delete to authenticated
  using (current_phong_ban() = 'Kế toán');

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
    return new;
  elsif role in ('Hiện trường', 'Điều phối') then
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

drop trigger if exists before_dtn_update on don_thue_ngoai;
create trigger before_dtn_update
  before update on don_thue_ngoai
  for each row execute function enforce_don_thue_ngoai_update();
