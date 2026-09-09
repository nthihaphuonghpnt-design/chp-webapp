-- ============================================================================
-- Phieu quyet toan tam ung — GOP THEO DON HANG (khong phai gop theo tung
-- khoan tam ung rieng le). Ke toan chon 1 nhan vien + danh sach DON HANG can
-- quyet toan; voi MOI don hang duoc chon, he thong tu cong don:
--   (a) TOAN BO khoan tam ung dang mo (co the nhieu lan ung) cua don hang do
--   (b) TOAN BO chi phi/thue ngoai "treo" (nguon_thanh_toan = 'Tam ung nhan
--       vien', bat ke co gan duoc tam_ung_id cu the hay khong, chua duoc Ke
--       toan thanh toan truc tiep) cua don hang do
-- roi tinh chenh lech rong TREN TOAN BO cac don hang trong phieu — dung y
-- nhu vi du: DH001 tam ung 0 + chi 5tr (= -5tr) cong chung voi cac lo khac
-- trong cung dot, hoan lai dung 1 lan cho nguoi nhap.
--
-- Trang thai: Nhap (chua khoa gi) -> Da duyet (khoa toan bo tam ung + chi phi
-- lien quan, chot so lieu) -> Da thanh toan (tao dong so_quy, khoa vinh vien)
-- | Da huy (chi tu Nhap/Da duyet, GIAI PHONG lai moi thu da khoa).
--
-- UNIQUE(don_hang_id) tren bang chi tiet — 1 don hang khong the nam trong 2
-- phieu dang hoat dong cung luc, la rang buoc DATABASE khong phai kiem tra o
-- frontend.
-- ============================================================================

create table if not exists phieu_quyet_toan_tam_ung (
  id uuid primary key default gen_random_uuid(),
  so_phieu text,
  nhan_vien_id uuid not null references nhan_vien(id),
  ngay_quyet_toan date not null default current_date,
  tong_da_tam_ung numeric not null default 0,
  tong_chi_thuc_te numeric not null default 0,
  chenh_lech_rong numeric not null default 0,
  trang_thai text not null default 'Nháp'
    check (trang_thai in ('Nháp', 'Đã duyệt', 'Đã thanh toán', 'Đã hủy')),
  phuong_thuc text check (phuong_thuc in ('Tiền mặt', 'Tài khoản công ty')),
  nguoi_duyet_id uuid references nhan_vien(id),
  ghi_chu text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists phieu_quyet_toan_chi_tiet (
  id uuid primary key default gen_random_uuid(),
  phieu_id uuid not null references phieu_quyet_toan_tam_ung(id) on delete cascade,
  don_hang_id uuid not null references don_hang(id),
  created_at timestamptz not null default now(),
  unique (don_hang_id)
);
-- Han che da biet: vi UNIQUE(don_hang_id) la vinh vien (khong tu giai phong
-- sau khi phieu "Da thanh toan" — row nay o lai mai de giu lich su), 1 don
-- hang chi di qua co che Phieu quyet toan nay DUNG 1 LAN trong doi. Neu thuc
-- te can quyet toan lai lan 2 cho cung 1 don hang (vd co them tam ung/chi phi
-- moi rat lau sau khi da quyet toan xong), can xu ly thu cong — chua gap yeu
-- cau nay nen chua thiet ke rieng, se bo sung neu can.

alter table tam_ung_giai_chi add column if not exists phieu_quyet_toan_id uuid
  references phieu_quyet_toan_tam_ung(id) on delete set null;
alter table phat_sinh_chi_phi add column if not exists phieu_quyet_toan_id uuid
  references phieu_quyet_toan_tam_ung(id) on delete set null;
alter table don_thue_ngoai add column if not exists phieu_quyet_toan_id uuid
  references phieu_quyet_toan_tam_ung(id) on delete set null;

grant select (phieu_quyet_toan_id) on phat_sinh_chi_phi to authenticated;
grant select (phieu_quyet_toan_id) on don_thue_ngoai to authenticated;

create trigger set_updated_at before update on phieu_quyet_toan_tam_ung
  for each row execute function set_updated_at();

alter table phieu_quyet_toan_tam_ung enable row level security;
alter table phieu_quyet_toan_chi_tiet enable row level security;

create policy "pqt_select" on phieu_quyet_toan_tam_ung for select to authenticated
  using (
    current_phong_ban() in ('Kế toán', 'Giám đốc')
    or nhan_vien_id in (select id from nhan_vien where auth_user_id = auth.uid())
  );
create policy "pqt_insert" on phieu_quyet_toan_tam_ung for insert to authenticated
  with check (
    current_phong_ban() in ('Kế toán', 'Giám đốc')
    or nhan_vien_id in (select id from nhan_vien where auth_user_id = auth.uid())
  );
create policy "pqt_update" on phieu_quyet_toan_tam_ung for update to authenticated
  using (current_phong_ban() in ('Kế toán', 'Giám đốc'));

create policy "pqtct_select" on phieu_quyet_toan_chi_tiet for select to authenticated
  using (
    exists (
      select 1 from phieu_quyet_toan_tam_ung p
      where p.id = phieu_quyet_toan_chi_tiet.phieu_id
        and (
          current_phong_ban() in ('Kế toán', 'Giám đốc')
          or p.nhan_vien_id in (select id from nhan_vien where auth_user_id = auth.uid())
        )
    )
  );
create policy "pqtct_insert" on phieu_quyet_toan_chi_tiet for insert to authenticated
  with check (
    exists (
      select 1 from phieu_quyet_toan_tam_ung p
      where p.id = phieu_quyet_toan_chi_tiet.phieu_id
        and p.trang_thai = 'Nháp'
        and (
          current_phong_ban() in ('Kế toán', 'Giám đốc')
          or p.nhan_vien_id in (select id from nhan_vien where auth_user_id = auth.uid())
        )
    )
  );
create policy "pqtct_delete" on phieu_quyet_toan_chi_tiet for delete to authenticated
  using (
    exists (
      select 1 from phieu_quyet_toan_tam_ung p
      where p.id = phieu_quyet_toan_chi_tiet.phieu_id
        and p.trang_thai = 'Nháp'
        and (
          current_phong_ban() in ('Kế toán', 'Giám đốc')
          or p.nhan_vien_id in (select id from nhan_vien where auth_user_id = auth.uid())
        )
    )
  );

-- ----------------------------------------------------------------------------
-- "Da hoan thanh phan viec": chi Hien truong (ops_xac_nhan) va Chung tu
-- (cs_xac_nhan) co khai niem nay — dung dung 2 co da co san tren don_hang, tu
-- nut "Xac nhan hoan thanh" rieng cua tung bo phan (khong lien quan
-- da_ban_giao_ke_toan, cung khong phai trang_thai chung "Hoan tat" cua don
-- hang). Phong ban khac (Dieu phoi, Ke toan...) khong co khai niem tam
-- ung/quyet toan nen luon tra ve false — khong bao gio du dieu kien qua duong
-- nay (dung y voi 0062: cac phong ban do khong duoc tu gan "Tam ung nhan
-- vien" tu dau).
-- ----------------------------------------------------------------------------
create or replace function da_hoan_thanh_phan_viec(p_don_hang_id uuid, p_nhan_vien_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phong_ban text;
  v_ops boolean;
  v_cs boolean;
begin
  select pb.ten into v_phong_ban
  from nhan_vien nv join phong_ban pb on pb.id = nv.phong_ban_id
  where nv.id = p_nhan_vien_id;

  select ops_xac_nhan, cs_xac_nhan into v_ops, v_cs from don_hang where id = p_don_hang_id;

  if v_phong_ban = 'Hiện trường' then
    return coalesce(v_ops, false);
  elsif v_phong_ban = 'Chứng từ' then
    return coalesce(v_cs, false);
  else
    return false;
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- Tao phieu Nhap: chon 1 nhan vien + danh sach don hang MA PHAN VIEC CUA
-- NHAN VIEN DO DA HOAN THANH tren tung don. Chi tao header + lien ket chi
-- tiet, KHONG khoa gi ca. UNIQUE(don_hang_id) tu chan neu 1 don hang bi 1
-- request khac dua vao 1 phieu Nhap khac song song.
-- ----------------------------------------------------------------------------
create or replace function tao_phieu_quyet_toan_tam_ung(p_nhan_vien_id uuid, p_don_hang_ids uuid[])
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phieu_id uuid;
  v_don_hang_id uuid;
begin
  if array_length(p_don_hang_ids, 1) is null then
    raise exception 'Phải chọn ít nhất 1 đơn hàng';
  end if;

  foreach v_don_hang_id in array p_don_hang_ids loop
    if not da_hoan_thanh_phan_viec(v_don_hang_id, p_nhan_vien_id) then
      raise exception 'Đơn hàng % chưa xác nhận hoàn thành phần việc của nhân viên này — chưa thể đưa vào quyết toán', v_don_hang_id;
    end if;
  end loop;

  insert into phieu_quyet_toan_tam_ung (nhan_vien_id) values (p_nhan_vien_id)
  returning id into v_phieu_id;

  insert into phieu_quyet_toan_chi_tiet (phieu_id, don_hang_id)
  select v_phieu_id, unnest(p_don_hang_ids);

  return v_phieu_id;
end;
$$;

grant execute on function tao_phieu_quyet_toan_tam_ung(uuid, uuid[]) to authenticated;

-- ----------------------------------------------------------------------------
-- Danh sach don hang du dieu kien de UI hien cho Ke toan chon khi lap phieu
-- moi cho 1 nhan vien: da hoan thanh phan viec (da_hoan_thanh_phan_viec) VA
-- CHUA TUNG nam trong bat ky phieu_quyet_toan_chi_tiet nao (kie ca phieu da
-- huy — nhung chi_tiet cua phieu huy da bi xoa nen tu dong khong con vuong ket
-- qua nay) — dam bao 1 don hang da quyet toan roi se KHONG BAO GIO "nhay len"
-- lai trong danh sach chon cua lan sau, dung y anh hoi.
-- ----------------------------------------------------------------------------
create or replace function don_hang_cho_quyet_toan(p_nhan_vien_id uuid)
returns table(don_hang_id uuid, so_don_hang text, tong_tam_ung numeric, tong_chi_treo numeric)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    dh.id,
    dh.so_don_hang,
    coalesce((
      select sum(t.so_tien) from tam_ung_giai_chi t
      where t.don_hang_id = dh.id and t.nhan_vien_id = p_nhan_vien_id
        and t.loai = 'Tạm ứng' and t.trang_thai = 'Đã duyệt' and t.phieu_quyet_toan_id is null
    ), 0) as tong_tam_ung,
    coalesce((
      select sum(p.so_tien_da_chi) from phat_sinh_chi_phi p
      where p.don_hang_id = dh.id and p.nguoi_nhap_id = p_nhan_vien_id
        and p.nguon_thanh_toan = 'Tạm ứng nhân viên' and coalesce(p.so_tien_da_thanh_toan, 0) = 0
        and p.phieu_quyet_toan_id is null and p.trang_thai <> 'Từ chối'
    ), 0) + coalesce((
      select sum(d.so_tien_da_chi) from don_thue_ngoai d
      where d.don_hang_id = dh.id and d.nguoi_nhap_id = p_nhan_vien_id
        and d.nguon_thanh_toan = 'Tạm ứng nhân viên' and coalesce(d.so_tien_da_thanh_toan, 0) = 0
        and d.phieu_quyet_toan_id is null and d.trang_thai <> 'Từ chối'
    ), 0) as tong_chi_treo
  from don_hang dh
  where da_hoan_thanh_phan_viec(dh.id, p_nhan_vien_id)
    and not exists (
      select 1 from phieu_quyet_toan_chi_tiet c where c.don_hang_id = dh.id
    )
    and (
      exists (
        select 1 from tam_ung_giai_chi t
        where t.don_hang_id = dh.id and t.nhan_vien_id = p_nhan_vien_id
          and t.loai = 'Tạm ứng' and t.trang_thai = 'Đã duyệt' and t.phieu_quyet_toan_id is null
      )
      or exists (
        select 1 from phat_sinh_chi_phi p
        where p.don_hang_id = dh.id and p.nguoi_nhap_id = p_nhan_vien_id
          and p.nguon_thanh_toan = 'Tạm ứng nhân viên' and coalesce(p.so_tien_da_thanh_toan, 0) = 0
          and p.phieu_quyet_toan_id is null and p.trang_thai <> 'Từ chối'
      )
      or exists (
        select 1 from don_thue_ngoai d
        where d.don_hang_id = dh.id and d.nguoi_nhap_id = p_nhan_vien_id
          and d.nguon_thanh_toan = 'Tạm ứng nhân viên' and coalesce(d.so_tien_da_thanh_toan, 0) = 0
          and d.phieu_quyet_toan_id is null and d.trang_thai <> 'Từ chối'
      )
    );
end;
$$;

grant execute on function don_hang_cho_quyet_toan(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- Hieu ung phu cua tung buoc chuyen trang thai — nguon su that duy nhat, chay
-- bat ke di qua RPC hay 1 UPDATE truc tiep nao khac vao bang.
-- ----------------------------------------------------------------------------
create or replace function enforce_phieu_quyet_toan_trang_thai()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tong_ung numeric;
  v_tong_chi numeric;
begin
  if new.trang_thai = old.trang_thai then
    return new;
  end if;

  if old.trang_thai = 'Nháp' and new.trang_thai = 'Đã duyệt' then
    -- Chi khoa cac don hang MA PHAN VIEC CUA NHAN VIEN NAY VAN DANG hoan
    -- thanh tai thoi diem duyet (co xac nhan co the da bi bo lai sau khi tao
    -- Nhap — kiem tra lai cho chac, khong chi tin vao luc tao phieu).
    update tam_ung_giai_chi t set phieu_quyet_toan_id = new.id
    where t.nhan_vien_id = new.nhan_vien_id
      and t.loai = 'Tạm ứng'
      and t.trang_thai = 'Đã duyệt'
      and t.phieu_quyet_toan_id is null
      and t.don_hang_id in (select don_hang_id from phieu_quyet_toan_chi_tiet where phieu_id = new.id)
      and da_hoan_thanh_phan_viec(t.don_hang_id, new.nhan_vien_id);

    -- Khoa toan bo chi phi/thue ngoai "treo" (tra bang tam ung, Ke toan chua
    -- thanh toan truc tiep) cua cac don hang trong phieu — cung chi khi phan
    -- viec da hoan thanh.
    update phat_sinh_chi_phi p set phieu_quyet_toan_id = new.id
    where p.nguoi_nhap_id = new.nhan_vien_id
      and p.nguon_thanh_toan = 'Tạm ứng nhân viên'
      and coalesce(p.so_tien_da_thanh_toan, 0) = 0
      and p.phieu_quyet_toan_id is null
      and p.trang_thai <> 'Từ chối'
      and p.don_hang_id in (select don_hang_id from phieu_quyet_toan_chi_tiet where phieu_id = new.id)
      and da_hoan_thanh_phan_viec(p.don_hang_id, new.nhan_vien_id);

    update don_thue_ngoai d set phieu_quyet_toan_id = new.id
    where d.nguoi_nhap_id = new.nhan_vien_id
      and d.nguon_thanh_toan = 'Tạm ứng nhân viên'
      and coalesce(d.so_tien_da_thanh_toan, 0) = 0
      and d.phieu_quyet_toan_id is null
      and d.trang_thai <> 'Từ chối'
      and d.don_hang_id in (select don_hang_id from phieu_quyet_toan_chi_tiet where phieu_id = new.id)
      and da_hoan_thanh_phan_viec(d.don_hang_id, new.nhan_vien_id);

    select coalesce(sum(t.so_tien), 0) into v_tong_ung
    from tam_ung_giai_chi t where t.phieu_quyet_toan_id = new.id;

    select
      coalesce((select sum(p.so_tien_da_chi) from phat_sinh_chi_phi p where p.phieu_quyet_toan_id = new.id), 0)
      + coalesce((select sum(d.so_tien_da_chi) from don_thue_ngoai d where d.phieu_quyet_toan_id = new.id), 0)
    into v_tong_chi;

    new.tong_da_tam_ung := v_tong_ung;
    new.tong_chi_thuc_te := v_tong_chi;
    new.chenh_lech_rong := v_tong_ung - v_tong_chi;
    return new;
  end if;

  if old.trang_thai = 'Nháp' and new.trang_thai = 'Đã hủy' then
    delete from phieu_quyet_toan_chi_tiet where phieu_id = new.id;
    return new;
  end if;

  if old.trang_thai = 'Đã duyệt' and new.trang_thai = 'Đã thanh toán' then
    -- sync_so_quy_phieu_quyet_toan (trigger AFTER, ben duoi) lo tao dong so_quy
    return new;
  end if;

  if old.trang_thai = 'Đã duyệt' and new.trang_thai = 'Đã hủy' then
    update tam_ung_giai_chi set phieu_quyet_toan_id = null where phieu_quyet_toan_id = new.id;
    update phat_sinh_chi_phi set phieu_quyet_toan_id = null where phieu_quyet_toan_id = new.id;
    update don_thue_ngoai set phieu_quyet_toan_id = null where phieu_quyet_toan_id = new.id;
    delete from phieu_quyet_toan_chi_tiet where phieu_id = new.id;
    return new;
  end if;

  raise exception 'Không thể chuyển trạng thái phiếu quyết toán từ % sang %', old.trang_thai, new.trang_thai;
end;
$$;

drop trigger if exists before_pqt_enforce_trang_thai on phieu_quyet_toan_tam_ung;
create trigger before_pqt_enforce_trang_thai
  before update of trang_thai on phieu_quyet_toan_tam_ung
  for each row execute function enforce_phieu_quyet_toan_trang_thai();

-- ----------------------------------------------------------------------------
-- RPC duyet/huy — lop goi UPDATE mong, khong lap lai logic (da nam trong
-- trigger o tren). Khoa dong tu nhien cua UPDATE ... WHERE la du an toan voi
-- 2 request chay dong thoi cho cung 1 phieu.
-- ----------------------------------------------------------------------------
create or replace function duyet_phieu_quyet_toan_tam_ung(p_phieu_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update phieu_quyet_toan_tam_ung set trang_thai = 'Đã duyệt'
  where id = p_phieu_id and trang_thai = 'Nháp';
  if not found then
    raise exception 'Không tìm thấy phiếu ở trạng thái Nháp để duyệt';
  end if;
end;
$$;

grant execute on function duyet_phieu_quyet_toan_tam_ung(uuid) to authenticated;

create or replace function huy_phieu_quyet_toan_tam_ung(p_phieu_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update phieu_quyet_toan_tam_ung set trang_thai = 'Đã hủy'
  where id = p_phieu_id and trang_thai in ('Nháp', 'Đã duyệt');
  if not found then
    raise exception 'Không thể hủy — không tìm thấy phiếu, hoặc phiếu đã thanh toán/đã hủy';
  end if;
end;
$$;

grant execute on function huy_phieu_quyet_toan_tam_ung(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- So quy: chi fire dung 1 lan khi phieu chuyen sang "Da thanh toan", dung
-- khuon xoa-roi-tao-lai giong 5 trigger da co — UNIQUE(nguon_bang, nguon_id)
-- tren so_quy (0034) chan trung neu bi goi lai nhieu lan.
-- ----------------------------------------------------------------------------
create or replace function sync_so_quy_phieu_quyet_toan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'DELETE' then
    delete from so_quy where nguon_bang = 'phieu_quyet_toan_tam_ung' and nguon_id = old.id;
    return old;
  end if;
  delete from so_quy where nguon_bang = 'phieu_quyet_toan_tam_ung' and nguon_id = new.id;
  if new.trang_thai = 'Đã thanh toán' and new.phuong_thuc is not null and new.chenh_lech_rong <> 0 then
    insert into so_quy (loai_so, loai_giao_dich, so_tien, ngay, noi_dung, nguon_bang, nguon_id)
    values (
      new.phuong_thuc,
      case when new.chenh_lech_rong > 0 then 'Thu' else 'Chi' end,
      abs(new.chenh_lech_rong),
      new.ngay_quyet_toan,
      'Quyết toán tạm ứng ' || coalesce(new.so_phieu, ''),
      'phieu_quyet_toan_tam_ung', new.id
    );
  end if;
  return new;
end;
$$;

drop trigger if exists after_pqt_sync_so_quy on phieu_quyet_toan_tam_ung;
create trigger after_pqt_sync_so_quy
  after insert or update or delete on phieu_quyet_toan_tam_ung
  for each row execute function sync_so_quy_phieu_quyet_toan();
