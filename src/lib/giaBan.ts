// Kể từ migration 0061, gia_ban_sell KHÔNG còn đọc trực tiếp được từ
// phat_sinh_chi_phi/don_thue_ngoai (revoke select toàn bảng + grant lại các
// cột an toàn, không gồm gia_ban_sell) — chỉ đọc được qua 2 RPC dưới, tự
// kiểm tra đúng quyền theo phòng ban trước khi trả về. Dùng đúng danh sách
// cột SELECT (không có gia_ban_sell) khi truy vấn 2 bảng này, rồi ghép lại
// gia_ban_sell theo id — cùng kiểu "polymorphic join" đã dùng cho
// so_quy.nguon_id ở nơi khác trong dự án.

export const PHAT_SINH_CHI_PHI_SAFE_COLS =
  "id, don_hang_id, loai_chi_phi_id, nha_cung_cap_id, doi_tac_thue_ngoai_id, chi_tiet_van_chuyen_id, to_khai_id, nguon_tu_dong, phuong_thuc_thanh_toan, nguon_thanh_toan, tam_ung_id, phieu_quyet_toan_id, so_luong, don_gia, so_tien_da_chi, vat_percent, tien_thue, tong_tien, noi_bo, chi_ho, tt_thue, ngay_phat_sinh, nguoi_nhap_id, nguoi_duyet_id, hoa_don_id, trang_thai, tinh_trang_thanh_toan, so_tien_da_thanh_toan, ghi_chu, created_at, updated_at";

export const DON_THUE_NGOAI_SAFE_COLS =
  "id, don_hang_id, loai_dich_vu_thue, doi_tac_thue_ngoai_id, noi_dung, so_tien_da_chi, tinh_trang_thanh_toan, so_tien_da_thanh_toan, phuong_thuc_thanh_toan, nguon_thanh_toan, tam_ung_id, phieu_quyet_toan_id, ngay_thue, trang_thai, nguoi_nhap_id, created_at, updated_at";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

async function ghepGiaBan<T extends { id: string }>(
  supabase: SupabaseAny,
  rpcName: "lay_gia_ban_chi_phi" | "lay_gia_ban_thue_ngoai",
  rows: T[]
): Promise<(T & { gia_ban_sell: number | null })[]> {
  if (rows.length === 0) return rows as (T & { gia_ban_sell: number | null })[];
  const { data } = await supabase.rpc(rpcName, { p_ids: rows.map((r) => r.id) });
  const map = new Map<string, number | null>(
    ((data ?? []) as { id: string; gia_ban_sell: number | null }[]).map((d) => [d.id, d.gia_ban_sell])
  );
  return rows.map((r) => ({ ...r, gia_ban_sell: map.get(r.id) ?? null }));
}

export function ghepGiaBanChiPhi<T extends { id: string }>(supabase: SupabaseAny, rows: T[]) {
  return ghepGiaBan(supabase, "lay_gia_ban_chi_phi", rows);
}

export function ghepGiaBanThueNgoai<T extends { id: string }>(supabase: SupabaseAny, rows: T[]) {
  return ghepGiaBan(supabase, "lay_gia_ban_thue_ngoai", rows);
}
