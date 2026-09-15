-- ============================================================================
-- Theo yeu cau nghiem thu: khong duoc coi "phan biet ky da nop to khai ->
-- to khai bo sung 01/KHBS" la GAP de sau. Bang moi nay luu trang thai "da
-- ke khai" cua tung ky VAT (thang/quy), snapshot so lieu tai thoi diem ke
-- khai, va so lan da nop bo sung — de VatBaoCaoView phat hien duoc khi so
-- lieu SONG (tinh lai tu hoa_don_xuat/hoa_don_dau_vao hien tai) da LECH so
-- voi so da ke khai (vi du: sau khi ke khai, co hoa don bi Dieu chinh/Huy
-- roi vao dung ky do, hoac phat sinh hoa don moi ghi lui ngay vao ky cu).
-- ============================================================================

create table ky_ke_khai_vat (
  id uuid primary key default gen_random_uuid(),
  ky text not null,                          -- 'YYYY-MM' (thang) hoac 'YYYY-Qn' (quy) — trung dinh dang voi vat.ts::kyTuThang()
  granularity text not null check (granularity in ('thang', 'quy')),
  trang_thai text not null default 'Đã kê khai' check (trang_thai in ('Đã kê khai', 'Đã nộp bổ sung')),
  ngay_ke_khai date not null default current_date,
  so_lieu_da_khai jsonb not null,            -- snapshot { vatRa, vatVaoDuDieuKien, khauTruTuKyTruoc, phaiNopHoacDuocKhauTru, chuyenKySau } tai thoi diem ke khai/bo sung gan nhat
  so_lan_bo_sung int not null default 0,
  nguoi_ke_khai_id uuid references nhan_vien(id),
  ghi_chu text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ky, granularity)
);

alter table ky_ke_khai_vat enable row level security;

create policy kkkv_select on ky_ke_khai_vat for select
  using (current_phong_ban() in ('Kế toán', 'Giám đốc'));

-- Khong co policy insert/update/delete truc tiep cho client, va KHONG dung
-- trigger audit rieng — bang nay chi bao gio duoc ghi qua 2 RPC ben duoi
-- (security definer), va ca 2 RPC deu tu goi ghi_nhat_ky() tuong minh o
-- buoc cuoi, nen 1 trigger AFTER UPDATE/DELETE se ghi TRUNG 2 lan cho cung
-- 1 hanh dong — khong can them.

-- ----------------------------------------------------------------------------
-- Danh dau 1 ky la "Da ke khai" — snapshot so lieu tinh toan hien tai (client
-- tinh bang vat.ts::tinhVatTheoKy roi truyen vao, vi cong thuc phuc tap va da
-- co san o TS, khong muon viet lai 2 lan 2 noi de tranh lech logic).
-- ----------------------------------------------------------------------------
create function danh_dau_da_ke_khai_vat(
  p_ky text,
  p_granularity text,
  p_so_lieu jsonb,
  p_ghi_chu text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_nv_id uuid;
begin
  if current_phong_ban() not in ('Kế toán', 'Giám đốc') then
    raise exception 'Chỉ Kế toán/Giám đốc được đánh dấu kỳ đã kê khai';
  end if;
  if exists (select 1 from ky_ke_khai_vat where ky = p_ky and granularity = p_granularity) then
    raise exception 'Kỳ % (%) đã được đánh dấu kê khai từ trước — nếu số liệu vừa thay đổi, dùng chức năng "Ghi nhận bổ sung 01/KHBS"', p_ky, p_granularity;
  end if;

  select id into v_nv_id from nhan_vien where auth_user_id = auth.uid();

  insert into ky_ke_khai_vat (ky, granularity, so_lieu_da_khai, nguoi_ke_khai_id, ghi_chu)
  values (p_ky, p_granularity, p_so_lieu, v_nv_id, p_ghi_chu)
  returning id into v_id;

  perform ghi_nhat_ky('ky_ke_khai_vat', v_id, 'danh_dau_da_ke_khai_vat', p_ghi_chu, null, jsonb_build_object('ky', p_ky, 'granularity', p_granularity, 'so_lieu', p_so_lieu));
  return v_id;
end;
$$;

grant execute on function danh_dau_da_ke_khai_vat(text, text, jsonb, text) to authenticated;

-- ----------------------------------------------------------------------------
-- Ghi nhan da nop to khai bo sung 01/KHBS cho 1 ky da ke khai truoc do —
-- cap nhat snapshot so lieu ve gia tri MOI NHAT (coi nhu ky da "chot lai"),
-- tang so_lan_bo_sung, luu ca so cu/so moi/chenh lech vao nhat_ky_thao_tac
-- de tra cuu lich su dieu chinh ke khai sau nay.
-- ----------------------------------------------------------------------------
create function ghi_nhan_bo_sung_01khbs(
  p_ky text,
  p_granularity text,
  p_so_lieu_moi jsonb,
  p_ly_do text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row ky_ke_khai_vat%rowtype;
begin
  if current_phong_ban() not in ('Kế toán', 'Giám đốc') then
    raise exception 'Chỉ Kế toán/Giám đốc được ghi nhận nộp bổ sung 01/KHBS';
  end if;
  if p_ly_do is null or btrim(p_ly_do) = '' then
    raise exception 'Phải nhập lý do/nội dung thay đổi để ghi vào 01/KHBS';
  end if;

  select * into v_row from ky_ke_khai_vat where ky = p_ky and granularity = p_granularity for update;
  if not found then
    raise exception 'Kỳ % (%) chưa được đánh dấu "Đã kê khai" — không thể nộp bổ sung cho kỳ chưa từng khai', p_ky, p_granularity;
  end if;

  update ky_ke_khai_vat set
    so_lieu_da_khai = p_so_lieu_moi,
    trang_thai = 'Đã nộp bổ sung',
    so_lan_bo_sung = so_lan_bo_sung + 1,
    ngay_ke_khai = current_date,
    updated_at = now()
  where id = v_row.id;

  perform ghi_nhat_ky(
    'ky_ke_khai_vat', v_row.id, 'bo_sung_01khbs', p_ly_do,
    jsonb_build_object('so_lieu_cu', v_row.so_lieu_da_khai, 'lan_bo_sung_thu', v_row.so_lan_bo_sung),
    jsonb_build_object('so_lieu_moi', p_so_lieu_moi, 'lan_bo_sung_thu', v_row.so_lan_bo_sung + 1)
  );
end;
$$;

grant execute on function ghi_nhan_bo_sung_01khbs(text, text, jsonb, text) to authenticated;
