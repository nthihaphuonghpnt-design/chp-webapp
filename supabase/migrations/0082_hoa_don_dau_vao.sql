-- ============================================================================
-- Theo yeu cau nguoi dung (dot QA toan dien): "Dinh phi thang" cu chi co 3
-- cot (thang/khoan muc/so tien) — khong theo doi duoc nha cung cap, so hoa
-- don, thue GTGT, hay da tra/chua tra cho tung hoa don dau vao that (vi du
-- hoa don tien thue van phong, hoa don an uong van phong...). Thay the hoan
-- toan bang bang "hoa_don_dau_vao" day du hon, dung chung cho ca "dinh phi
-- co dinh hang thang" (thue nha, luong...) lan "chi phi phat sinh van
-- phong" (an uong, van phong pham...) — phan biet qua cot loai_chi_phi, cach
-- luu/theo doi giong het nhau.
--
-- Van giu bang dinh_phi_thang cu (khong xoa) de khong mat lich su, nhung tu
-- gio khong con dung lam nguon "dinh phi phan bo/lo" nua — 4 noi dang doc
-- dinh_phi_thang truc tiep (BangLuongView, LuongCuaToiView, BaoCaoView,
-- don-hang/[id]) se chuyen sang goi RPC tong_dinh_phi_theo_thang() thay vi
-- SELECT thang truc tiep — vi hoa_don_dau_vao chua thong tin nhay cam hon
-- (ten NCC, so hoa don, cong no) nen KHONG mo SELECT rong cho moi role nhu
-- bang cu (dpt_select using(true)), chi Ke toan/Giam doc xem duoc toan bang;
-- RPC nay SECURITY DEFINER, tra ve ĐÚNG tong so tien theo thang (khong lo
-- chi tiet NCC/hoa don) de nhan vien khac van xem dung "Luong cua toi" cua
-- chinh minh.
-- ============================================================================

create table if not exists hoa_don_dau_vao (
  id uuid primary key default gen_random_uuid(),
  mau_so_hoa_don text,
  so_hoa_don text,
  ngay_hoa_don date not null default current_date,
  ngay_ky_hoa_don date,
  nha_cung_cap_id uuid references nha_cung_cap(id),
  khoan_muc text not null,
  loai_chi_phi text not null default 'Phát sinh' check (loai_chi_phi in ('Định phí cố định', 'Phát sinh')),
  thang_phan_bo text not null, -- 'YYYY-MM' - thang dung de phan bo dinh phi/lo (giong thang_nam cua bang cu)
  tong_tien_hang numeric not null default 0,
  tien_thue_gtgt numeric not null default 0,
  tong_tien_thanh_toan numeric generated always as (tong_tien_hang + tien_thue_gtgt) stored,
  tinh_trang_thanh_toan text not null default 'Chưa thanh toán' check (tinh_trang_thanh_toan in ('Chưa thanh toán', 'Một phần', 'Đã đủ')),
  so_tien_da_thanh_toan numeric default 0,
  phuong_thuc_thanh_toan text check (phuong_thuc_thanh_toan in ('Tiền mặt', 'Tài khoản công ty')),
  dang_hoat_dong boolean not null default true,
  ghi_chu text,
  nguoi_nhap_id uuid references nhan_vien(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on hoa_don_dau_vao
  for each row execute function set_updated_at();

create index if not exists idx_hddv_thang_phan_bo on hoa_don_dau_vao (thang_phan_bo);

-- ============================================================================
-- Dong bo Sổ quỹ (giong het pattern sync_so_quy_chi_phi) khi hoa don duoc
-- ghi nhan da tra tien that.
-- ============================================================================
create or replace function sync_so_quy_hoa_don_dau_vao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'DELETE' then
    delete from so_quy where nguon_bang = 'hoa_don_dau_vao' and nguon_id = old.id;
    return old;
  end if;
  delete from so_quy where nguon_bang = 'hoa_don_dau_vao' and nguon_id = new.id;
  if coalesce(new.so_tien_da_thanh_toan, 0) > 0 and new.phuong_thuc_thanh_toan is not null and new.dang_hoat_dong then
    insert into so_quy (loai_so, loai_giao_dich, so_tien, ngay, noi_dung, nguon_bang, nguon_id)
    values (new.phuong_thuc_thanh_toan, 'Chi', new.so_tien_da_thanh_toan, coalesce(new.ngay_hoa_don, current_date),
      'Thanh toán hóa đơn đầu vào: ' || new.khoan_muc, 'hoa_don_dau_vao', new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists after_hddv_sync_so_quy on hoa_don_dau_vao;
create trigger after_hddv_sync_so_quy
  after insert or update or delete on hoa_don_dau_vao
  for each row execute function sync_so_quy_hoa_don_dau_vao();

-- ============================================================================
-- Ghi nhat ky (audit log) moi lan sua/xoa — day la cong no/tien that voi NCC,
-- ghi log khong dieu kien (khac hoa_don_xuat chi ghi khi da co tien thu).
-- ============================================================================
create or replace function ghi_nhat_ky_hoa_don_dau_vao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'DELETE' then
    perform ghi_nhat_ky('hoa_don_dau_vao', old.id, 'xoa_hoa_don_dau_vao', null, to_jsonb(old), null);
    return old;
  end if;
  perform ghi_nhat_ky('hoa_don_dau_vao', new.id, 'sua_hoa_don_dau_vao', null, to_jsonb(old), to_jsonb(new));
  return new;
end;
$$;

drop trigger if exists after_hddv_ghi_nhat_ky on hoa_don_dau_vao;
create trigger after_hddv_ghi_nhat_ky
  after update or delete on hoa_don_dau_vao
  for each row execute function ghi_nhat_ky_hoa_don_dau_vao();

-- ============================================================================
-- RPC: tong dinh phi da phan bo theo tung thang — dung cho moi noi can tong
-- (khong lo chi tiet NCC/hoa don) de nhan vien khac (vi du Hien truong xem
-- "Luong cua toi") van tinh dung "dinh phi phan bo/lo" ma khong doc thang
-- duoc bang goc nhay cam nay.
-- ============================================================================
create or replace function tong_dinh_phi_theo_thang()
returns table (thang_nam text, so_tien numeric)
language sql
security definer
set search_path = public
stable
as $$
  select thang_phan_bo as thang_nam, sum(tong_tien_thanh_toan) as so_tien
  from hoa_don_dau_vao
  where dang_hoat_dong = true
  group by thang_phan_bo;
$$;

grant execute on function tong_dinh_phi_theo_thang() to authenticated;

-- ============================================================================
-- Row Level Security — nhay cam hon bang cu (ten NCC, so hoa don, cong no)
-- nen chi Ke toan/Giam doc xem duoc toan bang; sua/them/xoa chi Ke toan.
-- ============================================================================
alter table hoa_don_dau_vao enable row level security;

create policy "hddv_select" on hoa_don_dau_vao for select to authenticated
  using (current_phong_ban() in ('Kế toán', 'Giám đốc'));
create policy "hddv_insert" on hoa_don_dau_vao for insert to authenticated
  with check (current_phong_ban() = 'Kế toán');
create policy "hddv_update" on hoa_don_dau_vao for update to authenticated
  using (current_phong_ban() = 'Kế toán');
create policy "hddv_delete" on hoa_don_dau_vao for delete to authenticated
  using (current_phong_ban() = 'Kế toán');

-- ============================================================================
-- Chuyen du lieu dinh_phi_thang hien co sang bang moi (khong xoa bang cu).
-- Cac dong nay khong co hoa don that (vi du "Luong nhan vien" la tong noi
-- bo) nen de trong cac cot NCC/so hoa don, loai = tuy theo ten khoan muc.
-- ============================================================================
insert into hoa_don_dau_vao (khoan_muc, loai_chi_phi, thang_phan_bo, ngay_hoa_don, tong_tien_hang, tinh_trang_thanh_toan, dang_hoat_dong)
select
  khoan_muc,
  case when khoan_muc ilike '%lương%' or khoan_muc ilike '%bhxh%' then 'Định phí cố định' else 'Phát sinh' end,
  thang_nam,
  (thang_nam || '-01')::date,
  coalesce(so_tien, 0),
  'Chưa thanh toán',
  dang_hoat_dong
from dinh_phi_thang;
