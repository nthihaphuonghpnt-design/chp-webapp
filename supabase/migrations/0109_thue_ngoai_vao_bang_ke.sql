-- ============================================================================
-- "Thue ngoai" (don_thue_ngoai) tu truoc gio hoan toan vang mat khoi luong
-- Bang ke -> Xuat hoa don (chi gom phat_sinh_chi_phi + phu_thu) — don hang nao
-- co doanh thu HOAN TOAN tu Thue ngoai (vd chi thue van tai ngoai, khong co
-- dong Chi phi phat sinh nao) thi KHONG CO CACH NAO xuat hoa don thu tien
-- khach cho khoan do, du van tinh dung vao Loi nhuan/Bao cao. Phat hien theo
-- yeu cau Bao Dung (2026-09-20).
--
-- 1) Them cot hoa_don_id (giong het phat_sinh_chi_phi/phu_thu da co san) de
--    danh dau "da gom vao hoa don nao" — PHAI kem grant select (rut kinh
--    nghiem tu loi quen grant o 0107/0108 truoc do trong chinh phien nay).
-- 2) Loai tru hoa_don_id khoi dieu kien "bat nhap ly do khi sua sau duyet"
--    (enforce_don_thue_ngoai_update, 0104) — dung PATTERN da sua o 0105 cho
--    phat_sinh_chi_phi (hoa_don_id do RPC tu dong gan, khong phai hanh dong
--    "sua" cua nguoi dung) — neu bo sot buoc nay se lap lai DUNG loi
--    "0068 lam hong luong xuat hoa don" ma 0105 da tung phai vá.
-- 3) Sua xuat_hoa_don_tu_bang_ke: them tham so p_thue_ngoai_ids (co gia tri
--    mac dinh de tuong thich nguoc), cap nhat hoa_don_id cho cac dong duoc
--    chon, gom them don_hang_id cua chung vao hoa_don_don_hang.
-- ============================================================================

alter table don_thue_ngoai add column if not exists hoa_don_id uuid references hoa_don_xuat(id);
grant select (hoa_don_id) on don_thue_ngoai to authenticated;

create or replace function enforce_don_thue_ngoai_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  role text := current_phong_ban();
begin
  if role = 'Kế toán' then
    if old.phieu_quyet_toan_id is not null and new.phieu_quyet_toan_id is not distinct from old.phieu_quyet_toan_id then
      raise exception 'Đơn thuê ngoài này đã nằm trong 1 phiếu quyết toán tạm ứng đã duyệt/đã thanh toán — không thể sửa trực tiếp. Hủy phiếu quyết toán trước nếu cần sửa lại.';
    end if;
    if old.trang_thai = 'Đã duyệt' then
      if (to_jsonb(new) - 'updated_at' - 'ly_do_sua_gan_nhat' - 'phieu_quyet_toan_id' - 'hoa_don_id')
         is distinct from
         (to_jsonb(old) - 'updated_at' - 'ly_do_sua_gan_nhat' - 'phieu_quyet_toan_id' - 'hoa_don_id') then
        if new.ly_do_sua_gan_nhat is null or btrim(new.ly_do_sua_gan_nhat) = '' or new.ly_do_sua_gan_nhat = old.ly_do_sua_gan_nhat then
          raise exception 'Đơn thuê ngoài đã duyệt — phải nhập lý do khi sửa.';
        end if;
      end if;
    end if;
    return new;
  elsif role = 'Sale' then
    if (to_jsonb(new) - 'gia_ban_sell' - 'updated_at') is distinct from (to_jsonb(old) - 'gia_ban_sell' - 'updated_at') then
      raise exception 'Sale chỉ được sửa giá bán (sell).';
    end if;
  elsif role in ('Hiện trường', 'Điều phối') then
    if role = 'Hiện trường' and exists (
      select 1 from cong_viec_hoan_thanh c
      where c.don_hang_id = old.don_hang_id and c.nhan_vien_id = old.nguoi_nhap_id and c.trang_thai = 'Đã tiếp nhận'
    ) then
      raise exception 'Kế toán đã tiếp nhận phần việc này, không thể sửa — liên hệ Kế toán.';
    end if;
    if old.trang_thai = 'Đã duyệt' then
      raise exception 'Đơn thuê ngoài đã được duyệt, không thể sửa.';
    end if;
    if new.trang_thai in ('Đã duyệt', 'Từ chối') then
      raise exception 'Không có quyền duyệt/từ chối.';
    end if;
  else
    raise exception 'Không có quyền sửa.';
  end if;
  return new;
end;
$$;

-- create or replace voi THEM 1 tham so moi o cuoi se KHONG thay the ham cu —
-- Postgres coi 9-tham-so va 10-tham-so la 2 ham overload khac nhau, dan den
-- loi "ambiguous function call" khi frontend goi voi dung 9 tham so cu (vi
-- ca 2 ham deu khop). Phai DROP han ham cu truoc.
drop function if exists xuat_hoa_don_tu_bang_ke(uuid, text, date, numeric, numeric, numeric, numeric, uuid[], uuid[]);

create function xuat_hoa_don_tu_bang_ke(
  p_khach_hang_id uuid,
  p_so_hoa_don text,
  p_ngay_xuat date,
  p_tong_tien_truoc_thue numeric,
  p_vat_percent numeric,
  p_tien_vat numeric,
  p_tien_chi_ho numeric,
  p_chi_phi_ids uuid[],
  p_phu_thu_ids uuid[],
  p_thue_ngoai_ids uuid[] default array[]::uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hoa_don_id uuid;
  v_nv_id uuid;
begin
  if current_phong_ban() not in ('Chứng từ', 'Kế toán') then
    raise exception 'Chỉ Chứng từ/Kế toán được xuất hóa đơn';
  end if;
  if coalesce(array_length(p_chi_phi_ids, 1), 0) = 0
     and coalesce(array_length(p_phu_thu_ids, 1), 0) = 0
     and coalesce(array_length(p_thue_ngoai_ids, 1), 0) = 0 then
    raise exception 'Chưa chọn dòng nào để xuất hóa đơn';
  end if;

  select id into v_nv_id from nhan_vien where auth_user_id = auth.uid();

  insert into hoa_don_xuat (
    khach_hang_id, so_hoa_don, ngay_xuat, tong_tien_truoc_thue,
    vat_percent, tien_vat, tien_chi_ho, nguoi_tao_id
  ) values (
    p_khach_hang_id, nullif(p_so_hoa_don, ''), p_ngay_xuat, p_tong_tien_truoc_thue,
    p_vat_percent, p_tien_vat, nullif(p_tien_chi_ho, 0), v_nv_id
  )
  returning id into v_hoa_don_id;

  if array_length(p_chi_phi_ids, 1) > 0 then
    update phat_sinh_chi_phi set hoa_don_id = v_hoa_don_id where id = any(p_chi_phi_ids);
  end if;

  if array_length(p_phu_thu_ids, 1) > 0 then
    update phu_thu set hoa_don_id = v_hoa_don_id where id = any(p_phu_thu_ids);
  end if;

  if array_length(p_thue_ngoai_ids, 1) > 0 then
    update don_thue_ngoai set hoa_don_id = v_hoa_don_id where id = any(p_thue_ngoai_ids);
  end if;

  insert into hoa_don_don_hang (hoa_don_id, don_hang_id)
  select distinct v_hoa_don_id, dh.don_hang_id
  from (
    select don_hang_id from phat_sinh_chi_phi where id = any(p_chi_phi_ids)
    union
    select don_hang_id from phu_thu where id = any(p_phu_thu_ids)
    union
    select don_hang_id from don_thue_ngoai where id = any(p_thue_ngoai_ids)
  ) dh
  on conflict (hoa_don_id, don_hang_id) do nothing;

  return v_hoa_don_id;
end;
$$;

grant execute on function xuat_hoa_don_tu_bang_ke(uuid, text, date, numeric, numeric, numeric, numeric, uuid[], uuid[], uuid[]) to authenticated;
