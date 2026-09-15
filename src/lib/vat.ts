// Tong hop VAT theo ky (thang/quy/nam) tu hoa_don_xuat (VAT dau ra) va
// hoa_don_dau_vao (VAT dau vao). Ham thuan, khong goi Supabase — dung CHUNG
// cho VatBaoCaoView va bat ky noi nao khac can tinh lai (giong quy uoc cua
// baoCao.ts/luong.ts).
//
// QUY TAC dong nao duoc tinh vao ky nao (xem giai thich day du trong migration
// 0092_hoa_don_xuat_vong_doi.sql — phai giu 2 noi nay khop nhau):
//   - hoa_don_xuat.trang_thai = 'Đã hủy'      -> loai khoi moi tong hop.
//   - trang_thai = 'Đã điều chỉnh' (dong GOC) -> VAN tinh vao ky cua no.
//   - trang_thai = 'Đã thay thế' (dong GOC)   -> loai khoi tong hop.
//   - moi truong hop khac ('Đã phát hành', hoac dong loai 'Điều chỉnh'/'Thay
//     thế' moi tao)                            -> tinh vao ky cua no.
//   - hoa_don_dau_vao: loai neu chi_ho=true (khong phai chi phi cua CHP) hoac
//     dieu_kien_khau_tru != 'Đủ điều kiện'.
//
// GIOI HAN: chua co khai niem "ky da nop to khai" nen khong phan biet duoc
// truong hop phai lam to khai bo sung (01/KHBS theo Nghi dinh 123/2020/NDCP)
// khi ky goc da nop truoc do — phai neu ro gioi han nay trong UI Bao cao VAT.

export type VatGranularity = "thang" | "quy" | "nam";

/** 'YYYY-MM' -> 'YYYY-MM' | 'YYYY-Qn' | 'YYYY' tuy granularity. */
export function kyTuThang(kyThang: string, granularity: VatGranularity): string {
  const [nam, thangStr] = kyThang.split("-");
  if (granularity === "nam") return nam;
  if (granularity === "thang") return kyThang;
  const thang = Number(thangStr);
  const quy = Math.floor((thang - 1) / 3) + 1;
  return `${nam}-Q${quy}`;
}

export interface HoaDonXuatVatRow {
  id: string;
  ky_ke_khai: string | null;
  ngay_xuat: string;
  trang_thai: "Đã phát hành" | "Đã điều chỉnh" | "Đã thay thế" | "Đã hủy";
  loai_hoa_don: "Gốc" | "Điều chỉnh" | "Thay thế";
  tien_vat: number | null;
}

export function kyThangHoaDonXuat(h: Pick<HoaDonXuatVatRow, "ky_ke_khai" | "ngay_xuat">): string {
  return h.ky_ke_khai || h.ngay_xuat.slice(0, 7);
}

export function tinhVaoVatDauRa(h: Pick<HoaDonXuatVatRow, "trang_thai">): boolean {
  return h.trang_thai !== "Đã hủy" && h.trang_thai !== "Đã thay thế";
}

export interface HoaDonDauVaoVatRow {
  id: string;
  ky_ke_khai: string | null;
  ngay_hoa_don: string;
  dieu_kien_khau_tru: "Đủ điều kiện" | "Không đủ điều kiện" | "Chưa xác định";
  chi_ho: boolean;
  tien_thue_gtgt: number | null;
}

export function kyThangHoaDonDauVao(h: Pick<HoaDonDauVaoVatRow, "ky_ke_khai" | "ngay_hoa_don">): string {
  return h.ky_ke_khai || h.ngay_hoa_don.slice(0, 7);
}

export function tinhVaoVatDauVaoDuocKhauTru(h: Pick<HoaDonDauVaoVatRow, "dieu_kien_khau_tru" | "chi_ho">): boolean {
  return !h.chi_ho && h.dieu_kien_khau_tru === "Đủ điều kiện";
}

export function gomVatTheoKy(
  hoaDonXuat: HoaDonXuatVatRow[],
  hoaDonDauVao: HoaDonDauVaoVatRow[],
  granularity: VatGranularity,
): { vatRaTheoKy: Map<string, number>; vatVaoTheoKy: Map<string, number> } {
  const vatRaTheoKy = new Map<string, number>();
  for (const h of hoaDonXuat) {
    if (!tinhVaoVatDauRa(h)) continue;
    const ky = kyTuThang(kyThangHoaDonXuat(h), granularity);
    vatRaTheoKy.set(ky, (vatRaTheoKy.get(ky) ?? 0) + (h.tien_vat ?? 0));
  }

  const vatVaoTheoKy = new Map<string, number>();
  for (const h of hoaDonDauVao) {
    if (!tinhVaoVatDauVaoDuocKhauTru(h)) continue;
    const ky = kyTuThang(kyThangHoaDonDauVao(h), granularity);
    vatVaoTheoKy.set(ky, (vatVaoTheoKy.get(ky) ?? 0) + (h.tien_thue_gtgt ?? 0));
  }

  return { vatRaTheoKy, vatVaoTheoKy };
}

export interface TongHopVatKy {
  ky: string;
  vatRa: number;
  vatVaoDuDieuKien: number;
  khauTruTuKyTruoc: number;
  /** duong = phai nop, am = con duoc khau tru (chua clip ve 0) */
  phaiNopHoacDuocKhauTru: number;
  /** luon >= 0 */
  chuyenKySau: number;
}

/**
 * danhSachKy phai da sort tang dan (theo thoi gian thuc, khong phai alphabet
 * neu granularity='quy'/'nam' co the lech — goi noi dung sort truoc khi goi
 * ham nay).
 */
export function tinhVatTheoKy(
  danhSachKy: string[],
  vatRaTheoKy: Map<string, number>,
  vatVaoTheoKy: Map<string, number>,
  khauTruDauKy: number = 0,
): TongHopVatKy[] {
  const ketQua: TongHopVatKy[] = [];
  let khauTruTuKyTruoc = khauTruDauKy;
  for (const ky of danhSachKy) {
    const vatRa = vatRaTheoKy.get(ky) ?? 0;
    const vatVaoDuDieuKien = vatVaoTheoKy.get(ky) ?? 0;
    const phaiNopHoacDuocKhauTru = vatRa - vatVaoDuDieuKien - khauTruTuKyTruoc;
    const chuyenKySau = Math.max(0, -phaiNopHoacDuocKhauTru);
    ketQua.push({ ky, vatRa, vatVaoDuDieuKien, khauTruTuKyTruoc, phaiNopHoacDuocKhauTru, chuyenKySau });
    khauTruTuKyTruoc = chuyenKySau;
  }
  return ketQua;
}
