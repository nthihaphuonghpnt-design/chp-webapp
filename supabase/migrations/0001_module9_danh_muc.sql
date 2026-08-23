-- ============================================================================
-- Module 9: Danh muc Dung chung (master data) — nen tang cho toan bo he thong
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Phong ban (co dinh: Sale, Hien truong, Dieu phoi, Chung tu, Ke toan, Giam doc)
-- ----------------------------------------------------------------------------
create table if not exists phong_ban (
  id uuid primary key default gen_random_uuid(),
  ten text not null unique,
  ghi_chu text,
  created_at timestamptz not null default now()
);

insert into phong_ban (ten) values
  ('Sale'), ('Hiện trường'), ('Điều phối'), ('Chứng từ'), ('Kế toán'), ('Giám đốc')
on conflict (ten) do nothing;

-- ----------------------------------------------------------------------------
-- Nhan vien — gan voi phong ban, lien ket toi tai khoan dang nhap Supabase Auth
-- ----------------------------------------------------------------------------
create table if not exists nhan_vien (
  id uuid primary key default gen_random_uuid(),
  ho_ten text not null,
  phong_ban_id uuid not null references phong_ban(id),
  email_tai_khoan text unique,
  so_dien_thoai text,
  auth_user_id uuid unique references auth.users(id) on delete set null,
  dang_lam_viec boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Khach hang
-- ----------------------------------------------------------------------------
create table if not exists khach_hang (
  id uuid primary key default gen_random_uuid(),
  ten_day_du text not null,
  ten_viet_tat text,
  dia_chi text,
  ma_so_thue text,
  nguoi_lien_he text,
  dien_thoai text,
  email text,
  ghi_chu text,
  dang_hoat_dong boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Nha cung cap / doi tac dich vu chi phi (boc xep, kiem dich...)
-- ----------------------------------------------------------------------------
create table if not exists nha_cung_cap (
  id uuid primary key default gen_random_uuid(),
  ten text not null,
  dia_chi text,
  nguoi_lien_he text,
  dien_thoai text,
  email text,
  ghi_chu text,
  dang_hoat_dong boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Doi tac thue ngoai (van tai / hang tau / dai ly cuoc bien / dich vu khac)
-- ----------------------------------------------------------------------------
create table if not exists doi_tac_thue_ngoai (
  id uuid primary key default gen_random_uuid(),
  ten text not null,
  nhom text not null check (nhom in ('Công ty đối tác (vận tải)', 'Hãng tàu', 'Đại lý cước biển', 'Dịch vụ khác')),
  dia_chi text,
  nguoi_lien_he text,
  dien_thoai text,
  email text,
  ghi_chu text,
  dang_hoat_dong boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Loai chi phi
-- ----------------------------------------------------------------------------
create table if not exists loai_chi_phi (
  id uuid primary key default gen_random_uuid(),
  ten text not null,
  nhom_chi_phi text,
  ghi_chu text,
  dang_hoat_dong boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Loai container
-- ----------------------------------------------------------------------------
create table if not exists loai_container (
  id uuid primary key default gen_random_uuid(),
  ten text not null,
  ghi_chu text,
  dang_hoat_dong boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Hang hoa
-- ----------------------------------------------------------------------------
create table if not exists hang_hoa (
  id uuid primary key default gen_random_uuid(),
  ten text not null,
  ghi_chu text,
  dang_hoat_dong boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Dia diem (cang, kho, noi giao nhan...)
-- ----------------------------------------------------------------------------
create table if not exists dia_diem (
  id uuid primary key default gen_random_uuid(),
  ten text not null,
  loai text check (loai in ('Cảng', 'Kho', 'Nơi giao nhận', 'Khác')),
  dia_chi text,
  ghi_chu text,
  dang_hoat_dong boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Xe van chuyen (thue ngoai, de chon khi nhap lo hang)
-- ----------------------------------------------------------------------------
create table if not exists xe_van_chuyen (
  id uuid primary key default gen_random_uuid(),
  so_xe text not null,
  loai_xe text,
  doi_tac_thue_ngoai_id uuid references doi_tac_thue_ngoai(id),
  ghi_chu text,
  dang_hoat_dong boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- Helper: phong ban cua nguoi dang dang nhap (dung trong RLS toan he thong)
-- ============================================================================
create or replace function current_phong_ban()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select pb.ten
  from nhan_vien nv
  join phong_ban pb on pb.id = nv.phong_ban_id
  where nv.auth_user_id = auth.uid()
  limit 1
$$;

-- ============================================================================
-- Row Level Security
-- Quy tac chung cho Module 9 (theo ma tran phan quyen):
--   - Xem (SELECT): moi nhan vien da dang nhap (can de chon trong dropdown o cac module khac)
--   - Them/Sua (INSERT/UPDATE): chi phong "Ke toan"
--   - Khong cho DELETE tu app (chi ngung hoat dong qua dang_hoat_dong=false)
-- ============================================================================

alter table phong_ban enable row level security;
alter table nhan_vien enable row level security;
alter table khach_hang enable row level security;
alter table nha_cung_cap enable row level security;
alter table doi_tac_thue_ngoai enable row level security;
alter table loai_chi_phi enable row level security;
alter table loai_container enable row level security;
alter table hang_hoa enable row level security;
alter table dia_diem enable row level security;
alter table xe_van_chuyen enable row level security;

-- phong_ban: chi doc, khong sua tu app
create policy "phong_ban_select" on phong_ban for select to authenticated using (true);

-- nhan_vien: moi nguoi xem duoc danh sach (de chon nguoi phu trach...); chi Ke toan them/sua
create policy "nhan_vien_select" on nhan_vien for select to authenticated using (true);
create policy "nhan_vien_insert" on nhan_vien for insert to authenticated with check (current_phong_ban() = 'Kế toán');
create policy "nhan_vien_update" on nhan_vien for update to authenticated using (current_phong_ban() = 'Kế toán');

-- cac danh muc con lai: cung 1 quy tac
do $$
declare
  t text;
begin
  foreach t in array array['khach_hang','nha_cung_cap','doi_tac_thue_ngoai','loai_chi_phi','loai_container','hang_hoa','dia_diem','xe_van_chuyen']
  loop
    execute format('create policy "%s_select" on %I for select to authenticated using (true)', t, t);
    execute format('create policy "%s_insert" on %I for insert to authenticated with check (current_phong_ban() = ''Kế toán'')', t, t);
    execute format('create policy "%s_update" on %I for update to authenticated using (current_phong_ban() = ''Kế toán'')', t, t);
  end loop;
end $$;

-- ============================================================================
-- updated_at tu dong cap nhat
-- ============================================================================
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['nhan_vien','khach_hang','nha_cung_cap','doi_tac_thue_ngoai','loai_chi_phi','loai_container','hang_hoa','dia_diem','xe_van_chuyen']
  loop
    execute format('create trigger set_updated_at before update on %I for each row execute function set_updated_at()', t);
  end loop;
end $$;

-- ============================================================================
-- Tu dong lien ket tai khoan dang nhap (Supabase Auth) voi ho so nhan vien,
-- dua tren email trung khop — de Ke toan khong can thao tac SQL thu cong.
-- Ap dung cho ca 2 thu tu: tao tai khoan Auth truoc hoac tao ho so nhan_vien truoc.
-- ============================================================================

-- Truong hop 1: tai khoan Auth duoc tao SAU khi da co ho so nhan_vien
create or replace function link_nhan_vien_on_auth_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update nhan_vien
  set auth_user_id = new.id
  where email_tai_khoan = new.email
    and auth_user_id is null;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function link_nhan_vien_on_auth_signup();

-- Truong hop 2: ho so nhan_vien duoc tao/sua SAU khi tai khoan Auth da ton tai
create or replace function link_auth_on_nhan_vien_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email_tai_khoan is not null and new.auth_user_id is null then
    select id into new.auth_user_id
    from auth.users
    where email = new.email_tai_khoan
    limit 1;
  end if;
  return new;
end;
$$;

drop trigger if exists before_nhan_vien_upsert on nhan_vien;
create trigger before_nhan_vien_upsert
  before insert or update of email_tai_khoan on nhan_vien
  for each row execute function link_auth_on_nhan_vien_change();
