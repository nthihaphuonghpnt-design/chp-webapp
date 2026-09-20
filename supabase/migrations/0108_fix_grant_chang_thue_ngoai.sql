-- ============================================================================
-- Fix regression tu 0107: migration do chi "alter table add column" ma
-- QUEN grant select cho cot moi — 0061 da REVOKE select toan bang
-- don_thue_ngoai va chi grant lai theo danh sach cot CU (chup tai thoi
-- diem 0061 chay, truoc khi co chi_tiet_van_chuyen_id). Cot moi khong nam
-- trong danh sach do nen KHONG doc duoc — moi INSERT/UPDATE co
-- .select(DON_THUE_NGOAI_SAFE_COLS) (gio da gom cot moi) deu loi "permission
-- denied for table don_thue_ngoai", chan luon ca Ke toan nhap don thue
-- ngoai moi (dung y het pattern grant da dung dung o 0062/0065 khi cac
-- migration do them cot moi vao don_thue_ngoai — 0107 bo sot buoc nay).
-- ============================================================================

grant select (chi_tiet_van_chuyen_id) on don_thue_ngoai to authenticated;
