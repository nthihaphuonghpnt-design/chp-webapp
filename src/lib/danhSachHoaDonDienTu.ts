import * as XLSX from "xlsx";

export interface HoaDonCong {
  dong: number;
  kyHieuMau: string;
  kyHieu: string;
  soHoaDon: string;
  ngayLap: string;
  mstNguoiBan: string;
  tenNguoiBan: string;
  diaChiNguoiBan: string;
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

const chuan = (v: unknown) => String(v ?? "").trim().toUpperCase().replace(/\s+/g, " ");

// Ten cot (viet hoa) cua 2 mau: "Danh sách hóa đơn điện tử" (cong thue) va
// sheet "DS hoa don" cua file tai hoa don hang loat.
const COT: Record<string, string[]> = {
  kyHieuMau: ["KÝ HIỆU MẪU SỐ", "MẪU SỐ"],
  kyHieu: ["KÝ HIỆU HÓA ĐƠN", "KÝ HIỆU"],
  soHoaDon: ["SỐ HÓA ĐƠN", "SỐ"],
  ngayLap: ["NGÀY LẬP"],
  mstNguoiBan: ["MST NGƯỜI BÁN"],
  tenNguoiBan: ["TÊN NGƯỜI BÁN"],
  diaChiNguoiBan: ["ĐỊA CHỈ NGƯỜI BÁN"],
  mstNguoiMua: ["MST NGƯỜI MUA"],
  tienTruocThue: ["TỔNG TIỀN CHƯA THUẾ"],
  tienThue: ["TỔNG TIỀN THUẾ"],
  tienChietKhau: ["TỔNG TIỀN CHIẾT KHẤU", "TỔNG CKTM"],
  tienPhi: ["TỔNG TIỀN PHÍ", "TỔNG PHÍ"],
  tongThanhToan: ["TỔNG TIỀN THANH TOÁN", "TỔNG THANH TOÁN"],
  donViTienTe: ["ĐƠN VỊ TIỀN TỆ", "TIỀN TỆ"],
  trangThai: ["TRẠNG THÁI HÓA ĐƠN", "TRẠNG THÁI"],
  ketQuaKiemTra: ["KẾT QUẢ KIỂM TRA HÓA ĐƠN", "KQ KIỂM TRA"],
};
const BAT_BUOC = ["soHoaDon", "ngayLap", "mstNguoiBan", "mstNguoiMua", "tienThue", "tongThanhToan"];

function timCot(row: unknown[]): Record<string, number> | null {
  const ten = row.map(chuan);
  const viTri: Record<string, number> = {};
  for (const [khoa, cacTen] of Object.entries(COT)) viTri[khoa] = ten.findIndex((t) => cacTen.includes(t));
  return BAT_BUOC.every((k) => viTri[k] >= 0) ? viTri : null;
}

/** Chon sheet danh sach: uu tien "DS hoa don", sau do sheet dau tien co dong tieu de hop le. */
export function chonSheetDanhSach(book: XLSX.WorkBook): XLSX.WorkSheet | null {
  const thuTu = [...book.SheetNames].sort((a, b) => Number(b === "DS hoa don") - Number(a === "DS hoa don"));
  for (const ten of thuTu) {
    const grid = XLSX.utils.sheet_to_json<unknown[]>(book.Sheets[ten], { header: 1, defval: "", raw: true });
    // Sheet "kem san pham" cung co cac cot nay nhung lap nhieu dong/hoa don -> bo qua.
    const i = grid.slice(0, 30).findIndex((r) => !!timCot(r));
    if (i >= 0 && !grid[i].map(chuan).includes("TÊN HÀNG HÓA, DỊCH VỤ")) return book.Sheets[ten];
  }
  return null;
}

export function docDanhSachHoaDonDienTu(sheet: XLSX.WorkSheet): HoaDonCong[] {
  const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: true });
  const firstExcelRow = XLSX.utils.decode_range(sheet["!ref"] ?? "A1").s.r + 1;
  let cot: Record<string, number> | null = null;
  const headerIndex = grid.findIndex((row) => !!(cot = timCot(row)));
  if (headerIndex < 0 || !cot) throw new Error("Không tìm thấy dòng tiêu đề của danh sách hóa đơn điện tử (cần các cột Số, Ngày lập, MST người bán/mua, Tổng tiền thuế, Tổng thanh toán).");
  const viTri: Record<string, number> = cot;
  return grid.slice(headerIndex + 1).flatMap((row, idx) => {
    const giaTri = (k: string) => (viTri[k] >= 0 ? row[viTri[k]] : "");
    const cell = (k: string) => String(giaTri(k) ?? "").trim();
    if (!cell("soHoaDon")) return [];
    const tienThue = tien(giaTri("tienThue"));
    const tongThanhToan = tien(giaTri("tongThanhToan"));
    return [{
      dong: firstExcelRow + headerIndex + idx + 1,
      kyHieuMau: cell("kyHieuMau"), kyHieu: cell("kyHieu"), soHoaDon: cell("soHoaDon"), ngayLap: ngayExcel(giaTri("ngayLap")),
      mstNguoiBan: cell("mstNguoiBan"), tenNguoiBan: cell("tenNguoiBan"), diaChiNguoiBan: cell("diaChiNguoiBan"), mstNguoiMua: cell("mstNguoiMua"),
      tienTruocThue: tien(giaTri("tienTruocThue")), tienThue,
      tienChietKhau: tien(giaTri("tienChietKhau")), tienPhi: tien(giaTri("tienPhi")), tongThanhToan,
      donViTienTe: cell("donViTienTe"), trangThai: cell("trangThai"), ketQuaKiemTra: cell("ketQuaKiemTra"),
    }];
  });
}

/** So container / so van don tim thay trong ten hang cua tung hoa don (sheet
 * chi tiet san pham, dong con de trong cot MST/so nen mang theo hoa don cha). */
export function docNoiDungDongHang(book: XLSX.WorkBook): Map<string, string> {
  const ketQua = new Map<string, string>();
  for (const ten of book.SheetNames) {
    const grid = XLSX.utils.sheet_to_json<unknown[]>(book.Sheets[ten], { header: 1, defval: "", raw: true });
    const i = grid.slice(0, 30).findIndex((r) => r.map(chuan).includes("TÊN HÀNG HÓA, DỊCH VỤ") && !!timCot(r));
    if (i < 0) continue;
    const cot = timCot(grid[i])!;
    const iTenHang = grid[i].map(chuan).indexOf("TÊN HÀNG HÓA, DỊCH VỤ");
    let khoa = "";
    for (const r of grid.slice(i + 1)) {
      const so = String(r[cot.soHoaDon] ?? "").trim();
      if (so) khoa = `${String(r[cot.mstNguoiBan] ?? "").trim()}|${so}|${ngayExcel(r[cot.ngayLap])}`;
      if (!khoa) continue;
      ketQua.set(khoa, `${ketQua.get(khoa) ?? ""} ${String(r[iTenHang] ?? "")}`);
    }
    break;
  }
  return ketQua;
}
