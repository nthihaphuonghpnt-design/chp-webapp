-- ============================================================================
-- Phat hien trong dot QA toan dien: RLS "don_hang_update" dang cho phep
-- ('Sale','Hiện trường','Chứng từ') — LECH voi "don_hang_insert" (('Sale',
-- 'Chứng từ','Giám đốc')) va lech voi canManageDonHang() (Sale/Chứng từ/
-- Giám đốc, permissions.ts) ma UI /don-hang/[id]/sua dung de chan trang.
--
-- Hau qua nghiem trong: Giám đốc VAO DUOC trang sua don hang (UI cho phep
-- theo canManageDonHang()), sua xong bam Luu — nhung RLS UPDATE khong co
-- Giám đốc nen cau update khop 0 dong. DonHangForm.tsx (dong 115) goi
-- supabase.from("don_hang").update(payload).eq("id", initial.id) KHONG co
-- .select() — PostgREST tra ve error=null ngay ca khi update khop 0 dong (do
-- RLS loc het), nen code khong thay loi, van router.push sang trang chi tiet
-- nhu thanh cong — nhung DU LIEU KHONG HE DUOC LUU. Giam doc se nghi da sua
-- xong (gia, khach hang, ngay...) nhung thuc te don hang khong doi gi ca —
-- mat du lieu am tham, khong loi bao.
--
-- 'Hiện trường' cung co trong policy nay — KIEM TRA KY truoc khi dong ý bo:
-- ConfirmButtons.tsx dung chinh update nay de Hiện trường tu toggle cot
-- ops_xac_nhan ("Xác nhận hoàn thành (Hiện trường)" ngay tren trang chi tiet
-- don hang) — day la tinh nang dang dung that, KHONG duoc bo Hiện trường
-- khoi policy nay keo gay regression. Chi them 'Giám đốc' con thieu, giu
-- nguyen moi role khac.
--
-- (Ghi chu rieng, chua fix trong migration nay: viec Hiện trường co quyen
-- UPDATE ca cot gia/khach_hang_id/ngay_len_don... — khong chi rieng
-- ops_xac_nhan — la quyen rong hon can thiet so voi tinh nang thuc te dang
-- dung; neu muon siet chat hon co the ap dung pattern "revoke update tu
-- authenticated, grant update (safe_cols)" da dung o migration 0058/0061 de
-- gioi han Hiện trường chi sua duoc ops_xac_nhan — de lai cho 1 dot rieng vi
-- can test ky, khong lam voi trong dot QA nay.)
-- ============================================================================

drop policy if exists "don_hang_update" on don_hang;
create policy "don_hang_update" on don_hang for update to authenticated
  using (current_phong_ban() = any (array['Sale', 'Hiện trường', 'Chứng từ', 'Giám đốc']));
