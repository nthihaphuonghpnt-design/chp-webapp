-- ============================================================================
-- Vong doi hoa don xuat: Da phat hanh -> Da dieu chinh / Da thay the / Da huy.
-- Thay the co che "xoa thang" hien tai (raw DELETE tu client, xem
-- HoaDonView.tsx handleDelete) bang mot state machine co audit day du qua
-- nhat_ky_thao_tac (0067). Khong mo hinh hoa trang thai "Nhap" vi luong tao
-- hoa don hien tai (RPC xuat_hoa_don_tu_bang_ke, 0068) luon tao hoa don da
-- phat hanh ngay, khong co buoc nhap nao ton tai de can trang thai do.
--
-- QUY TAC TINH VAT THEO KY (ap dung trong src/lib/vat.ts, ghi ro o day de
-- code va schema luon nhat quan voi nhau):
--   - trang_thai = 'Da huy'      -> LOAI khoi moi tong hop VAT (coi nhu chua
--                                    tung phat sinh).
--   - trang_thai = 'Da dieu chinh' (dong GOC) -> VAN TINH vao ky cua chinh no
--                                    (no thuc su da phat sinh va duoc ke khai
--                                    o ky do). Dong "Dieu chinh" moi (delta)
--                                    tinh rieng vao ky cua no.
--   - trang_thai = 'Da thay the' (dong GOC)   -> LOAI khoi tong hop (coi nhu
--                                    chua tung phat hanh hop le). Chi dong
--                                    "Thay the" moi (tong day du) duoc tinh,
--                                    vao ky cua no.
--   GIOI HAN: he thong chua co khai niem "ky da nop to khai", nen khong phan
--   biet duoc truong hop phai lam to khai bo sung (01/KHBS theo Nghi dinh
--   123/2020/NDCP) khi ky goc da nop truoc do — quy tac tren la don gian hoa
--   hop ly cho v1, PHAI duoc neu ro trong UI Bao cao VAT, khong duoc am tham
--   bo qua.
-- ============================================================================

alter table hoa_don_xuat
  add column if not exists trang_thai text not null default 'Đã phát hành'
    check (trang_thai in ('Đã phát hành', 'Đã điều chỉnh', 'Đã thay thế', 'Đã hủy')),
  add column if not exists loai_hoa_don text not null default 'Gốc'
    check (loai_hoa_don in ('Gốc', 'Điều chỉnh', 'Thay thế')),
  add column if not exists hoa_don_goc_id uuid references hoa_don_xuat(id),
  add column if not exists hoa_don_thay_the_id uuid references hoa_don_xuat(id);

create index if not exists idx_hoa_don_xuat_hoa_don_goc_id on hoa_don_xuat(hoa_don_goc_id);
create index if not exists idx_hoa_don_xuat_trang_thai on hoa_don_xuat(trang_thai);
