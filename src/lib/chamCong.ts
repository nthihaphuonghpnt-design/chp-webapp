/**
 * Helper dung chung cho module Cham cong. Luon tinh "hom nay" theo gio Viet
 * Nam (khong phai gio may nguoi dung hay UTC cua server) de khop voi RLS
 * ((now() at time zone 'Asia/Ho_Chi_Minh')::date) — tranh lech ngay gan nua dem.
 */
export function homNayVN(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
}

export const TRANG_THAI_CHAM_CONG = ["Đi làm", "Nghỉ phép", "Nghỉ lễ", "Nghỉ không phép", "Nghỉ khác"] as const;
export type TrangThaiChamCong = (typeof TRANG_THAI_CHAM_CONG)[number] | "Thiếu chấm công";

export const CHAM_CONG_COLOR: Record<TrangThaiChamCong, string> = {
  "Đi làm": "bg-green-100 text-green-700",
  "Nghỉ phép": "bg-blue-100 text-blue-700",
  "Nghỉ lễ": "bg-purple-100 text-purple-700",
  "Nghỉ không phép": "bg-red-100 text-red-700",
  "Nghỉ khác": "bg-slate-100 text-slate-600",
  "Thiếu chấm công": "bg-amber-100 text-amber-700",
};

/**
 * Ngay lam viec mac dinh: Thu 2 - Thu 7 (Chu nhat nghi). Truyen them tap
 * ngay le (yyyy-mm-dd) tu lich_nghi_le de loai luon ngay le ra khoi ngay
 * "can cham cong" — chua co bang lich nghi le nen mac dinh tap rong.
 */
export function laNgayCanChamCong(ngayISO: string, ngayLeSet?: ReadonlySet<string>): boolean {
  const d = new Date(`${ngayISO}T00:00:00`);
  if (d.getDay() === 0) return false;
  if (ngayLeSet?.has(ngayISO)) return false;
  return true;
}

/**
 * Trang thai hien thi cho 1 ngay cua 1 nhan vien: uu tien dong da luu, roi
 * toi ngay le (khong can cham cong ma van hien "Nghi le" du chua co dong),
 * roi Chu nhat/ngay tuong lai thi khong hien gi, con lai la ngay lam viec
 * da qua chua co du lieu -> "Thieu cham cong".
 */
export function trangThaiHienThi(
  ngay: string,
  row: { trang_thai: string } | undefined,
  ngayLeSet: ReadonlySet<string>,
  homNay: string
): TrangThaiChamCong | null {
  if (row) return row.trang_thai as TrangThaiChamCong;
  if (ngayLeSet.has(ngay)) return "Nghỉ lễ";
  if (ngay >= homNay) return null;
  const dow = new Date(`${ngay}T00:00:00`).getDay();
  if (dow === 0) return null;
  return "Thiếu chấm công";
}

/** Danh sach ngay (yyyy-mm-dd) tu ngayBatDau den ngayKetThuc (bao gom ca 2 dau). */
export function danhSachNgay(ngayBatDau: string, ngayKetThuc: string): string[] {
  const out: string[] = [];
  const cur = new Date(`${ngayBatDau}T00:00:00`);
  const end = new Date(`${ngayKetThuc}T00:00:00`);
  while (cur <= end) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}
