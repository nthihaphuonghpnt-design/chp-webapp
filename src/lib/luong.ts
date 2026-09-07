/**
 * Cong thuc tinh BHXH + thue TNCN dung chung cho Bang luong (Ke toan) va
 * Luong cua toi (tung nhan vien tu xem) — tach rieng ra day de 2 noi luon
 * khop nhau, tranh lech cong thuc nhu tung xay ra.
 */

import { danhSachNgay, laNgayCanChamCong, ngayCuoiThang } from "@/lib/chamCong";

export const TY_LE_BHXH_NV = 0.105;
export const TY_LE_BHXH_CT = 0.215;
export const HOA_HONG_SALE = 0.4;

/**
 * Luat Thue TNCN so 109/2025/QH15 (Quoc hoi thong qua 12/10/2025), hieu luc
 * tu thang nay: giam tru ban than 11tr -> 15.5tr/thang, giam tru nguoi phu
 * thuoc 4.4tr -> 6.2tr/thang, rut gon tu 7 bac (5%-35%) xuong 5 bac.
 * Thue TNCN tinh theo luat co hieu luc tai THOI DIEM CHI TRA thu nhap (thang
 * luong thuc te, khong phai thang lam viec) nen dung `thangLuong` (yyyy-mm)
 * de xac dinh ap dung bang thue nao.
 */
export const THANG_HIEU_LUC_LUAT_THUE_MOI = "2026-07";

const GIAM_TRU_BAN_THAN_CU = 11_000_000;
const GIAM_TRU_BAN_THAN_MOI = 15_500_000;
const GIAM_TRU_NGUOI_PHU_THUOC_CU = 4_400_000;
const GIAM_TRU_NGUOI_PHU_THUOC_MOI = 6_200_000;

const BAC_THUE_CU = [
  { den: 5_000_000, thue: 0.05 },
  { den: 10_000_000, thue: 0.1 },
  { den: 18_000_000, thue: 0.15 },
  { den: 32_000_000, thue: 0.2 },
  { den: 52_000_000, thue: 0.25 },
  { den: 80_000_000, thue: 0.3 },
  { den: Infinity, thue: 0.35 },
];

const BAC_THUE_MOI = [
  { den: 10_000_000, thue: 0.05 },
  { den: 30_000_000, thue: 0.1 },
  { den: 60_000_000, thue: 0.2 },
  { den: 100_000_000, thue: 0.3 },
  { den: Infinity, thue: 0.35 },
];

/** thangLuong dang "yyyy-mm" (thang thuc te tra luong, khong phai thang lam viec). */
export function dungLuatThueMoi(thangLuong: string) {
  return thangLuong >= THANG_HIEU_LUC_LUAT_THUE_MOI;
}

export function giamTruGiaCanh(thangLuong: string, soNguoiPhuThuoc: number) {
  const moi = dungLuatThueMoi(thangLuong);
  const banThan = moi ? GIAM_TRU_BAN_THAN_MOI : GIAM_TRU_BAN_THAN_CU;
  const mucPhuThuoc = moi ? GIAM_TRU_NGUOI_PHU_THUOC_MOI : GIAM_TRU_NGUOI_PHU_THUOC_CU;
  return banThan + mucPhuThuoc * Math.max(0, Math.trunc(soNguoiPhuThuoc || 0));
}

export function tinhThueTNCN(thuNhapChiuThue: number, thangLuong: string) {
  if (thuNhapChiuThue <= 0) return 0;
  const bac = dungLuatThueMoi(thangLuong) ? BAC_THUE_MOI : BAC_THUE_CU;
  let thue = 0;
  let truoc = 0;
  for (const b of bac) {
    if (thuNhapChiuThue > truoc) {
      const phan = Math.min(thuNhapChiuThue, b.den) - truoc;
      thue += phan * b.thue;
      truoc = b.den;
    } else break;
  }
  return thue;
}

/**
 * Tru luong theo cham cong (module moi, xem src/lib/chamCong.ts): chi ap
 * dung tu thang hoat dong nay tro di, giong cach xu ly luat thue moi — vi
 * cac thang truoc chua ai cham cong (module chua ton tai), neu tinh ca se
 * bi hieu nham la "thieu cham cong toan bo" va lam luong sai. thangHoatDong
 * la thang cham cong thuc te (thang truoc thang tra luong).
 */
export const THANG_BAT_DAU_TRU_LUONG_THEO_CHAM_CONG = "2026-10";

export function apDungTruLuongTheoChamCong(thangHoatDong: string) {
  return thangHoatDong >= THANG_BAT_DAU_TRU_LUONG_THEO_CHAM_CONG;
}

/** So ngay phep duoc nghi trong 1 nam: 12 ngay co ban + 1 ngay moi 5 nam tham nien (theo ngay vao lam). */
export function hanMucPhepNam(ngayVaoLam: string | null | undefined, nam: number): number {
  const CO_BAN = 12;
  if (!ngayVaoLam) return CO_BAN;
  const namVaoLam = Number(ngayVaoLam.slice(0, 4));
  if (!Number.isFinite(namVaoLam)) return CO_BAN;
  const soNamThamNien = Math.max(0, nam - namVaoLam);
  return CO_BAN + Math.floor(soNamThamNien / 5);
}

interface ChamCongRowGon {
  ngay: string;
  trang_thai: string;
}

/**
 * Tinh lai "luong co ban" (thay cho luong_co_dinh nguyen thang) cho 1 nhan
 * vien trong thangHoatDong, dua tren du lieu Cham cong:
 * - Outsource: don gia/ngay (dung luong_co_dinh) x so ngay "Di lam" thuc te
 *   trong thang — khong tinh nghi le/nghi phep mac dinh.
 * - Co dinh: luong_co_dinh / ngay cong chuan thang x (Di lam + Nghi le +
 *   Nghi phep hop le trong han muc nam). Nghi khong phep, Nghi khac va
 *   Thieu cham cong KHONG duoc tra luong ngay do. Nghi phep vuot han muc
 *   con lai cua nam (sau khi tru luy ke cac thang truoc) cung khong duoc
 *   tra luong (coi nhu nghi khong phep).
 * chamCongCaNamList: toan bo ban ghi cham_cong CUA NHAN VIEN NAY trong ca
 * nam chua thangHoatDong (de tinh luy ke phep dung).
 */
export function tinhLuongCoBanTheoChamCong(params: {
  loaiNhanSu: string;
  luongCoDinh: number;
  ngayVaoLam: string | null | undefined;
  thangHoatDong: string;
  chamCongCaNamList: ChamCongRowGon[];
  ngayLeSet: ReadonlySet<string>;
}): number {
  const { loaiNhanSu, luongCoDinh, ngayVaoLam, thangHoatDong, chamCongCaNamList, ngayLeSet } = params;
  const nam = Number(thangHoatDong.slice(0, 4));

  if (loaiNhanSu === "Outsource") {
    const soNgayDiLamThang = chamCongCaNamList.filter(
      (r) => r.ngay.slice(0, 7) === thangHoatDong && r.trang_thai === "Đi làm"
    ).length;
    return luongCoDinh * soNgayDiLamThang;
  }

  const cacNgayTrongThang = danhSachNgay(`${thangHoatDong}-01`, ngayCuoiThang(thangHoatDong));
  let diLam = 0;
  let nghiLe = 0;
  let nghiPhepThang = 0;
  let ngayCongChuan = 0;
  for (const ngay of cacNgayTrongThang) {
    const row = chamCongCaNamList.find((r) => r.ngay === ngay);
    if (ngayLeSet.has(ngay)) {
      if (row?.trang_thai === "Đi làm") diLam += 1;
      else nghiLe += 1;
      continue;
    }
    if (!laNgayCanChamCong(ngay)) continue;
    ngayCongChuan += 1;
    if (row?.trang_thai === "Đi làm") diLam += 1;
    else if (row?.trang_thai === "Nghỉ phép") nghiPhepThang += 1;
  }

  const hanMuc = hanMucPhepNam(ngayVaoLam, nam);
  const luyKeTruocThang = chamCongCaNamList.filter(
    (r) => r.ngay.slice(0, 4) === String(nam) && r.ngay.slice(0, 7) < thangHoatDong && r.trang_thai === "Nghỉ phép"
  ).length;
  const conLaiHanMuc = Math.max(0, hanMuc - luyKeTruocThang);
  const nghiPhepHopLe = Math.min(nghiPhepThang, conLaiHanMuc);

  if (ngayCongChuan <= 0) return luongCoDinh;
  const ngayDuocTraLuong = diLam + nghiLe + nghiPhepHopLe;
  return (luongCoDinh / ngayCongChuan) * ngayDuocTraLuong;
}
