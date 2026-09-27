-- Mỗi sự kiện tự động chỉ tạo một việc cho một lô. Giữ nguyên các bản ghi
-- lịch sử (kể cả bản trùng cũ) để kế toán kiểm tra trước khi dọn dữ liệu.
alter table lich_nhac_nho add column if not exists ma_buoc_tu_dong text;

with first_task as (
  select id, row_number() over (partition by don_hang_id, task_type order by created_at, id) as rn, task_type
  from (
    select id, don_hang_id, created_at,
      case
        when noi_dung like 'Chuẩn bị vận chuyển đơn hàng %' then 'chuan_bi_van_chuyen'
        when noi_dung like 'Tiếp nhận chứng từ đơn hàng % (Hiện trường đã hoàn thành)' then 'tiep_nhan_chung_tu'
        when noi_dung like 'Rà soát chi phí đơn hàng % (Chứng từ đã hoàn thành)' then 'ra_soat_chi_phi'
      end as task_type
    from lich_nhac_nho where don_hang_id is not null and ma_buoc_tu_dong is null
  ) t where task_type is not null
)
update lich_nhac_nho l set ma_buoc_tu_dong = f.task_type
from first_task f where l.id = f.id and f.rn = 1;

-- Chỉ gán các nhắc việc tự động chưa hoàn thành theo người phụ trách đã
-- được chỉ định trên lô. Không đoán người cho các việc thủ công không gắn lô.
update lich_nhac_nho l set nguoi_phu_trach_id = d.hien_truong_phu_trach_id
from don_hang d
where l.don_hang_id = d.id and l.ma_buoc_tu_dong = 'chuan_bi_van_chuyen'
  and l.nguoi_phu_trach_id is null and d.hien_truong_phu_trach_id is not null
  and l.trang_thai = 'Chưa thực hiện';

update lich_nhac_nho l set nguoi_phu_trach_id = d.chung_tu_phu_trach_id
from don_hang d
where l.don_hang_id = d.id and l.ma_buoc_tu_dong = 'tiep_nhan_chung_tu'
  and l.nguoi_phu_trach_id is null and d.chung_tu_phu_trach_id is not null
  and l.trang_thai = 'Chưa thực hiện';

create unique index if not exists idx_lich_nhac_nho_buoc_tu_dong
  on lich_nhac_nho(don_hang_id, ma_buoc_tu_dong)
  where don_hang_id is not null and ma_buoc_tu_dong is not null;

create or replace function auto_lich_nhac_nho_don_hang()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  pb_hien_truong uuid;
  pb_chung_tu uuid;
  pb_ke_toan uuid;
begin
  select id into pb_hien_truong from phong_ban where ten = 'Hiện trường';
  select id into pb_chung_tu from phong_ban where ten = 'Chứng từ';
  select id into pb_ke_toan from phong_ban where ten = 'Kế toán';

  if tg_op = 'INSERT' then
    if pb_hien_truong is not null then
      insert into lich_nhac_nho
        (phong_ban_id, don_hang_id, noi_dung, ngay_du_kien, nguoi_phu_trach_id, ma_buoc_tu_dong)
      values (pb_hien_truong, new.id, 'Chuẩn bị vận chuyển đơn hàng ' || new.so_don_hang,
        coalesce(new.ngay_van_chuyen, new.ngay_len_don), new.hien_truong_phu_trach_id, 'chuan_bi_van_chuyen')
      on conflict (don_hang_id, ma_buoc_tu_dong)
        where don_hang_id is not null and ma_buoc_tu_dong is not null do nothing;
    end if;
  else
    if new.hien_truong_phu_trach_id is distinct from old.hien_truong_phu_trach_id
       and new.hien_truong_phu_trach_id is not null then
      update lich_nhac_nho set nguoi_phu_trach_id = new.hien_truong_phu_trach_id
      where don_hang_id = new.id and ma_buoc_tu_dong = 'chuan_bi_van_chuyen'
        and trang_thai = 'Chưa thực hiện';
    end if;
    if new.chung_tu_phu_trach_id is distinct from old.chung_tu_phu_trach_id
       and new.chung_tu_phu_trach_id is not null then
      update lich_nhac_nho set nguoi_phu_trach_id = new.chung_tu_phu_trach_id
      where don_hang_id = new.id and ma_buoc_tu_dong = 'tiep_nhan_chung_tu'
        and trang_thai = 'Chưa thực hiện';
    end if;
    if new.ops_xac_nhan and not old.ops_xac_nhan and pb_chung_tu is not null then
      insert into lich_nhac_nho
        (phong_ban_id, don_hang_id, noi_dung, ngay_du_kien, nguoi_phu_trach_id, ma_buoc_tu_dong)
      values (pb_chung_tu, new.id, 'Tiếp nhận chứng từ đơn hàng ' || new.so_don_hang || ' (Hiện trường đã hoàn thành)',
        current_date, new.chung_tu_phu_trach_id, 'tiep_nhan_chung_tu')
      on conflict (don_hang_id, ma_buoc_tu_dong)
        where don_hang_id is not null and ma_buoc_tu_dong is not null do nothing;
    end if;
    if new.cs_xac_nhan and not old.cs_xac_nhan and pb_ke_toan is not null then
      insert into lich_nhac_nho
        (phong_ban_id, don_hang_id, noi_dung, ngay_du_kien, ma_buoc_tu_dong)
      values (pb_ke_toan, new.id, 'Rà soát chi phí đơn hàng ' || new.so_don_hang || ' (Chứng từ đã hoàn thành)',
        current_date, 'ra_soat_chi_phi')
      on conflict (don_hang_id, ma_buoc_tu_dong)
        where don_hang_id is not null and ma_buoc_tu_dong is not null do nothing;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists after_don_hang_auto_nhac_nho on don_hang;
create trigger after_don_hang_auto_nhac_nho
  after insert or update of ops_xac_nhan, cs_xac_nhan, hien_truong_phu_trach_id, chung_tu_phu_trach_id on don_hang
  for each row execute function auto_lich_nhac_nho_don_hang();
