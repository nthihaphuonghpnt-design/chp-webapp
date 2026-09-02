-- ============================================================================
-- Them trang thai "Khong can hop dong" cho hop_dong_khach_hang — dung cho
-- cac cong ty con chi dung ten de dung to khai (khong truc tiep ky hop
-- dong, vd Amal/Hong Ngoc thuoc nhom Apple Trans). Ke toan tick 1 lan la
-- dong nay bien mat khoi bo loc "Chi hien chua co hop dong", khong bi
-- nhac lai nua.
-- ============================================================================

do $$
declare
  cname text;
begin
  select conname into cname
  from pg_constraint
  where conrelid = 'hop_dong_khach_hang'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%trang_thai_hop_dong%';
  if cname is not null then
    execute format('alter table hop_dong_khach_hang drop constraint %I', cname);
  end if;
end $$;

alter table hop_dong_khach_hang add constraint hop_dong_khach_hang_trang_thai_hop_dong_check
  check (trang_thai_hop_dong in ('Chưa có hợp đồng', 'Đã có hợp đồng', 'Không cần hợp đồng'));
