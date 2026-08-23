import type { PhongBanTen } from "@/types/database";

/** Cac phong ban duoc tao/sua thong tin lo hang (B1) — nguoi tiep nhan thong tin tu khach hang. */
export const CAN_MANAGE_DON_HANG_B1: PhongBanTen[] = ["Sale", "Chứng từ", "Giám đốc"];

export function canManageDonHang(phongBan?: PhongBanTen) {
  return !!phongBan && CAN_MANAGE_DON_HANG_B1.includes(phongBan);
}
