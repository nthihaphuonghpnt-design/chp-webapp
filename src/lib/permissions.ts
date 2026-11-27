import type { PhongBanTen } from "@/types/database";

/** Cac phong ban duoc tao/sua thong tin lo hang (B1) — nguoi tiep nhan thong tin tu khach hang.
 * Ke toan duoc them vao 2026-11-27 (yeu cau khan cua nguoi dung) de nhap duoc
 * don hang lich su/nhom TCB qua Excel khi Sale/Chung tu chua kip nhap. */
export const CAN_MANAGE_DON_HANG_B1: PhongBanTen[] = ["Sale", "Chứng từ", "Giám đốc", "Kế toán"];

export function canManageDonHang(phongBan?: PhongBanTen) {
  return !!phongBan && CAN_MANAGE_DON_HANG_B1.includes(phongBan);
}
