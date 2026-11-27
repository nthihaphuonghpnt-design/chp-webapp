// Khach xuat hoa don theo nhom (migration 0129). Ham thuan, dung chung cho
// Hoa don xuat va Bao cao.

export interface KhachCoNhom {
  id: string;
  nhom_khach_hang_id?: string | null;
}
export interface NhomCoMe {
  id: string;
  ten: string;
  khach_hang_me_id?: string | null;
}
export interface DonHangXuatHoaDon {
  khach_hang_id: string | null;
  khach_hang_dich_vu_id?: string | null;
}

/** Cong ty me cua khach nay; null neu khong thuoc nhom, nhom chua khai cong ty me, hoac chinh no la me. */
export function khachMeCua(khachId: string, khachList: KhachCoNhom[], nhomList: NhomCoMe[]): string | null {
  const nhomId = khachList.find((k) => k.id === khachId)?.nhom_khach_hang_id;
  if (!nhomId) return null;
  const me = nhomList.find((n) => n.id === nhomId)?.khach_hang_me_id;
  return me && me !== khachId ? me : null;
}

/** Khach nhan hoa don DICH VU cua 1 lo: chon rieng tren don > cong ty me > khach cua lo. */
export function khachXuatDichVu(don: DonHangXuatHoaDon, khachList: KhachCoNhom[], nhomList: NhomCoMe[]): string | null {
  if (don.khach_hang_dich_vu_id) return don.khach_hang_dich_vu_id;
  if (!don.khach_hang_id) return null;
  return khachMeCua(don.khach_hang_id, khachList, nhomList) ?? don.khach_hang_id;
}
