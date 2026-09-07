-- ============================================================================
-- Chuan bi du lieu cho Luat Thue TNCN moi (Luat so 109/2025/QH15, hieu luc tu
-- 1/7/2026): giam tru gia canh tinh theo NGUOI PHU THUOC, nen can them cot
-- luu so nguoi phu thuoc cua tung nhan vien. Cong thuc/bac thue moi nam trong
-- code (src/lib/luong.ts), khong can migration rieng cho phan do.
-- ============================================================================

alter table nhan_vien add column if not exists so_nguoi_phu_thuoc integer not null default 0;
