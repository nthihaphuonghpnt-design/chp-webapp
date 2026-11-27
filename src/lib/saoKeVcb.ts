// Doc thang file "Sao ke tai khoan" tai tu VCB DigiBiz (xls) va goi y loai
// nghiep vu theo noi dung chuyen khoan. Ham thuan, nhan san luoi o (grid).

export type LoaiNghiepVu =
  | "Chuyển quỹ nội bộ"
  | "Lương và BHXH"
  | "Thuế và phí ngân hàng"
  | "Thuê văn phòng/chi phí cố định"
  | "Hoàn tiền"
  | "Dịch vụ logistics"
  | "Chưa phân loại";

export interface DongVcb {
  ngay: string;
  soChungTu: string;
  loaiGiaoDich: "Thu" | "Chi";
  soTien: number;
  soDuSau: number | null;
  noiDung: string;
  loaiNghiepVu: LoaiNghiepVu;
}

export interface SaoKeVcb {
  soDuDauKy: number | null;
  dong: DongVcb[];
}

export function tienVcb(v: unknown): number {
  if (typeof v === "number") return v;
  const s = String(v ?? "").replace(/VND/i, "").replace(/[,\s]/g, "");
  return s ? Number(s) : 0;
}

function boDau(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toUpperCase();
}

/** Chi la goi y — nguoi dung van quyet dinh tung dong. Thu tu quy tac quan trong. */
export function phanLoaiNoiDung(noiDung: string): LoaiNghiepVu {
  const s = boDau(noiDung);
  if (/RUT (TIEN )?(NHAP QUY|TM|TIEN TK|TIEN MAT)|RUT NHAP QUY|NOP (TM|TIEN MAT)/.test(s)) return "Chuyển quỹ nội bộ";
  if (/\bLUONG\b|BHXH|BAO HIEM XA HOI/.test(s)) return "Lương và BHXH";
  if (/HOAN (LAI )?(TIEN|TRA)|HOAN COC|HOAN UNG/.test(s)) return "Hoàn tiền";
  if (/\bTHUE (GTGT|TNDN|TNCN|MON BAI)|NOP THUE|\bNSNN\b|PHI (QUAN LY|DUY TRI|SMS|CHUYEN TIEN|DICH VU NGAN HANG)|LAI (TIEN GUI|NHAP GOC|THAU CHI)|\bVAT\s?PHI\b/.test(s))
    return "Thuế và phí ngân hàng";
  if (/TT (TIEN )?(THUE )?VP\b|THUE VAN PHONG|TIEN NHA|TIEN DIEN|INTERNET|CUOC VIEN THONG/.test(s)) return "Thuê văn phòng/chi phí cố định";
  if (/\bB\/?L\b|\bBILL\b|\bCUOC\b|\bLCC\b|\bCONT\b|PHI HD|TT HD|\bTK\s?\d|CHAU HOANG PHAT B/.test(s)) return "Dịch vụ logistics";
  return "Chưa phân loại";
}

/** null neu khong phai file sao ke VCB. */
export function docSaoKeVcb(grid: unknown[][]): SaoKeVcb | null {
  const o = (r: unknown[], i: number) => String(r[i] ?? "").trim();
  const iTieuDe = grid.findIndex((r) => /^STT/i.test(o(r, 0)) && /debit/i.test(o(r, 3)) && /credit/i.test(o(r, 4)));
  if (iTieuDe < 0) return null;
  const dongDauKy = grid.slice(0, iTieuDe).find((r) => /opening balance/i.test(o(r, 0)));
  const soDuDauKy = dongDauKy ? tienVcb(dongDauKy[2]) : null;

  const dong: DongVcb[] = [];
  for (const r of grid.slice(iTieuDe + 1)) {
    const ngayVaSo = o(r, 1);
    const m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(ngayVaSo);
    if (!m || !/^\d+$/.test(o(r, 0))) continue;
    const chi = tienVcb(r[3]);
    const thu = tienVcb(r[4]);
    if (!chi && !thu) continue;
    const noiDung = o(r, 6);
    dong.push({
      ngay: `${m[3]}-${m[2]}-${m[1]}`,
      soChungTu: ngayVaSo.split("/").slice(3).join("/").trim() || ngayVaSo.slice(10).replace(/^[\s/]+/, ""),
      loaiGiaoDich: chi ? "Chi" : "Thu",
      soTien: chi || thu,
      soDuSau: o(r, 5) ? tienVcb(r[5]) : null,
      noiDung,
      loaiNghiepVu: phanLoaiNoiDung(noiDung),
    });
  }
  return { soDuDauKy, dong };
}
