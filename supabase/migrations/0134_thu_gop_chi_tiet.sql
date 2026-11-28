-- ============================================================================
-- C2 (yeu cau 27/11/2026): "Thu gop nhieu hoa don" — 1 lan chuyen khoan tra
-- gop nhieu hoa don cung luc duoc ghi vao So quy nhu 1 dong DUY NHAT
-- (nguon_bang = 'thu_gop_thu_cong', vd dong 2026-11-17 = 42,951,600 cho 9 HD),
-- nhung chi co 1 ghi chu dai liet ke so hoa don bang TEXT — khong co cach nao
-- tra cuu lai co cau truc "hoa don nao duoc bao nhieu tien", va khong the phat
-- hien tu dong khi tong hoa don da gan lech voi so tien thuc nhan (vd 2 hoa
-- don C26TAA-91/95 duoc ghi trong noi dung nhung chua tung duoc tao trong app
-- — lech 3,272,400 khong duoc canh bao o dau ca).
--
-- Them 1 bang chi tiet phan bo (khong doi kien truc "so_quy la bang dan xuat"
-- — bang nay la DU LIEU BO SUNG cho 1 dong so_quy da co san, khong sinh ra
-- dong so_quy moi nao ca) de UI tra cuu/hien thi danh sach hoa don + so tien
-- rieng tung hoa don, va tinh duoc canh bao chenh lech ngay tren So quy.
-- ============================================================================

create table if not exists thu_gop_chi_tiet (
  id uuid primary key default gen_random_uuid(),
  so_quy_id uuid not null references so_quy(id) on delete cascade,
  hoa_don_id uuid not null references hoa_don_xuat(id),
  so_tien numeric not null check (so_tien > 0),
  created_at timestamptz not null default now()
);

create index if not exists thu_gop_chi_tiet_so_quy_id_idx on thu_gop_chi_tiet(so_quy_id);
create index if not exists thu_gop_chi_tiet_hoa_don_id_idx on thu_gop_chi_tiet(hoa_don_id);

alter table thu_gop_chi_tiet enable row level security;

create policy "tgct_select" on thu_gop_chi_tiet for select to authenticated
  using (current_phong_ban() in ('Kế toán', 'Giám đốc'));
create policy "tgct_insert" on thu_gop_chi_tiet for insert to authenticated
  with check (current_phong_ban() = 'Kế toán');
create policy "tgct_update" on thu_gop_chi_tiet for update to authenticated
  using (current_phong_ban() = 'Kế toán');
create policy "tgct_delete" on thu_gop_chi_tiet for delete to authenticated
  using (current_phong_ban() = 'Kế toán');

-- Backfill dong thu gop 2026-11-17 (42,951,600, Tai khoan cong ty) — 7/9 hoa
-- don ghi trong noi dung DA ton tai va da duoc danh dau "Da thu du" dung so
-- tien (xac nhan qua doi chieu: tong 7 hoa don = 39,679,200, khop chenh lech
-- 3,272,400 ma nguoi dung bao cao). C26TAA-91 va C26TAA-95 KHONG co trong
-- bang hoa_don_xuat (da kiem tra truc tiep) — co the la ghi nham so tren sao
-- ke ngan hang hoac hoa don chua duoc tao trong app, CAN NGUOI DUNG XAC NHAN
-- truoc khi tao moi, nen KHONG tu y them vao day.
insert into thu_gop_chi_tiet (so_quy_id, hoa_don_id, so_tien)
select 'cf074483-d596-4ff5-ae17-5be08db5b9e5'::uuid, hd.id, hd.tong_tien
from hoa_don_xuat hd
where hd.so_hoa_don in ('C26TAA-80', 'C26TAA-81', 'C26TAA-82', 'C26TAA-83', 'C26TAA-93', 'C26TAA-94', 'C26TAA-106');
