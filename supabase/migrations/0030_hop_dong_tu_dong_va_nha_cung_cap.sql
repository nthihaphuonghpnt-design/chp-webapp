-- ============================================================================
-- Hop dong ap dung duoc cho ca Nha cung cap (khong chi Khach hang), va tu
-- dong sinh 1 dong "Chua co hop dong" moi khi them Khach hang/Nha cung cap
-- moi — de khong bo sot. Trang thai tu chuyen "Da co hop dong" khi dinh kem
-- tep xong.
-- ============================================================================

alter table hop_dong_khach_hang alter column khach_hang_id drop not null;
alter table hop_dong_khach_hang add column if not exists nha_cung_cap_id uuid references nha_cung_cap(id) on delete cascade;
alter table hop_dong_khach_hang add column if not exists trang_thai_hop_dong text not null default 'Chưa có hợp đồng'
  check (trang_thai_hop_dong in ('Chưa có hợp đồng', 'Đã có hợp đồng'));

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'hdkh_doi_tuong_check') then
    alter table hop_dong_khach_hang add constraint hdkh_doi_tuong_check check (
      (khach_hang_id is not null and nha_cung_cap_id is null)
      or (khach_hang_id is null and nha_cung_cap_id is not null)
    );
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- Tu dong tao "Chua co hop dong" khi them Khach hang / Nha cung cap moi
-- ----------------------------------------------------------------------------
create or replace function auto_tao_hop_dong_khach_hang()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into hop_dong_khach_hang (khach_hang_id, trang_thai_hop_dong) values (new.id, 'Chưa có hợp đồng');
  return new;
end;
$$;

drop trigger if exists after_khach_hang_tao_hop_dong on khach_hang;
create trigger after_khach_hang_tao_hop_dong
  after insert on khach_hang
  for each row execute function auto_tao_hop_dong_khach_hang();

create or replace function auto_tao_hop_dong_nha_cung_cap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into hop_dong_khach_hang (nha_cung_cap_id, trang_thai_hop_dong) values (new.id, 'Chưa có hợp đồng');
  return new;
end;
$$;

drop trigger if exists after_nha_cung_cap_tao_hop_dong on nha_cung_cap;
create trigger after_nha_cung_cap_tao_hop_dong
  after insert on nha_cung_cap
  for each row execute function auto_tao_hop_dong_nha_cung_cap();

-- ----------------------------------------------------------------------------
-- Tu dong chuyen trang thai "Da co hop dong" khi dinh kem tep xong
-- ----------------------------------------------------------------------------
create or replace function auto_cap_nhat_trang_thai_hop_dong()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.hop_dong_id is not null then
    update hop_dong_khach_hang set trang_thai_hop_dong = 'Đã có hợp đồng' where id = new.hop_dong_id;
  end if;
  return new;
end;
$$;

drop trigger if exists after_dinh_kem_cap_nhat_hop_dong on dinh_kem;
create trigger after_dinh_kem_cap_nhat_hop_dong
  after insert on dinh_kem
  for each row execute function auto_cap_nhat_trang_thai_hop_dong();

-- ----------------------------------------------------------------------------
-- Cho phep Ke toan them/sua hop dong Nha cung cap (Chung tu chi lien quan
-- khach hang theo ma tran cu, nen chi Ke toan quan ly them nha cung cap).
-- Chinh sach insert/update/select hien co da du (theo Sale/Chung tu/Ke toan/
-- Giam doc), khong can doi.
-- ============================================================================

-- Nap san 1 dong "Chua co hop dong" cho cac khach hang/NCC da ton tai tu
-- truoc (chua duoc trigger tao vi trigger chi chay khi INSERT MOI).
insert into hop_dong_khach_hang (khach_hang_id, trang_thai_hop_dong)
select k.id, 'Chưa có hợp đồng'
from khach_hang k
where not exists (select 1 from hop_dong_khach_hang h where h.khach_hang_id = k.id);

insert into hop_dong_khach_hang (nha_cung_cap_id, trang_thai_hop_dong)
select n.id, 'Chưa có hợp đồng'
from nha_cung_cap n
where not exists (select 1 from hop_dong_khach_hang h where h.nha_cung_cap_id = n.id);
