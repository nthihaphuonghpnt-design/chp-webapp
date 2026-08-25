import ExcelJS from "exceljs";

export const CONG_TY = {
  tenViet: "CÔNG TY TNHH THƯƠNG MẠI DỊCH VỤ VẬN TẢI CHÂU HOÀNG PHÁT",
  tenAnh: "CHAU HOANG PHAT TRANSPORT TRADING SERVICE CO., LTD",
  mst: "0316928901",
  diaChi: "197/27/34/16 Đường TL 15, P. An Phú Đông, TP. Hồ Chí Minh, Việt Nam",
  email: "info@chauhoangphat.com",
};

export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
  /** Dinh dang so Excel, vi du "#,##0" de co dau phan cach hang nghin. */
  numFmt?: string;
}

export interface DongTieuDe {
  text: string;
  bold?: boolean;
  italic?: boolean;
  /** Ma mau ARGB, vi du "FF1E3A5F" (xanh navy). Bo trong = den mac dinh. */
  color?: string;
  size?: number;
  /** Cot bat dau (1 = A, 2 = B...). Bo trong = mac dinh ngay sau logo. */
  col?: number;
}
/** Chuoi rong hoac "" = 1 dong trang (dung de gian cach cho de nhin). */
type HeaderLine = string | DongTieuDe | null | undefined;

export interface KeOSheetOptions {
  sheetName?: string;
  /** Cac dong tieu de tren cung (can trai, merge het chieu rong bang, khong ke o). */
  headerLines?: HeaderLine[];
  /**
   * Logo cong ty (PNG/JPG dang base64 data URL hoac Buffer) hien o goc tren
   * trai, ben canh headerLines (giong mau "thu tu Debit Note"). Neu co, cac
   * dong headerLines se lui sang phai de tranh de len logo.
   */
  logo?: { data: string | Buffer; extension: "png" | "jpeg" | "gif"; rows?: number; cols?: number };
  columns: ExcelColumn[];
  rows: (string | number)[][];
  totalRow?: (string | number)[];
}

const THIN = { style: "thin" as const, color: { argb: "FF94A3B8" } };
const BORDER_ALL = { top: THIN, left: THIN, bottom: THIN, right: THIN };
const HEADER_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } };

/** Cac dong tieu de CHP theo dung mau letterhead cong ty (mau/dam giong logo). */
export const CONG_TY_HEADER_LINES: DongTieuDe[] = [
  { text: CONG_TY.tenViet, bold: true, color: "FF1E3A5F", size: 13 },
  { text: CONG_TY.tenAnh, italic: true, color: "FF2563EB", size: 10 },
  { text: `MST/Tax code: ${CONG_TY.mst}`, bold: true, size: 10 },
  { text: `Địa chỉ/Address: ${CONG_TY.diaChi}`, bold: true, size: 10 },
  { text: `Email: ${CONG_TY.email}`, bold: true, color: "FF2563EB", size: 10 },
];

export function taoWorkbook() {
  return new ExcelJS.Workbook();
}

let logoCache: Promise<{ data: string; extension: "jpeg" } | null> | null = null;

/** Tai logo cong ty (public/logo-chp.jpg) va cache lai (base64, khong prefix data:). */
export function taiLogoCongTy() {
  if (!logoCache) {
    logoCache = fetch("/logo-chp.jpg")
      .then((res) => (res.ok ? res.blob() : null))
      .then(
        (blob) =>
          blob &&
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          })
      )
      .then((base64) => (base64 ? { data: base64, extension: "jpeg" as const } : null))
      .catch(() => null);
  }
  return logoCache;
}

/**
 * Them 1 sheet co ke o (border) day du vao workbook: khoi tieu de cong ty/khach
 * hang o tren (khong ke o, chi la text can trai, merge het chieu rong bang,
 * kem logo neu co), roi den bang du lieu co border tung o + header nen xanh
 * chu trang + dong tong cong in dam.
 */
export function themSheetKeO(wb: ExcelJS.Workbook, opts: KeOSheetOptions) {
  const ws = wb.addWorksheet(opts.sheetName ?? "Sheet1");
  const colCount = opts.columns.length;

  // Chuan hoa: string -> DongTieuDe, chuoi rong/null/undefined -> null (nghia la 1 dong trang).
  const headerLines: (DongTieuDe | null)[] = (opts.headerLines ?? []).map((l) => {
    if (l == null) return null;
    const line = typeof l === "string" ? { text: l } : l;
    return line.text.trim() ? line : null;
  });

  const logoCols = opts.logo?.cols ?? 3;
  const logoRows = opts.logo?.rows ?? 5;
  const textStartCol = opts.logo ? logoCols + 1 : 1;

  const firstHeaderRow = ws.rowCount + 1;
  let lastLineWasBlank = headerLines.length === 0;
  for (const line of headerLines) {
    const row = ws.addRow([]);
    if (line) {
      const col = line.col ?? textStartCol;
      const cell = row.getCell(col);
      cell.value = line.text;
      cell.font = { bold: line.bold ?? false, italic: line.italic ?? false, size: line.size ?? 11, color: line.color ? { argb: line.color } : undefined };
      ws.mergeCells(row.number, col, row.number, Math.max(col, colCount));
      lastLineWasBlank = false;
    } else {
      lastLineWasBlank = true;
    }
  }
  if (headerLines.length > 0 && !lastLineWasBlank) ws.addRow([]);

  if (opts.logo) {
    const imageId = wb.addImage({ base64: typeof opts.logo.data === "string" ? opts.logo.data : undefined, buffer: typeof opts.logo.data !== "string" ? opts.logo.data : undefined, extension: opts.logo.extension } as ExcelJS.Image);
    // exceljs type defs for Anchor require internal `native*` fields that don't
    // actually exist at runtime for a plain {col,row} anchor — cast around it.
    ws.addImage(imageId, {
      tl: { col: 0, row: firstHeaderRow - 1 },
      br: { col: logoCols, row: firstHeaderRow - 1 + logoRows },
      editAs: "oneCell",
    } as unknown as ExcelJS.ImageRange);
  }

  const headerRow = ws.addRow(opts.columns.map((c) => c.header));
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = HEADER_FILL;
    cell.border = BORDER_ALL;
    cell.alignment = { vertical: "middle", wrapText: true };
  });

  for (const r of opts.rows) {
    const row = ws.addRow(r);
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      if (colNumber > colCount) return;
      cell.border = BORDER_ALL;
      const numFmt = opts.columns[colNumber - 1]?.numFmt;
      if (numFmt && typeof cell.value === "number") cell.numFmt = numFmt;
    });
  }

  if (opts.totalRow) {
    const row = ws.addRow(opts.totalRow);
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      if (colNumber > colCount) return;
      cell.border = BORDER_ALL;
      cell.font = { bold: true };
      const numFmt = opts.columns[colNumber - 1]?.numFmt;
      if (numFmt && typeof cell.value === "number") cell.numFmt = numFmt;
    });
  }

  ws.columns = opts.columns.map((c) => ({ width: c.width ?? 14 }));
  return ws;
}

export async function taiWorkbook(wb: ExcelJS.Workbook, filename: string) {
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Tien ich cho truong hop chi can xuat 1 sheet duy nhat. */
export async function xuatExcelKeO(filename: string, opts: KeOSheetOptions) {
  const wb = taoWorkbook();
  themSheetKeO(wb, opts);
  await taiWorkbook(wb, filename);
}
