/**
 * Tinh so du HIEN TAI (hom nay) cua 1 so quy, dung chung giua Trang chu (so
 * luoc) va So quy (chi tiet). Cung nguyen tac "Chot so du dau ky" da dung o
 * SoQuyView: lay moc chot GAN NHAT (<= hom nay), cong don giao dich TU moc do
 * — khong phai cong don tu dau thoi gian (se sai rat xa neu thieu du lieu rat
 * cu). Neu chua co moc chot nao, fallback cong don toan bo lich su (giu dung
 * hanh vi cu, du co the am sau do thieu du lieu).
 */

export interface SoQuyRowGon {
  loai_so: "Tiền mặt" | "Tài khoản công ty";
  loai_giao_dich: "Thu" | "Chi";
  so_tien: number;
  ngay: string;
}

export interface ChotSoDuGon {
  doi_tuong_loai: string;
  ngay_ap_dung: string;
  so_du: number;
}

const CHOT_LOAI_THEO_SO: Record<"Tiền mặt" | "Tài khoản công ty", string> = {
  "Tiền mặt": "so_quy_tien_mat",
  "Tài khoản công ty": "so_quy_tai_khoan_cong_ty",
};

export function tinhSoDuHienTai(
  loaiSo: "Tiền mặt" | "Tài khoản công ty",
  rows: SoQuyRowGon[],
  chotList: ChotSoDuGon[],
  homNay: string
): number {
  const rowsCuaSo = rows.filter((r) => r.loai_so === loaiSo);
  const loaiChot = CHOT_LOAI_THEO_SO[loaiSo];
  const chotApDung = chotList
    .filter((c) => c.doi_tuong_loai === loaiChot && c.ngay_ap_dung <= homNay)
    .sort((a, b) => b.ngay_ap_dung.localeCompare(a.ngay_ap_dung))[0];

  const congDon = (tuNgay: string | null) =>
    rowsCuaSo
      .filter((r) => (tuNgay === null || r.ngay >= tuNgay) && r.ngay <= homNay)
      .reduce((s, r) => s + (r.loai_giao_dich === "Thu" ? r.so_tien : -r.so_tien), 0);

  if (chotApDung) return chotApDung.so_du + congDon(chotApDung.ngay_ap_dung);
  return congDon(null);
}
