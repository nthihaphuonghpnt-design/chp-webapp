-- ============================================================================
-- P1 muc 6 + 7 (YEU_CAU_SUA_WEBAPP_CHP.md, 2026-11-26):
--
-- 1) So quy (Tien mat) dang tinh "Ton dau ky" bang cach CONG DON toan bo giao
--    dich tu truoc gio — vi du moi nhap thieu/sai tu lau da lam con so nay am
--    rat sau (-1,25 ty) ma khong co cach nao "chot lai" de bat dau sach. Them
--    bang chot_so_du_dau_ky dung CHUNG cho ca So quy va Tiem ung nhan vien:
--    Ke toan nhap 1 moc "so du dung tai ngay X", moi tinh toan "dau ky" ke tu
--    do chi can moc gan nhat + cong don tu ngay do thay vi tu dau thoi gian.
--    Khong sua/xoa so lieu cu — chi them 1 moc tham chieu moi.
-- 2) Tam ung: "Nguon tien" — mo rong tap gia tri phuong_thuc de co 1 lua chon
--    tuong minh "khong qua so quy cong ty" (truoc gio neu ke toan de trong
--    phuong_thuc thi da khong ghi so quy, nhung khong ro rang la CO CHU Y hay
--    QUEN chon) — sua lai trigger de chi cac gia tri Tien mat/Tai khoan cong
--    ty moi day vao so_quy.
-- ============================================================================

create table if not exists chot_so_du_dau_ky (
  id uuid primary key default gen_random_uuid(),
  -- 'so_quy_tien_mat' | 'so_quy_tai_khoan_cong_ty' | 'tam_ung_nhan_vien'
  doi_tuong_loai text not null check (doi_tuong_loai in ('so_quy_tien_mat', 'so_quy_tai_khoan_cong_ty', 'tam_ung_nhan_vien')),
  -- null cho 2 loai so_quy (chi co 1 so moi loai); la nhan_vien_id cho tam_ung_nhan_vien
  nhan_vien_id uuid references nhan_vien(id),
  ngay_ap_dung date not null,
  so_du numeric not null,
  ghi_chu text,
  nguoi_chot_id uuid references nhan_vien(id),
  created_at timestamptz not null default now(),
  constraint doi_tuong_khop_nhan_vien check (
    (doi_tuong_loai = 'tam_ung_nhan_vien' and nhan_vien_id is not null)
    or (doi_tuong_loai <> 'tam_ung_nhan_vien' and nhan_vien_id is null)
  )
);

create index if not exists idx_chot_so_du_dau_ky_tra_cuu on chot_so_du_dau_ky (doi_tuong_loai, nhan_vien_id, ngay_ap_dung desc);

alter table chot_so_du_dau_ky enable row level security;

create policy "chot_so_du_select" on chot_so_du_dau_ky for select to authenticated
  using (current_phong_ban() in ('Kế toán', 'Giám đốc'));
create policy "chot_so_du_insert" on chot_so_du_dau_ky for insert to authenticated
  with check (current_phong_ban() = 'Kế toán');
create policy "chot_so_du_delete" on chot_so_du_dau_ky for delete to authenticated
  using (current_phong_ban() = 'Kế toán');
-- Khong co update policy — sua sai thi xoa roi chot lai (giu nguyen lich su don gian).

-- ----------------------------------------------------------------------------
-- Nguon tien cho Tam ung: them 1 gia tri ro rang "khong qua so quy cong ty"
-- (vd that su chuyen khoan tu TK ca nhan cua nguoi tam ung, khong dung tien/
-- TK cong ty) — cac dong nay VAN duoc duyet/theo doi con no binh thuong,
-- chi khong tao dong trong So quy.
-- ----------------------------------------------------------------------------
alter table tam_ung_giai_chi drop constraint if exists tam_ung_giai_chi_phuong_thuc_check;
alter table tam_ung_giai_chi add constraint tam_ung_giai_chi_phuong_thuc_check
  check (phuong_thuc in ('Tiền mặt', 'Tài khoản công ty', 'Chuyển khoản cá nhân (không qua quỹ)'));

create or replace function sync_so_quy_tam_ung()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'DELETE' then
    delete from so_quy where nguon_bang = 'tam_ung_giai_chi' and nguon_id = old.id;
    return old;
  end if;
  delete from so_quy where nguon_bang = 'tam_ung_giai_chi' and nguon_id = new.id;
  if new.trang_thai = 'Đã duyệt' and coalesce(new.so_tien, 0) > 0
     and new.phuong_thuc in ('Tiền mặt', 'Tài khoản công ty') then
    insert into so_quy (loai_so, loai_giao_dich, so_tien, ngay, noi_dung, nguon_bang, nguon_id)
    values (
      new.phuong_thuc,
      case when new.loai = 'Tạm ứng' then 'Chi' else 'Thu' end,
      new.so_tien,
      new.ngay_thuc_hien,
      new.loai || ' - ' || coalesce(new.so_phieu, ''),
      'tam_ung_giai_chi', new.id
    );
  end if;
  return new;
end;
$$;
