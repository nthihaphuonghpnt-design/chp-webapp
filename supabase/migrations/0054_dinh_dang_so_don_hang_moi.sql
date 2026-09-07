-- ============================================================================
-- Doi dinh dang so don hang tu dong sinh: truoc la CHP{nam 4 so}-{4 so}
-- (vd CHP2026-0001), gio la CHP{XK|NK|KH}{nam 2 so}{thang 2 so}{3 so}
-- (vd CHPXK2608001 = Xuat, thang 8/2026, don thu 001 trong thang).
--
-- So thu tu (3 so cuoi) dung chung 1 dem cho ca Xuat/Nhap/Khac trong cung
-- 1 thang (khong tach dem rieng theo loai) — reset ve 1 khi sang thang moi.
-- Cac don hang da tao truoc day GIU NGUYEN so cu, chi ap dung cho don MOI.
-- ============================================================================

create table if not exists so_don_hang_seq_thang (
  nam int not null,
  thang int not null,
  last_seq int not null default 0,
  primary key (nam, thang)
);

alter table so_don_hang_seq_thang enable row level security;

create or replace function generate_so_don_hang()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  y int := extract(year from now());
  m int := extract(month from now());
  seq int;
  ma_loai text;
begin
  if new.so_don_hang is null or new.so_don_hang = '' then
    ma_loai := case new.loai_don_hang
      when 'Xuất' then 'XK'
      when 'Nhập' then 'NK'
      else 'KH'
    end;
    insert into so_don_hang_seq_thang (nam, thang, last_seq) values (y, m, 1)
      on conflict (nam, thang) do update set last_seq = so_don_hang_seq_thang.last_seq + 1
      returning last_seq into seq;
    new.so_don_hang := 'CHP' || ma_loai || lpad((y % 100)::text, 2, '0') || lpad(m::text, 2, '0') || lpad(seq::text, 3, '0');
  end if;
  return new;
end;
$$;
