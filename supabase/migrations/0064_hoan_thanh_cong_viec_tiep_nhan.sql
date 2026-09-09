-- ============================================================================
-- VIET LAI HOAN TOAN so voi ban truoc: KHONG dung ops_xac_nhan/cs_xac_nhan
-- (2 co do van giu nguyen chuc nang rieng cua no cho luong Hien truong/Chung
-- tu hien co — vd tinh trang_thai "Hoan tat" o 0015 — khong dong toi).
-- KHONG dung 1 co "da_ban_giao_ke_toan" chung cho ca don hang (sai vi 1 don
-- hang co the co nhieu bo phan tham gia doc lap: Hien truong + Chung tu).
--
-- Moi hinh moi: 1 bang rieng, khoa theo DUNG (don_hang, nhan_vien) — dung 2
-- nut duy nhat:
--   1) "Hoan thanh cong viec" — nguoi thuc hien (Hien truong/Chung tu) tu bam
--      cho dung phan viec cua minh tren dung don hang.
--   2) "Tiep nhan" — Ke toan/Giam doc bam sau khi nguoi kia da hoan thanh.
-- Trang thai: Chua hoan thanh -> Da hoan thanh (cho tiep nhan) -> Da tiep nhan
-- (khoa nhap/sua chi phi CHI cho dung nguoi + dung don hang do, VA la dieu
-- kien de dua vao Phieu quyet toan — du lieu chi coi la "chot" sau khi Ke
-- toan tiep nhan, truoc do van co the con thay doi nen chua quyet toan duoc).
--
-- Dieu phoi KHONG tham gia chu trinh nay (khong co khai niem tam ung/quyet
-- toan — xem 0062) nen khong bao gio bi khoa boi co che nay.
-- ============================================================================

create table if not exists cong_viec_hoan_thanh (
  id uuid primary key default gen_random_uuid(),
  don_hang_id uuid not null references don_hang(id),
  nhan_vien_id uuid not null references nhan_vien(id),
  trang_thai text not null default 'Chưa hoàn thành'
    check (trang_thai in ('Chưa hoàn thành', 'Đã hoàn thành', 'Đã tiếp nhận')),
  hoan_thanh_luc timestamptz,
  hoan_thanh_boi uuid references nhan_vien(id),
  tiep_nhan_luc timestamptz,
  tiep_nhan_boi uuid references nhan_vien(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (don_hang_id, nhan_vien_id)
);

create trigger set_updated_at before update on cong_viec_hoan_thanh
  for each row execute function set_updated_at();

alter table cong_viec_hoan_thanh enable row level security;

create policy "cvht_select" on cong_viec_hoan_thanh for select to authenticated
  using (
    current_phong_ban() in ('Kế toán', 'Giám đốc')
    or nhan_vien_id in (select id from nhan_vien where auth_user_id = auth.uid())
  );
-- Khong co insert/update policy cho client — chi ghi qua 3 RPC ben duoi
-- (security definer), giong dung khuon so_quy: khong ai UPDATE thang duoc.

-- ----------------------------------------------------------------------------
-- Nut 1: "Hoan thanh cong viec" — chinh nguoi thuc hien tu bam cho dung
-- (don_hang, nhan_vien = chinh minh). Idempotent neu bam lai luc con
-- "Da hoan thanh"; chan neu da bi Ke toan tiep nhan roi (phai qua Ke toan
-- de mo lai, xem ham mo_lai_cong_viec ben duoi).
-- ----------------------------------------------------------------------------
create or replace function hoan_thanh_cong_viec(p_don_hang_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nhan_vien_id uuid;
  v_trang_thai text;
  v_ho_ten text;
  v_phong_ban_ten text;
  v_so_don_hang text;
  v_pb_ke_toan_id uuid;
begin
  select nv.id, nv.ho_ten, pb.ten into v_nhan_vien_id, v_ho_ten, v_phong_ban_ten
  from nhan_vien nv join phong_ban pb on pb.id = nv.phong_ban_id
  where nv.auth_user_id = auth.uid();
  if v_nhan_vien_id is null then
    raise exception 'Không xác định được nhân viên đang đăng nhập';
  end if;

  select trang_thai into v_trang_thai
  from cong_viec_hoan_thanh where don_hang_id = p_don_hang_id and nhan_vien_id = v_nhan_vien_id
  for update;

  if v_trang_thai = 'Đã tiếp nhận' then
    raise exception 'Kế toán đã tiếp nhận phần việc này, không thể tự đổi lại — liên hệ Kế toán để mở lại';
  end if;

  if v_trang_thai is null then
    insert into cong_viec_hoan_thanh (don_hang_id, nhan_vien_id, trang_thai, hoan_thanh_luc, hoan_thanh_boi)
    values (p_don_hang_id, v_nhan_vien_id, 'Đã hoàn thành', now(), v_nhan_vien_id);
  else
    update cong_viec_hoan_thanh
    set trang_thai = 'Đã hoàn thành', hoan_thanh_luc = now(), hoan_thanh_boi = v_nhan_vien_id
    where don_hang_id = p_don_hang_id and nhan_vien_id = v_nhan_vien_id;
  end if;

  -- Bao Ke toan: dung lai co che nhac viec da co san (lich_nhac_nho), giong
  -- cach 0021 dang lam cho ops_xac_nhan/cs_xac_nhan — khong tao co che thong
  -- bao moi song song.
  select id into v_pb_ke_toan_id from phong_ban where ten = 'Kế toán';
  select so_don_hang into v_so_don_hang from don_hang where id = p_don_hang_id;
  if v_pb_ke_toan_id is not null then
    insert into lich_nhac_nho (phong_ban_id, don_hang_id, noi_dung, ngay_du_kien, nguoi_tao_id)
    values (
      v_pb_ke_toan_id, p_don_hang_id,
      v_so_don_hang || ' – ' || coalesce(v_phong_ban_ten, '') || ' ' || v_ho_ten
        || ' đã hoàn thành công việc, chờ Kế toán tiếp nhận.',
      current_date, v_nhan_vien_id
    );
  end if;
end;
$$;

grant execute on function hoan_thanh_cong_viec(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- Nut 2: "Tiep nhan" — chi Ke toan/Giam doc, chi tu trang thai "Da hoan
-- thanh". Day la moc THAT SU khoa nhap/sua chi phi (xem cac policy/trigger
-- ben duoi) va la dieu kien de vao Phieu quyet toan (0065).
-- ----------------------------------------------------------------------------
create or replace function tiep_nhan_ke_toan(p_don_hang_id uuid, p_nhan_vien_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_phong_ban() not in ('Kế toán', 'Giám đốc') then
    raise exception 'Chỉ Kế toán/Giám đốc được tiếp nhận';
  end if;

  update cong_viec_hoan_thanh
  set trang_thai = 'Đã tiếp nhận', tiep_nhan_luc = now(),
      tiep_nhan_boi = (select id from nhan_vien where auth_user_id = auth.uid())
  where don_hang_id = p_don_hang_id and nhan_vien_id = p_nhan_vien_id
    and trang_thai = 'Đã hoàn thành';

  if not found then
    raise exception 'Không tìm thấy phần việc ở trạng thái "Đã hoàn thành" để tiếp nhận';
  end if;
end;
$$;

grant execute on function tiep_nhan_ke_toan(uuid, uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- Mo lai (Ke toan/Giam doc): dua tu "Da tiep nhan" ve lai "Da hoan thanh" —
-- dung khi can bo sung/sua chi phi sau khi da tiep nhan. Giu nguyen
-- hoan_thanh_luc/boi (lich su lan hoan thanh dau); tiep_nhan_luc/boi bi xoa,
-- se ghi lai moi khi tiep nhan lan nua.
-- ----------------------------------------------------------------------------
create or replace function mo_lai_cong_viec(p_don_hang_id uuid, p_nhan_vien_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_phong_ban() not in ('Kế toán', 'Giám đốc') then
    raise exception 'Chỉ Kế toán/Giám đốc được mở lại';
  end if;

  update cong_viec_hoan_thanh
  set trang_thai = 'Đã hoàn thành', tiep_nhan_luc = null, tiep_nhan_boi = null
  where don_hang_id = p_don_hang_id and nhan_vien_id = p_nhan_vien_id
    and trang_thai = 'Đã tiếp nhận';

  if not found then
    raise exception 'Không tìm thấy phần việc ở trạng thái "Đã tiếp nhận" để mở lại';
  end if;
end;
$$;

grant execute on function mo_lai_cong_viec(uuid, uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- phat_sinh_chi_phi: chan them moi tu Hien truong/Chung tu khi PHAN VIEC CUA
-- CHINH HO tren don hang do da "Da tiep nhan". Dieu phoi khong bi anh huong
-- (khong tham gia co che nay). Ke toan khong bi anh huong.
-- ----------------------------------------------------------------------------
drop policy if exists "psc_insert" on phat_sinh_chi_phi;
create policy "psc_insert" on phat_sinh_chi_phi for insert to authenticated
  with check (
    current_phong_ban() = 'Kế toán'
    or current_phong_ban() = 'Điều phối'
    or (
      current_phong_ban() in ('Hiện trường', 'Chứng từ')
      and not exists (
        select 1 from cong_viec_hoan_thanh c
        where c.don_hang_id = phat_sinh_chi_phi.don_hang_id
          and c.nhan_vien_id = phat_sinh_chi_phi.nguoi_nhap_id
          and c.trang_thai = 'Đã tiếp nhận'
      )
    )
  );

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
    return new;
  elsif role = 'Sale' then
    if (to_jsonb(new) - 'gia_ban_sell' - 'updated_at') is distinct from (to_jsonb(old) - 'gia_ban_sell' - 'updated_at') then
      raise exception 'Sale chỉ được sửa giá bán (sell).';
    end if;
  elsif role in ('Hiện trường', 'Điều phối', 'Chứng từ') then
    if role <> 'Điều phối' and exists (
      select 1 from cong_viec_hoan_thanh c
      where c.don_hang_id = old.don_hang_id and c.nhan_vien_id = old.nguoi_nhap_id
        and c.trang_thai = 'Đã tiếp nhận'
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
    if new.tinh_trang_thanh_toan is distinct from old.tinh_trang_thanh_toan
       or new.so_tien_da_thanh_toan is distinct from old.so_tien_da_thanh_toan then
      raise exception 'Không có quyền cập nhật tình trạng thanh toán.';
    end if;
  else
    raise exception 'Không có quyền sửa chi phí.';
  end if;
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- don_thue_ngoai: chi Hien truong tham gia co che nay (Chung tu khong nhap
-- thue ngoai — xem dtn_insert goc 0013 chi cho Hien truong/Dieu phoi/Ke
-- toan). Dieu phoi van khong bi anh huong.
-- ----------------------------------------------------------------------------
drop policy if exists "dtn_insert" on don_thue_ngoai;
create policy "dtn_insert" on don_thue_ngoai for insert to authenticated
  with check (
    current_phong_ban() = 'Kế toán'
    or current_phong_ban() = 'Điều phối'
    or (
      current_phong_ban() = 'Hiện trường'
      and not exists (
        select 1 from cong_viec_hoan_thanh c
        where c.don_hang_id = don_thue_ngoai.don_hang_id
          and c.nhan_vien_id = don_thue_ngoai.nguoi_nhap_id
          and c.trang_thai = 'Đã tiếp nhận'
      )
    )
  );

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
    return new;
  elsif role in ('Hiện trường', 'Điều phối') then
    if role = 'Hiện trường' and exists (
      select 1 from cong_viec_hoan_thanh c
      where c.don_hang_id = old.don_hang_id and c.nhan_vien_id = old.nguoi_nhap_id
        and c.trang_thai = 'Đã tiếp nhận'
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
