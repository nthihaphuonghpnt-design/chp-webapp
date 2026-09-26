import * as XLSX from "xlsx";

export interface HoaDonCong {
  dong: number;
  kyHieuMau: string;
  kyHieu: string;
  soHoaDon: string;
  ngayLap: string;
  mstNguoiBan: string;
  mstNguoiMua: string;
  tienTruocThue: number;
  tienThue: number;
  tongThanhToan: number;
  tienChietKhau: number;
  tienPhi: number;
  donViTienTe: string;
  trangThai: string;
  ketQuaKiemTra: string;
}

function ngayExcel(value: unknown): string {
  if (value instanceof Date) return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  if (typeof value === "number") {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) return `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
  }
  const text = String(value ?? "").trim();
  const vn = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(text);
  return vn ? `${vn[3]}-${vn[2].padStart(2, "0")}-${vn[1].padStart(2, "0")}` : text;
}

function tien(value: unknown): number {
  if (typeof value === "number") return value;
  const text = String(value ?? "0").trim();
  if (!text) return 0;
  return Number(text.replace(/[,.\s]/g, ""));
}

export function docDanhSachHoaDonDienTu(sheet: XLSX.WorkSheet): HoaDonCong[] {
  const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: true });
  const firstExcelRow = XLSX.utils.decode_range(sheet["!ref"] ?? "A1").s.r + 1;
  const headerIndex = grid.findIndex((row) => String(row[0]).trim() === "STT" && String(row[3]).trim() === "Số hóa đơn" && String(row[5]).includes("MST người bán"));
  if (headerIndex < 0) throw new Error("Không tìm thấy dòng tiêu đề 19 cột của Danh sách hóa đơn điện tử.");
  return grid.slice(headerIndex + 1).flatMap((row, idx) => {
    const cell = (i: number) => String(row[i] ?? "").trim();
    if (!cell(3)) return [];
    return [{
      dong: firstExcelRow + headerIndex + idx + 1,
      kyHieuMau: cell(1), kyHieu: cell(2), soHoaDon: cell(3), ngayLap: ngayExcel(row[4]),
      mstNguoiBan: cell(5), mstNguoiMua: cell(7),
      tienTruocThue: tien(row[10]), tienThue: tien(row[11]),
      tienChietKhau: tien(row[12]), tienPhi: tien(row[13]), tongThanhToan: tien(row[14]),
      donViTienTe: cell(15), trangThai: cell(17), ketQuaKiemTra: cell(18),
    }];
  });
}
