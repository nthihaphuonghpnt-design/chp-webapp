-- ============================================================================
-- Module Cham cong (Phase 1/4): tu cham cong theo ngay (trang thai, khong
-- ghi gio vao/ra chi tiet), khoa du lieu ngay da qua, chi Ke toan/Giam doc
-- moi dieu chinh duoc voi luu vet nguoi/thoi gian/ly do.
--
-- Cac phan con lai (lich nghi le, don xin nghi phep, tich hop bang luong,
-- nhac nho tren trang chu) se lam o cac migration tiep theo.
-- ============================================================================

alter table nhan_vien add column if not exists loai_nhan_su text not null default 'Cố định'
  check (loai_nhan_su in ('Cố định', 'Outsource'));
alter table nhan_vien add column if not exists ngay_vao_lam date;

create table if not exists cham_cong (
  id uuid primary key default gen_random_uuid(),
  nhan_vien_id uuid not null references nhan_vien(id) on delete cascade,
  ngay date not null,
  trang_thai text not null check (trang_thai in ('Đi làm', 'Nghỉ phép', 'Nghỉ lễ', 'Nghỉ không phép', 'Nghỉ khác')),
  ghi_chu text,
  nguoi_dieu_chinh_id uuid references nhan_vien(id),
  ly_do_dieu_chinh text,
  thoi_gian_dieu_chinh timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (nhan_vien_id, ngay)
);

create trigger set_updated_at before update on cham_cong
  for each row execute function set_updated_at();

create index if not exists idx_cham_cong_nhan_vien_ngay on cham_cong (nhan_vien_id, ngay);

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table cham_cong enable row level security;

-- Xem: chinh minh, hoac Ke toan/Giam doc xem tat ca.
create policy "cham_cong_select" on cham_cong for select to authenticated
  using (
    current_phong_ban() in ('Kế toán', 'Giám đốc')
    or nhan_vien_id in (select id from nhan_vien where auth_user_id = auth.uid())
  );

-- Them: nhan vien CHI duoc tu cham "Di lam" cho dung ngay hom nay cua chinh
-- minh (khong dieu chinh, khong chon trang thai khac); Ke toan/Giam doc duoc
-- them cho bat ky ai, bat ky ngay nao (duong dieu chinh/bo sung).
-- Dung gio Viet Nam (khong phai UTC cua Postgres) de xac dinh "hom nay", vi
-- database chay UTC — neu dung current_date se sai lech ~7 tieng moi dem.
create policy "cham_cong_insert" on cham_cong for insert to authenticated
  with check (
    (
      nhan_vien_id in (select id from nhan_vien where auth_user_id = auth.uid())
      and ngay = (now() at time zone 'Asia/Ho_Chi_Minh')::date
      and trang_thai = 'Đi làm'
      and nguoi_dieu_chinh_id is null
    )
    or current_phong_ban() in ('Kế toán', 'Giám đốc')
  );

-- Sua: CHI Ke toan/Giam doc (moi truong hop sua sau khi da tao la "dieu
-- chinh", nhan vien khong tu sua duoc data cua minh, ke ca ngay hom nay).
create policy "cham_cong_update" on cham_cong for update to authenticated
  using (current_phong_ban() in ('Kế toán', 'Giám đốc'));

-- Khong co chinh sach delete -> khong ai xoa duoc, giu vet lich su chinh xac.
