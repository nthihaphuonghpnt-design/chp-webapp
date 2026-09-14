// Ma tai khoan ke toan (theo Thong tu 200/2014/TT-BTC) dung CHUNG cho moi
// noi trong app can goi y dinh khoan khi xuat Excel (Ho don dau vao, So
// quy, Tam ung/Giai chi, Hoa don xuat...) — 1 nguon duy nhat de khong bi
// lech ma giua cac trang. Day CHI la GOI Y de doi chieu nhanh voi phan mem
// ke toan that (import lai, khong phai but toan chinh thuc) — Ke toan van
// phai kiem tra lai truoc khi ghi so chinh thuc.
export const TK = {
  TIEN_MAT: "1111",
  NGAN_HANG: "1121",
  PHAI_THU_KHACH_HANG: "131",
  TAM_UNG: "141",
  THUE_GTGT_DUOC_KHAU_TRU: "1331",
  PHAI_TRA_NGUOI_BAN: "331",
  PHAI_TRA_NGUOI_LAO_DONG: "334",
  BHXH_PHAI_NOP: "3383",
  THUE_GTGT_DAU_RA: "33311",
  DOANH_THU: "511",
  GIA_VON_HANG_BAN: "632",
  CHI_PHI_QUAN_LY_DOANH_NGHIEP: "642",
} as const;

export const TK_LABEL: Record<string, string> = {
  [TK.TIEN_MAT]: "Tiền mặt",
  [TK.NGAN_HANG]: "Tiền gửi ngân hàng",
  [TK.PHAI_THU_KHACH_HANG]: "Phải thu khách hàng",
  [TK.TAM_UNG]: "Tạm ứng",
  [TK.THUE_GTGT_DUOC_KHAU_TRU]: "Thuế GTGT được khấu trừ",
  [TK.PHAI_TRA_NGUOI_BAN]: "Phải trả người bán",
  [TK.PHAI_TRA_NGUOI_LAO_DONG]: "Phải trả người lao động",
  [TK.BHXH_PHAI_NOP]: "BHXH, BHYT, BHTN, KPCĐ phải nộp",
  [TK.THUE_GTGT_DAU_RA]: "Thuế GTGT đầu ra",
  [TK.DOANH_THU]: "Doanh thu bán hàng và cung cấp dịch vụ",
  [TK.GIA_VON_HANG_BAN]: "Giá vốn hàng bán",
  [TK.CHI_PHI_QUAN_LY_DOANH_NGHIEP]: "Chi phí quản lý doanh nghiệp",
};

/** Tien mat/tai khoan ngan hang -> ma TK 1111/1121 tuong ung. */
export function tkTheoPhuongThuc(pt: "Tiền mặt" | "Tài khoản công ty" | null | undefined): string {
  return pt === "Tài khoản công ty" ? TK.NGAN_HANG : TK.TIEN_MAT;
}

/** Ghi chu chuan de dan vao dau file Excel co cot dinh khoan goi y. */
export const GHI_CHU_DINH_KHOAN_GOI_Y =
  "Cột định khoản (TK Nợ/TK Có) là gợi ý để đối chiếu khi nhập lại vào phần mềm kế toán — không phải bút toán chính thức, cần kiểm tra lại trước khi ghi sổ.";
