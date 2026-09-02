/**
 * Cong thuc tinh BHXH + thue TNCN dung chung cho Bang luong (Ke toan) va
 * Luong cua toi (tung nhan vien tu xem) — tach rieng ra day de 2 noi luon
 * khop nhau, tranh lech cong thuc nhu tung xay ra.
 */

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
