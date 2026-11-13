-- ============================================================================
-- Phase 1 cua ke hoach "So sach ke toan kep day du theo TT133": bang danh muc
-- Tai khoan ke toan + So nhat ky chung (but_toan/but_toan_dong). Day la nen
-- tang — chua noi vao bat ky nghiep vu nao (Phase 2 lam viec do).
--
-- Quy uoc:
--   - So tien luon DUONG, chieu No/Co tach rieng cot text (loai_ghi_so) —
--     dung y het quy uoc da dung o so_quy (loai_giao_dich 'Thu'/'Chi').
--   - Khong co insert/update/delete policy cho client tren ca 2 bang — chi
--     ghi qua cac RPC "ghi_so_..." (security definer) se viet o Phase 2,
--     dung y het khuon mau nhat_ky_thao_tac/so_quy da dung toan du an.
--   - but_toan_dong KHONG BAO GIO duoc UPDATE sau khi da ghi — muon sua thi
--     tao but_toan dao (but_toan_dao_id tro nguoc) roi ghi but_toan dung moi.
--   - but_toan co cot loai_but_toan + unique (nguon_bang, nguon_id,
--     loai_but_toan) de 1 dong nguon co the sinh NHIEU but_toan khac loai
--     (vd 1 hoa don xuat: 1 but_toan luc phat hanh, 1 but_toan luc thu tien)
--     nhung khong bi ghi trung khi RPC goi lai nhieu lan.
-- ============================================================================

create table if not exists tai_khoan_ke_toan (
  ma_tk text primary key,
  ten_tk text not null,
  loai text not null check (loai in (
    'Tài sản', 'Nợ phải trả', 'Vốn chủ sở hữu', 'Doanh thu', 'Giá vốn',
    'Chi phí', 'Xác định kết quả kinh doanh'
  )),
  ma_tk_cha text references tai_khoan_ke_toan(ma_tk),
  created_at timestamptz not null default now()
);

alter table tai_khoan_ke_toan enable row level security;

create policy "tkkt_select" on tai_khoan_ke_toan for select to authenticated
  using (current_phong_ban() in ('Kế toán', 'Giám đốc'));
-- Khong co insert/update/delete policy cho client — danh muc TK chi sua qua
-- migration (hiem khi doi), khong phai nghiep vu hang ngay.

-- Seed day du hon dinhKhoan.ts (file do chi co 17 TK dung lam nhan Excel) —
-- them cac TK can cho BCTC day du: 1388 (phai thu khac, dung cho phan chi
-- ho), 411/421 (von/loi nhuan), 511 cat giam con 511 don (CHP khong ban
-- hang hoa, chi dich vu, khong can 5111/5113), 515/635 (doanh thu/chi phi
-- tai chinh, tao san de dung khi phat sinh lai tien gui/lai vay), 911 (xac
-- dinh KQKD, chi dung noi bo luc ket chuyen cuoi ky, khong hien thi rieng
-- tren bang can doi).
insert into tai_khoan_ke_toan (ma_tk, ten_tk, loai, ma_tk_cha) values
  ('111', 'Tiền mặt', 'Tài sản', null),
  ('112', 'Tiền gửi ngân hàng', 'Tài sản', null),
  ('131', 'Phải thu của khách hàng', 'Tài sản', null),
  ('133', 'Thuế GTGT được khấu trừ', 'Tài sản', null),
  ('138', 'Phải thu khác', 'Tài sản', null),
  ('1388', 'Phải thu khác (chi hộ)', 'Tài sản', '138'),
  ('141', 'Tạm ứng', 'Tài sản', null),
  ('331', 'Phải trả cho người bán', 'Nợ phải trả', null),
  ('333', 'Thuế và các khoản phải nộp Nhà nước', 'Nợ phải trả', null),
  ('3331', 'Thuế GTGT đầu ra', 'Nợ phải trả', '333'),
  ('3335', 'Thuế TNCN phải nộp (khấu trừ hộ người lao động)', 'Nợ phải trả', '333'),
  ('334', 'Phải trả người lao động', 'Nợ phải trả', null),
  ('338', 'Phải trả, phải nộp khác', 'Nợ phải trả', null),
  ('3382', 'Kinh phí công đoàn phải nộp', 'Nợ phải trả', '338'),
  ('3383', 'Bảo hiểm xã hội phải nộp', 'Nợ phải trả', '338'),
  ('3384', 'Bảo hiểm y tế phải nộp', 'Nợ phải trả', '338'),
  ('3385', 'Bảo hiểm thất nghiệp phải nộp', 'Nợ phải trả', '338'),
  ('3388', 'Phải trả, phải nộp khác (dư thừa/credit khách & NCC)', 'Nợ phải trả', '338'),
  ('411', 'Vốn chủ sở hữu', 'Vốn chủ sở hữu', null),
  ('421', 'Lợi nhuận sau thuế chưa phân phối', 'Vốn chủ sở hữu', null),
  ('511', 'Doanh thu bán hàng và cung cấp dịch vụ', 'Doanh thu', null),
  ('515', 'Doanh thu hoạt động tài chính', 'Doanh thu', null),
  ('632', 'Giá vốn hàng bán', 'Giá vốn', null),
  ('635', 'Chi phí tài chính', 'Chi phí', null),
  ('642', 'Chi phí quản lý kinh doanh', 'Chi phí', null),
  ('911', 'Xác định kết quả kinh doanh', 'Xác định kết quả kinh doanh', null)
on conflict (ma_tk) do nothing;

create table if not exists but_toan (
  id uuid primary key default gen_random_uuid(),
  ngay_ghi_so date not null,
  ky_ke_toan text not null, -- dang 'YYYY-MM', tinh san luc ghi de khoi tinh lai moi lan doc bao cao
  dien_giai text not null,
  loai_but_toan text not null, -- 'phat_sinh' | 'thu_tien' | 'dieu_chinh' | 'thay_the' | 'huy' | 'dao' | 'ket_chuyen' | 'so_du_dau_ky' ...
  nguon_bang text not null,
  nguon_id uuid not null,
  but_toan_dao_id uuid references but_toan(id),
  created_at timestamptz not null default now(),
  unique (nguon_bang, nguon_id, loai_but_toan)
);

create index if not exists idx_but_toan_ky on but_toan (ky_ke_toan);
create index if not exists idx_but_toan_nguon on but_toan (nguon_bang, nguon_id);

create table if not exists but_toan_dong (
  id uuid primary key default gen_random_uuid(),
  but_toan_id uuid not null references but_toan(id),
  ma_tk text not null references tai_khoan_ke_toan(ma_tk),
  loai_ghi_so text not null check (loai_ghi_so in ('Nợ', 'Có')),
  so_tien numeric not null check (so_tien > 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_but_toan_dong_but_toan on but_toan_dong (but_toan_id);
create index if not exists idx_but_toan_dong_tk on but_toan_dong (ma_tk);

alter table but_toan enable row level security;
alter table but_toan_dong enable row level security;

create policy "but_toan_select" on but_toan for select to authenticated
  using (current_phong_ban() in ('Kế toán', 'Giám đốc'));
create policy "but_toan_dong_select" on but_toan_dong for select to authenticated
  using (current_phong_ban() in ('Kế toán', 'Giám đốc'));
-- Khong co insert/update/delete policy cho client tren ca 2 bang — chi ghi
-- qua cac RPC "ghi_so_..."/"dao_but_toan" (security definer) cua Phase 2-3.

-- ----------------------------------------------------------------------------
-- Helper dung chung cho moi RPC ghi so o Phase 2+: tao 1 but_toan + N dong,
-- kiem tra No = Co truoc khi tra ve, raise exception neu lech (khong duoc
-- phep ghi 1 but_toan mat can doi). Goi tu ben trong cac ham "ghi_so_..."
-- khac, khong expose truc tiep cho client (khong grant execute cho
-- authenticated) — dung dung "p_dong" la mang jsonb [{ma_tk, loai_ghi_so,
-- so_tien}, ...] de goi gon trong 1 lan insert.
-- ----------------------------------------------------------------------------
create or replace function tao_but_toan_can_bang(
  p_ngay_ghi_so date,
  p_dien_giai text,
  p_loai_but_toan text,
  p_nguon_bang text,
  p_nguon_id uuid,
  p_dong jsonb,
  p_but_toan_dao_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_but_toan_id uuid;
  v_tong_no numeric;
  v_tong_co numeric;
begin
  insert into but_toan (ngay_ghi_so, ky_ke_toan, dien_giai, loai_but_toan, nguon_bang, nguon_id, but_toan_dao_id)
  values (p_ngay_ghi_so, to_char(p_ngay_ghi_so, 'YYYY-MM'), p_dien_giai, p_loai_but_toan, p_nguon_bang, p_nguon_id, p_but_toan_dao_id)
  returning id into v_but_toan_id;

  insert into but_toan_dong (but_toan_id, ma_tk, loai_ghi_so, so_tien)
  select v_but_toan_id, (d->>'ma_tk'), (d->>'loai_ghi_so'), (d->>'so_tien')::numeric
  from jsonb_array_elements(p_dong) d;

  select coalesce(sum(so_tien) filter (where loai_ghi_so = 'Nợ'), 0),
         coalesce(sum(so_tien) filter (where loai_ghi_so = 'Có'), 0)
  into v_tong_no, v_tong_co
  from but_toan_dong where but_toan_id = v_but_toan_id;

  if v_tong_no <> v_tong_co then
    raise exception 'Bút toán mất cân đối: Nợ % khác Có % (nguồn %/%)', v_tong_no, v_tong_co, p_nguon_bang, p_nguon_id;
  end if;

  return v_but_toan_id;
end;
$$;
-- Khong grant execute cho authenticated — chi goi duoc tu ben trong cac ham
-- security definer khac (chay voi quyen chu ham, khong can grant rieng).
