-- ============================================================================
-- GAP MEDIUM con lai cua "Correction/Reversal Lifecycle": Ke toan sua truc
-- tiep (khong qua RPC) Phat sinh chi phi / Don thue ngoai SAU KHI da duyet
-- van duoc audit day du (old/new/ai/khi nao tu dong qua trigger co san) NHUNG
-- khong bat buoc nhap LY DO — form sua hien tai khong co truong nay. Yeu cau
-- Management: bat buoc nhap ly do khi sua sau duyet, luu vao audit.
--
-- Thiet ke: them cot ly_do_sua_gan_nhat — nguoi dung nhap ly do CUNG LUC voi
-- UPDATE (khong can RPC rieng, van dung duoc form sua hien tai + khoa lac
-- quan .eq("updated_at",...) da co). Trigger enforce_*_update (da co san tu
-- 0064) kiem tra: neu dong dang "Da duyet" VA co truong nao khac thuc su doi
-- (loai tru chinh ly_do_sua_gan_nhat/updated_at/phieu_quyet_toan_id — 2 cot
-- nay co the doi ma khong phai do nguoi dung "sua" — phieu_quyet_toan_id bi
-- he thong tu dong gan khi duyet 1 phieu quyet toan, xem
-- enforce_phieu_quyet_toan_trang_thai, KHONG duoc bat nguoi dung nhap ly do
-- cho hanh dong tu dong nay) THI bat buoc ly_do_sua_gan_nhat khac gia tri cu
-- va khong rong. Trigger ghi_nhat_ky_* (AFTER UPDATE, da co san) doi sang
-- dung dung ly_do_sua_gan_nhat lam tham so ly_do cua ghi_nhat_ky() thay vi
-- null nhu truoc.
-- ============================================================================

alter table phat_sinh_chi_phi add column ly_do_sua_gan_nhat text;
alter table don_thue_ngoai add column ly_do_sua_gan_nhat text;

grant update (ly_do_sua_gan_nhat) on phat_sinh_chi_phi to authenticated;
grant update (ly_do_sua_gan_nhat) on don_thue_ngoai to authenticated;

create or replace function enforce_phat_sinh_chi_phi_update()
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
      raise exception 'Dòng chi phí này đã nằm trong 1 phiếu quyết toán tạm ứng đã duyệt/đã thanh toán — không thể sửa trực tiếp. Hủy phiếu quyết toán trước nếu cần sửa lại.';
    end if;
    if old.trang_thai = 'Đã duyệt' then
      -- 'tien_thue'/'tong_tien' la generated column — trong 1 trigger BEFORE
      -- UPDATE, Postgres CHUA tinh lai generated column nen NEW luon doc ra
      -- NULL cho 2 cot nay (khong lien quan gi den gia tri that thay doi hay
      -- khong) — phat hien qua debug that (RAISE voi noi dung old/new) chu
      -- khong doan mo hinh: phai loai tru khoi diff, neu khong MOI lan UPDATE
      -- (ke ca chi doi phieu_quyet_toan_id tu dong tu enforce_phieu_quyet_toan_
      -- trang_thai) deu bi bao "co thay doi" sai va bat nhap ly do oan.
      if (to_jsonb(new) - 'updated_at' - 'ly_do_sua_gan_nhat' - 'phieu_quyet_toan_id' - 'tien_thue' - 'tong_tien')
         is distinct from
         (to_jsonb(old) - 'updated_at' - 'ly_do_sua_gan_nhat' - 'phieu_quyet_toan_id' - 'tien_thue' - 'tong_tien') then
        if new.ly_do_sua_gan_nhat is null or btrim(new.ly_do_sua_gan_nhat) = '' or new.ly_do_sua_gan_nhat = old.ly_do_sua_gan_nhat then
          raise exception 'Chi phí đã duyệt — phải nhập lý do khi sửa.';
        end if;
      end if;
    end if;
    return new;
  elsif role = 'Sale' then
    if (to_jsonb(new) - 'gia_ban_sell' - 'updated_at' - 'tien_thue' - 'tong_tien') is distinct from (to_jsonb(old) - 'gia_ban_sell' - 'updated_at' - 'tien_thue' - 'tong_tien') then
      raise exception 'Sale chỉ được sửa giá bán (sell).';
    end if;
  elsif role in ('Hiện trường', 'Điều phối', 'Chứng từ') then
    if role <> 'Điều phối' and exists (
      select 1 from cong_viec_hoan_thanh c
      where c.don_hang_id = old.don_hang_id and c.nhan_vien_id = old.nguoi_nhap_id and c.trang_thai = 'Đã tiếp nhận'
    ) then
      raise exception 'Kế toán đã tiếp nhận phần việc này, không thể sửa chi phí — liên hệ Kế toán.';
    end if;
    if old.trang_thai = 'Đã duyệt' then
      raise exception 'Chi phí đã được duyệt, không thể sửa.';
    end if;
    if new.gia_ban_sell is distinct from old.gia_ban_sell then
      raise exception 'Không có quyền sửa giá bán (sell).';
    end if;
    if new.trang_thai in ('Đã duyệt', 'Từ chối') then
      raise exception 'Không có quyền duyệt/từ chối chi phí.';
    end if;
    if new.tinh_trang_thanh_toan is distinct from old.tinh_trang_thanh_toan or new.so_tien_da_thanh_toan is distinct from old.so_tien_da_thanh_toan then
      raise exception 'Không có quyền cập nhật tình trạng thanh toán.';
    end if;
  else
    raise exception 'Không có quyền sửa chi phí.';
  end if;
  return new;
end;
$$;

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
      raise exception 'Dòng thuê ngoài này đã nằm trong 1 phiếu quyết toán tạm ứng đã duyệt/đã thanh toán — không thể sửa trực tiếp. Hủy phiếu quyết toán trước nếu cần sửa lại.';
    end if;
    if old.trang_thai = 'Đã duyệt' then
      if (to_jsonb(new) - 'updated_at' - 'ly_do_sua_gan_nhat' - 'phieu_quyet_toan_id')
         is distinct from
         (to_jsonb(old) - 'updated_at' - 'ly_do_sua_gan_nhat' - 'phieu_quyet_toan_id') then
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

create or replace function ghi_nhat_ky_phat_sinh_chi_phi()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'DELETE' then
    perform ghi_nhat_ky('phat_sinh_chi_phi', old.id, 'xoa_phat_sinh_chi_phi', null, to_jsonb(old), null);
    return old;
  end if;
  perform ghi_nhat_ky('phat_sinh_chi_phi', new.id, 'sua_phat_sinh_chi_phi', new.ly_do_sua_gan_nhat, to_jsonb(old), to_jsonb(new));
  return new;
end;
$$;

create or replace function ghi_nhat_ky_don_thue_ngoai()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'DELETE' then
    perform ghi_nhat_ky('don_thue_ngoai', old.id, 'xoa_don_thue_ngoai', null, to_jsonb(old), null);
    return old;
  end if;
  perform ghi_nhat_ky('don_thue_ngoai', new.id, 'sua_don_thue_ngoai', new.ly_do_sua_gan_nhat, to_jsonb(old), to_jsonb(new));
  return new;
end;
$$;
