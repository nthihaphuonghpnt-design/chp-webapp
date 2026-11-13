-- ============================================================================
-- Migration 0054 sinh so don hang (CHPXK2608001...) theo nam/thang cua
-- now() (luc insert) thay vi theo ngay_len_don (ngay thuc te cua lo hang)
-- — sai khi nhap lai du lieu lo hang CU (vd nhap hom nay cho lo thang 3,
-- se bi gan nham thanh thang hien tai, lan ca vao dem cua cac don MOI that
-- dang tao trong thang). Sua lai dung theo ngay_len_don cua chinh dong do.
-- ============================================================================

create or replace function generate_so_don_hang()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  y int := extract(year from new.ngay_len_don);
  m int := extract(month from new.ngay_len_don);
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
