/** Business calendar dates are in Vietnam, not UTC instants. */
export function ngayHienTaiVietNam(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function khoangThangVietNam(now: Date = new Date()) {
  const thang = ngayHienTaiVietNam(now).slice(0, 7);
  const [year, month] = thang.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { start: `${thang}-01`, end: `${thang}-${String(lastDay).padStart(2, "0")}` };
}
