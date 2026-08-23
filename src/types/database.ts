export type PhongBanTen =
  | "Sale"
  | "Hiện trường"
  | "Điều phối"
  | "Chứng từ"
  | "Kế toán"
  | "Giám đốc";

export interface PhongBan {
  id: string;
  ten: string;
  ghi_chu: string | null;
  created_at: string;
}

export interface NhanVien {
  id: string;
  ho_ten: string;
  phong_ban_id: string;
  email_tai_khoan: string | null;
  so_dien_thoai: string | null;
  auth_user_id: string | null;
  dang_lam_viec: boolean;
  created_at: string;
  updated_at: string;
}

export interface KhachHang {
  id: string;
  ten_day_du: string;
  ten_viet_tat: string | null;
  dia_chi: string | null;
  ma_so_thue: string | null;
  nguoi_lien_he: string | null;
  dien_thoai: string | null;
  email: string | null;
  ghi_chu: string | null;
  dang_hoat_dong: boolean;
  created_at: string;
  updated_at: string;
}

export interface NhaCungCap {
  id: string;
  ten: string;
  dia_chi: string | null;
  nguoi_lien_he: string | null;
  dien_thoai: string | null;
  email: string | null;
  ghi_chu: string | null;
  dang_hoat_dong: boolean;
  created_at: string;
  updated_at: string;
}

export type NhomDoiTacThueNgoai =
  | "Công ty đối tác (vận tải)"
  | "Hãng tàu"
  | "Đại lý cước biển"
  | "Dịch vụ khác";

export interface DoiTacThueNgoai {
  id: string;
  ten: string;
  nhom: NhomDoiTacThueNgoai;
  dia_chi: string | null;
  nguoi_lien_he: string | null;
  dien_thoai: string | null;
  email: string | null;
  ghi_chu: string | null;
  dang_hoat_dong: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoaiChiPhi {
  id: string;
  ten: string;
  nhom_chi_phi: string | null;
  ghi_chu: string | null;
  dang_hoat_dong: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoaiContainer {
  id: string;
  ten: string;
  ghi_chu: string | null;
  dang_hoat_dong: boolean;
  created_at: string;
  updated_at: string;
}

export interface HangHoa {
  id: string;
  ten: string;
  ghi_chu: string | null;
  dang_hoat_dong: boolean;
  created_at: string;
  updated_at: string;
}

export type LoaiDiaDiem = "Cảng" | "Kho" | "Nơi giao nhận" | "Khác";

export interface DiaDiem {
  id: string;
  ten: string;
  loai: LoaiDiaDiem | null;
  dia_chi: string | null;
  ghi_chu: string | null;
  dang_hoat_dong: boolean;
  created_at: string;
  updated_at: string;
}

export interface XeVanChuyen {
  id: string;
  so_xe: string;
  loai_xe: string | null;
  doi_tac_thue_ngoai_id: string | null;
  ghi_chu: string | null;
  dang_hoat_dong: boolean;
  created_at: string;
  updated_at: string;
}

// Minimal Database type so the Supabase client stays type-safe without
// requiring the full generated schema (can be replaced by `supabase gen types` later).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;
