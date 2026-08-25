-- ============================================================================
-- Bang gia khach hang co the khac nhau theo tung mat hang (khong chi theo
-- loai chi phi). hang_hoa_id de trong = ap dung chung cho moi mat hang.
-- ============================================================================

alter table bang_gia_khach_hang add column if not exists hang_hoa_id uuid references hang_hoa(id);
