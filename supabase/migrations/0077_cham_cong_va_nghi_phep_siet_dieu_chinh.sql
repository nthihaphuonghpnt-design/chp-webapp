-- ============================================================================
-- Phat hien khi ra soat mo rong (tiep theo 0074/0075/0076): 2 gap con lai
-- trong module Cham cong.
--
-- 1) cham_cong: RLS "cham_cong_update" chi kiem tra role (Ke toan/Giam doc),
--    khong bat buoc ly_do_dieu_chinh phai co gia tri, va tin thang
--    nguoi_dieu_chinh_id/thoi_gian_dieu_chinh do CLIENT gui len (component
--    ChamCongAdminView.tsx co dien du nhung day chi la UI — goi thang API
--    van sua duoc ma khong can ly do, hoac gia mao nguoi_dieu_chinh_id thanh
--    1 nhan vien khac). Header comment cua migration 0050 da noi ro y dinh la
--    "luu vet nguoi/thoi gian/ly do" nhung chua ep o DB.
--    Fix: trigger BEFORE UPDATE luon ep nguoi_dieu_chinh_id/thoi_gian_dieu_chinh
--    lay tu server (auth.uid()/now()), khong tin gia tri client gui; bat buoc
--    ly_do_dieu_chinh khong duoc rong.
--
-- 2) don_xin_nghi_phep: tuong tu, "don_xin_nghi_phep_update" khong ep
--    nguoi_duyet_id/thoi_gian_duyet tu server (DonNghiPhepAdminView.tsx dang
--    gui currentNhanVienId tu client). Nghiem trong hon: sua truc tiep
--    ngay_bat_dau/ngay_ket_thuc cua 1 don DA duyet (ma khong dong thoi doi
--    trang_thai) khong lam trigger auto_ghi_cham_cong_khi_duyet_nghi_phep
--    (0051) chay lai — cham_cong da tao truoc do (theo khoang ngay cu) khong
--    duoc dong bo, "treo" sai lech vinh vien.
--    Fix: trigger BEFORE UPDATE (a) chan sua ngay_bat_dau/ngay_ket_thuc/
--    nhan_vien_id khi don dang o trang thai "Da duyet" va trang_thai khong
--    doi (bat buoc phai chuyen trang thai — vi du "Tu choi" — de sua lai,
--    khong sua ngam duoc); (b) khi duyet/tu choi lan dau (tu "Cho duyet"),
--    luon ep nguoi_duyet_id/thoi_gian_duyet tu server, khong tin client.
-- ============================================================================

create or replace function enforce_cham_cong_dieu_chinh()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  nv_id uuid := (select id from nhan_vien where auth_user_id = auth.uid());
begin
  if new.ly_do_dieu_chinh is null or btrim(new.ly_do_dieu_chinh) = '' then
    raise exception 'Phải nhập lý do khi điều chỉnh chấm công.';
  end if;
  new.nguoi_dieu_chinh_id := nv_id;
  new.thoi_gian_dieu_chinh := now();
  return new;
end;
$$;

drop trigger if exists before_cham_cong_update on cham_cong;
create trigger before_cham_cong_update
  before update on cham_cong
  for each row execute function enforce_cham_cong_dieu_chinh();

create or replace function enforce_don_xin_nghi_phep_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  nv_id uuid := (select id from nhan_vien where auth_user_id = auth.uid());
begin
  if old.trang_thai = 'Đã duyệt' and new.trang_thai is not distinct from old.trang_thai then
    if new.ngay_bat_dau is distinct from old.ngay_bat_dau
       or new.ngay_ket_thuc is distinct from old.ngay_ket_thuc
       or new.nhan_vien_id is distinct from old.nhan_vien_id then
      raise exception 'Đơn nghỉ phép đã duyệt, không thể sửa ngày/nhân viên trực tiếp — chuyển trạng thái "Từ chối" rồi tạo đơn mới nếu cần điều chỉnh.';
    end if;
  end if;

  if old.trang_thai = 'Chờ duyệt' and new.trang_thai in ('Đã duyệt', 'Từ chối') then
    new.nguoi_duyet_id := nv_id;
    new.thoi_gian_duyet := now();
  end if;

  return new;
end;
$$;

drop trigger if exists before_don_xin_nghi_phep_update on don_xin_nghi_phep;
create trigger before_don_xin_nghi_phep_update
  before update on don_xin_nghi_phep
  for each row execute function enforce_don_xin_nghi_phep_update();
