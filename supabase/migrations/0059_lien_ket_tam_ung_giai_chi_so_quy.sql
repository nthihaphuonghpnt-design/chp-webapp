-- ============================================================================
-- Lien ket ro rang giua 1 dong "Giai chi" (hoan ung) voi dong "Tam ung" goc
-- cua no, thay vi doan bang nhan_vien_id + don_hang_id nhu truoc — can thiet
-- vi 1 nguoi co the tam ung nhieu lan cho cung 1 lo hang (truong "lan").
--
-- Y NGHIA XAC NHAN VOI NGUOI DUNG: So quy = tien that 100%, phai khop dem
-- tien mat thuc te. Phan tam ung du (chua hoan) la KHOAN NO cua nhan vien —
-- KHONG tao giao dich trong So quy cho toi khi nhan vien THUC SU hoan lai
-- tien mat. Vi vay tu gio, dong "Giai chi" phai duoc hieu la "hoan ung thuc
-- te" (nhap dung so tien nhan vien tra lai), khong phai "so tien da chi tieu
-- (chua hoan)" nhu cach lam cu — sua o code phia UI (khong doi trigger
-- sync_so_quy_tam_ung, van dung y het truoc gio: Giai chi = Thu that trong
-- So quy).
-- ============================================================================

alter table tam_ung_giai_chi add column if not exists tam_ung_goc_id uuid references tam_ung_giai_chi(id) on delete set null;

create index if not exists idx_tam_ung_giai_chi_tam_ung_goc on tam_ung_giai_chi (tam_ung_goc_id);
