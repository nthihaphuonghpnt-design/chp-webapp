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
  ma_so_thue: string | null;
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
  ma_so_thue: string | null;
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

export type LoaiDiaDiem = "Cảng" | "Kho" | "Depot" | "Nơi giao nhận" | "Khác";

export interface DiaDiem {
  id: string;
  ma_dia_diem: string | null;
  ten: string;
  loai: LoaiDiaDiem | null;
  dia_chi: string | null;
  khu_vuc: string | null;
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

export type LoaiDonHang = "Xuất" | "Nhập" | "Khác";
export type LoaiKichCo = "20'" | "40'" | "45'" | "Hàng lẻ";
export type Dvt = "Cont" | "Chuyến" | "Kiện" | "Khối" | "Tấn" | "Kg" | "2x20";
export type TrangThaiDonHang = "Tiếp nhận" | "Làm thủ tục" | "Thông quan" | "Giao hàng" | "Hoàn tất";

export interface DonHang {
  id: string;
  so_don_hang: string;
  khach_hang_id: string | null;
  loai_don_hang: LoaiDonHang | null;
  loai_kich_co: LoaiKichCo | null;
  loai_cont_hang_id: string | null;
  dvt: Dvt | null;
  so_luong: number | null;
  so_bl_bk: string | null;
  so_lo: string | null;
  hang_hoa_id: string | null;
  kich_thuoc: string | null;
  noi_lay_cont_hang_id: string | null;
  noi_dong_giao_id: string | null;
  noi_ha_tra_rong_id: string | null;
  ngay_len_don: string;
  ngay_van_chuyen: string | null;
  han_lenh_ngay: string | null;
  han_lenh_gio: string | null;
  thoi_gian_tra_rong: string | null;
  ghi_chu_van_chuyen: string | null;
  gia: number | null;
  trang_thai: TrangThaiDonHang;
  ops_xac_nhan: boolean;
  cs_xac_nhan: boolean;
  nguoi_tao_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DonHangContainer {
  id: string;
  don_hang_id: string;
  so_cont: string | null;
  so_seal: string | null;
  loai_cont_hang_id: string | null;
  khoi_luong: number | null;
  ghi_chu: string | null;
  created_at: string;
  updated_at: string;
}

export type LoaiHinhXnk =
  | "Nhập kinh doanh"
  | "Nhập ủy thác"
  | "Xuất kinh doanh"
  | "Xuất ủy thác"
  | "Tạm nhập tái xuất"
  | "Khác";
export type LuongToKhai = "Xanh" | "Vàng" | "Đỏ";
export type TrangThaiToKhai = "Đang mở tờ khai" | "Chờ kiểm hóa" | "Đã thông quan" | "Giải phóng hàng";

export interface ToKhaiHaiQuan {
  id: string;
  don_hang_id: string;
  so_to_khai: string | null;
  ngay_mo_to_khai: string | null;
  loai_hinh_xnk: LoaiHinhXnk | null;
  chi_cuc_hai_quan: string | null;
  luong_to_khai: LuongToKhai | null;
  thue_nhap_khau: number | null;
  thue_vat_nk: number | null;
  thue_khac: number | null;
  ngay_thong_quan: string | null;
  trang_thai: TrangThaiToKhai;
  created_at: string;
  updated_at: string;
}

export type DieuDongXe = "Công ty (tự thực hiện)" | "Thuê ngoài";
export type TrangThaiVanChuyen = "Đã duyệt lệnh" | "Đã xuất phát" | "Đã điều động" | "Đã xác nhận" | "Đã hoàn thành";

export interface ChiTietVanChuyen {
  id: string;
  don_hang_id: string;
  ngay_vc: string | null;
  dieu_dong_xe: DieuDongXe | null;
  so_xe: string | null;
  tai_xe_cty_thue: string | null;
  diem_1_id: string | null;
  diem_2_id: string | null;
  diem_3_id: string | null;
  tien_vc_noi_bo: number | null;
  tien_vc_thue_ngoai: number | null;
  tien_thue: number | null;
  phu_thu: number | null;
  trang_thai: TrangThaiVanChuyen;
  created_at: string;
  updated_at: string;
}

export type LienKetToi =
  | "Tiếp nhận"
  | "Làm thủ tục"
  | "Thông quan"
  | "Giao hàng"
  | "Hoàn tất"
  | "Chi phí phát sinh"
  | "Chi tiết vận chuyển"
  | "Thuê ngoài";

export type LoaiDinhKem =
  | "Ảnh hàng hóa tại cảng"
  | "Ảnh container/seal"
  | "Chứng từ thông quan"
  | "Hóa đơn/chứng từ chi phí"
  | "Khác";

export interface DinhKem {
  id: string;
  don_hang_id: string | null;
  lien_ket_toi: LienKetToi | null;
  loai_dinh_kem: LoaiDinhKem | null;
  duong_dan_file: string;
  ten_file: string | null;
  nguoi_upload_id: string | null;
  thoi_gian_upload: string;
  ghi_chu: string | null;
}

export type TrangThaiChiPhi = "Nháp" | "Chờ duyệt" | "Đã duyệt" | "Từ chối";

export interface PhatSinhChiPhi {
  id: string;
  don_hang_id: string;
  loai_chi_phi_id: string | null;
  nha_cung_cap_id: string | null;
  so_luong: number | null;
  don_gia: number | null;
  gia_von_buy: number | null;
  gia_ban_sell: number | null;
  vat_percent: number | null;
  tien_thue: number;
  tong_tien: number;
  noi_bo: boolean;
  chi_ho: boolean;
  tt_thue: boolean;
  ngay_phat_sinh: string;
  nguoi_nhap_id: string | null;
  nguoi_duyet_id: string | null;
  trang_thai: TrangThaiChiPhi;
  ghi_chu: string | null;
  created_at: string;
  updated_at: string;
}

export interface PhuThu {
  id: string;
  don_hang_id: string;
  loai_phu_thu: string | null;
  thanh_tien: number | null;
  ghi_chu: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChiPhiGiaoNhan {
  id: string;
  don_hang_id: string;
  loai: string | null;
  thanh_tien: number | null;
  ghi_chu: string | null;
  created_at: string;
  updated_at: string;
}

export interface DinhPhiThang {
  id: string;
  thang_nam: string;
  khoan_muc: string;
  so_tien: number | null;
  dang_hoat_dong: boolean;
  created_at: string;
  updated_at: string;
}

// Minimal Database type so the Supabase client stays type-safe without
// requiring the full generated schema (can be replaced by `supabase gen types` later).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;
