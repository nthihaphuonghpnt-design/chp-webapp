/**
 * Moc nhac "cong viec chua hoan thanh cuoi thang": 5 ngay truoc ngay cuoi
 * thang; neu ngay cuoi thang la Thu 7/Chu nhat thi lay Thu 6 gan nhat truoc
 * do lam moc, roi tru tiep 5 ngay. Dung gio VN cho "hom nay".
 */
export function mocNhacCuoiThang(ngayISO: string): string {
  const [y, m] = ngayISO.split("-").map(Number);
  const cuoiThang = new Date(Date.UTC(y, m, 0));
  const dow = cuoiThang.getUTCDay();
  if (dow === 6) cuoiThang.setUTCDate(cuoiThang.getUTCDate() - 1);
  if (dow === 0) cuoiThang.setUTCDate(cuoiThang.getUTCDate() - 2);
  cuoiThang.setUTCDate(cuoiThang.getUTCDate() - 5);
  return cuoiThang.toISOString().slice(0, 10);
}

export function trongCuaSoNhacCuoiThang(homNay: string): boolean {
  return homNay >= mocNhacCuoiThang(homNay);
}
