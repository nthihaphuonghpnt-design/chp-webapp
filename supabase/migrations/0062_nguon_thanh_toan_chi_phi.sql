-- ============================================================================
-- Nguon thanh toan cho chi phi phat sinh / thue ngoai: Tien mat / Tai khoan
-- cong ty / Tam ung nhan vien.
--
-- Chi co Ke toan nhap chi phi moi lien quan truc tiep den dong tien (chon tay
-- Tien mat/TK cong ty, chay dung vao so_quy qua duong thanh toan binh
-- thuong). BAT KY AI KHAC nhap (Hien truong, Dieu phoi, Chung tu...) deu
-- KHONG chon nguon — he thong TU DONG thu gan "Tam ung nhan vien" theo dung
-- don hang cua nguoi nhap.
--
-- Mot don hang co the co NHIEU khoan tam ung (nhieu lan ung) — KHONG chan,
-- KHONG bat chon dung khoan nao. Khi Hien truong nhap chi phi, tu dong lay
-- khoan tam ung CU NHAT con mo lam dai dien (tam_ung_id) de thoa man rang
-- buoc "cung don hang" — nhung luc quyet toan (0064), Ke toan chon CA NHOM
-- tam ung con mo cua don hang do vao chung 1 phieu, va tong duoc cong dung
-- tren toan bo nhom (khong phu thuoc tung dong chi phi dang tro vao khoan
-- tam ung cu the nao trong nhom).
--
-- Cho phep chi thuc te vuot/thap hon tong tam ung (khong chan cung) — chenh
-- lech xu ly o buoc Phieu quyet toan. Chi chan sai doi tuong: tam ung duoc
-- gan phai cung don_hang_id, va khong con nam trong 1 phieu da khoa.
--
-- Neu don hang KHONG co khoan tam ung nao dang mo (nguoi nhap tu bo tien chi
-- truoc, cong ty hoan lai sau — vi du tam ung 0, chi 5tr thi coi nhu -5tr):
-- KHONG chan nhap, van gan nguon_thanh_toan = "Tam ung nhan vien" nhung
-- tam_ung_id de trong. Khoan nay VAN duoc gop chung vao dot Phieu quyet toan
-- (0064) cua nguoi do — luc quyet toan se tu hieu don hang nay co 0 tam ung
-- + X tien da chi, cong don chung voi cac lo khac trong cung dot va hoan lai
-- dung phan chenh lech rong cho nguoi nhap, KHONG tach rieng thanh 1 lan
-- "Ke toan thanh toan truc tiep" doc lap.
-- ============================================================================

alter table phat_sinh_chi_phi add column if not exists nguon_thanh_toan text
  check (nguon_thanh_toan in ('Tiền mặt', 'Tài khoản công ty', 'Tạm ứng nhân viên'));
alter table phat_sinh_chi_phi add column if not exists tam_ung_id uuid
  references tam_ung_giai_chi(id) on delete set null;

alter table don_thue_ngoai add column if not exists nguon_thanh_toan text
  check (nguon_thanh_toan in ('Tiền mặt', 'Tài khoản công ty', 'Tạm ứng nhân viên'));
alter table don_thue_ngoai add column if not exists tam_ung_id uuid
  references tam_ung_giai_chi(id) on delete set null;

-- Cot moi khong tu thua huong GRANT cap cot da ap dung o 0061 (revoke toan
-- bang + grant danh sach cot cu the) — phai grant rieng cho 2 cot moi nay.
grant select (nguon_thanh_toan, tam_ung_id) on phat_sinh_chi_phi to authenticated;
grant select (nguon_thanh_toan, tam_ung_id) on don_thue_ngoai to authenticated;

create or replace function tu_dong_nguon_thanh_toan_hien_truong()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phong_ban text;
  v_tam_ung_id uuid;
begin
  if new.nguon_thanh_toan is not null then
    return new;
  end if;

  select pb.ten into v_phong_ban
  from nhan_vien nv join phong_ban pb on pb.id = nv.phong_ban_id
  where nv.id = new.nguoi_nhap_id;

  -- Chi Hien truong va Chung tu moi co khai niem tam ung/quyet toan (gan voi
  -- ops_xac_nhan/cs_xac_nhan tren don_hang — xem 0064). Dieu phoi khong tu bo
  -- tien/tam ung nen KHONG tu gan gi — cung nhu Ke toan, phai chon tay nguon
  -- thanh toan.
  if v_phong_ban not in ('Hiện trường', 'Chứng từ') then
    return new;
  end if;

  select id into v_tam_ung_id
  from tam_ung_giai_chi
  where don_hang_id = new.don_hang_id
    and nhan_vien_id = new.nguoi_nhap_id
    and loai = 'Tạm ứng'
    and trang_thai = 'Đã duyệt'
    and phieu_quyet_toan_id is null
  order by ngay_thuc_hien asc, created_at asc
  limit 1;

  -- v_tam_ung_id co the la null (chua tung tam ung dong nao cho don hang nay)
  -- — van gan nguon_thanh_toan, chi tam_ung_id de trong. Xem ghi chu dau file.
  new.nguon_thanh_toan := 'Tạm ứng nhân viên';
  new.tam_ung_id := v_tam_ung_id;
  return new;
end;
$$;

-- Trigger kiem tra tam_ung_id hop le (kiem_tra_tam_ung_id_hop_le) can tham
-- chieu cot tam_ung_giai_chi.phieu_quyet_toan_id, chua ton tai luc nay — tao
-- o migration 0065, sau khi 0064 da them cot do.
--
-- Thu tu chay giua 2 trigger nay (Postgres chay BEFORE trigger theo thu tu
-- ten, khong dam bao truoc) KHONG anh huong ket qua: trigger o day chi tu
-- gan khi nguon_thanh_toan dang null (chua ai chon tay) va tu chon dung
-- tam_ung_id cung don_hang_id + chua bi khoa ngay trong cau truy van cua no —
-- nen du kiem_tra_tam_ung_id_hop_le chay truoc hay sau, du lieu no thay van
-- dung. Truong hop Ke toan tu chon tay nguon_thanh_toan + tam_ung_id, trigger
-- o day tu bo qua (guard "if new.nguon_thanh_toan is not null"), nhuong toan
-- bo viec kiem tra cho kiem_tra_tam_ung_id_hop_le.
drop trigger if exists before_psc_tu_dong_nguon_tt on phat_sinh_chi_phi;
create trigger before_psc_tu_dong_nguon_tt
  before insert on phat_sinh_chi_phi
  for each row execute function tu_dong_nguon_thanh_toan_hien_truong();

drop trigger if exists before_dtn_tu_dong_nguon_tt on don_thue_ngoai;
create trigger before_dtn_tu_dong_nguon_tt
  before insert on don_thue_ngoai
  for each row execute function tu_dong_nguon_thanh_toan_hien_truong();
