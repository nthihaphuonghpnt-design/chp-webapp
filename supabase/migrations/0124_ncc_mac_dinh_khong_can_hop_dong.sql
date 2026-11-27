-- ============================================================================
-- P2 muc 16 (2026-11-27, YEU_CAU_SUA_WEBAPP_CHP.md): nhieu Nha cung cap lat
-- vat (NCC be, dich vu mot lan...) dang bi tinh "Chua co hop dong" (nhac nho
-- lien tuc o trang chu), trong khi thuc te khong can ky hop dong rieng voi
-- nhom nay. Mac dinh moi NCC MOI la "Khong can hop dong" (Ke toan tu chuyen
-- lai "Chua co hop dong" neu NCC do thuc su can ky). Doi voi du lieu CU dang
-- la "Chua co hop dong", chuyen het sang "Khong can hop dong" cung luc —
-- Ke toan ra lai, chon rieng NCC nao thuc su can hop dong de doi lai dung
-- trang thai (safe de doi lai, khong mat du lieu, chi la 1 flag).
-- ============================================================================

update hop_dong_khach_hang
set trang_thai_hop_dong = 'Không cần hợp đồng'
where nha_cung_cap_id is not null and trang_thai_hop_dong = 'Chưa có hợp đồng';

create or replace function auto_tao_hop_dong_nha_cung_cap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into hop_dong_khach_hang (nha_cung_cap_id, trang_thai_hop_dong) values (new.id, 'Không cần hợp đồng');
  return new;
end;
$$;
