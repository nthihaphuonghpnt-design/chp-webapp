// Ma tai khoan ke toan dung CHUNG cho moi noi trong app can goi y dinh khoan
// khi xuat Excel (Hoa don dau vao, So quy, Tam ung/Giai chi, Hoa don xuat...)
// — 1 nguon duy nhat de khong bi lech ma giua cac trang.
//
// Dung theo THONG TU 133/2016/TT-BTC (che do ke toan DOANH NGHIEP NHO VA
// VUA — sua doi, bo sung boi Thong tu 46/2025/TT-BTC hieu luc 01/07/2025),
// khong phai Thong tu 200 — vi CHP la doanh nghiep nho, va TT133 dung ma
// TK don gian hon (111/112, khong chia nho 1111/1121 nhu TT200; gop chung
// "Chi phi ban hang" + "Chi phi quan ly doanh nghiep" thanh 1 TK 642 "Chi
// phi quan ly kinh doanh"). Da xac nhan voi chu doanh nghiep: ap dung dung
// TT133 (khong doi sang TT99/2025, du TT99 cho phep DNNVV tuy chon).
//
// BHXH_PHAI_NOP (338) van giu la ma "cha" dung cho cac cho khac trong app
// chi can dinh khoan gop (vd Tam ung/Giai chi neu sau nay dung toi). Rieng
// Bang luong (luong.ts co ham tinhBhxhChiTiet) tach ro tung tieu khoan CAP 2
// CUA TK 338 DUNG THEO TT133 (da doi chieu voi van ban: 3382 KPCD, 3383
// BHXH, 3384 BHYT, 3385 BHTN — LUU Y so BHTN cua TT133 la 3385, KHAC voi
// quy uoc 3386 cua Thong tu 200/2014/TT-BTC ma nhieu tai lieu tren mang hay
// nham lan, vi 3386 trong TT133 la "Nhan ky quy, ky cuoc", khong phai BHTN).
// KPCD (2% cong ty dong) da duoc tinh tu Bang luong, cung dung ma 3382.
export const TK = {
  TIEN_MAT: "111",
  NGAN_HANG: "112",
  PHAI_THU_KHACH_HANG: "131",
  TAM_UNG: "141",
  THUE_GTGT_DUOC_KHAU_TRU: "133",
  PHAI_TRA_NGUOI_BAN: "331",
  PHAI_TRA_NGUOI_LAO_DONG: "334",
  BHXH_PHAI_NOP: "338",
  BHXH_PHAI_NOP_CHI_TIET: "3383",
  BHYT_PHAI_NOP_CHI_TIET: "3384",
  BHTN_PHAI_NOP_CHI_TIET: "3385",
  KPCD_PHAI_NOP: "3382",
  THUE_GTGT_DAU_RA: "3331",
  THUE_TNCN_PHAI_NOP: "3335",
  DOANH_THU: "511",
  GIA_VON_HANG_BAN: "632",
  CHI_PHI_QUAN_LY_KINH_DOANH: "642",
} as const;

export const TK_LABEL: Record<string, string> = {
  [TK.TIEN_MAT]: "Tiền mặt",
  [TK.NGAN_HANG]: "Tiền gửi ngân hàng",
  [TK.PHAI_THU_KHACH_HANG]: "Phải thu của khách hàng",
  [TK.TAM_UNG]: "Tạm ứng",
  [TK.THUE_GTGT_DUOC_KHAU_TRU]: "Thuế GTGT được khấu trừ",
  [TK.PHAI_TRA_NGUOI_BAN]: "Phải trả cho người bán",
  [TK.PHAI_TRA_NGUOI_LAO_DONG]: "Phải trả người lao động",
  [TK.BHXH_PHAI_NOP]: "Phải trả, phải nộp khác (BHXH/BHYT/BHTN/KPCĐ)",
  [TK.BHXH_PHAI_NOP_CHI_TIET]: "Bảo hiểm xã hội phải nộp",
  [TK.BHYT_PHAI_NOP_CHI_TIET]: "Bảo hiểm y tế phải nộp",
  [TK.BHTN_PHAI_NOP_CHI_TIET]: "Bảo hiểm thất nghiệp phải nộp",
  [TK.KPCD_PHAI_NOP]: "Kinh phí công đoàn phải nộp",
  [TK.THUE_GTGT_DAU_RA]: "Thuế GTGT đầu ra",
  [TK.THUE_TNCN_PHAI_NOP]: "Thuế TNCN phải nộp (khấu trừ hộ người lao động)",
  [TK.DOANH_THU]: "Doanh thu bán hàng và cung cấp dịch vụ",
  [TK.GIA_VON_HANG_BAN]: "Giá vốn hàng bán",
  [TK.CHI_PHI_QUAN_LY_KINH_DOANH]: "Chi phí quản lý kinh doanh",
};

/** Tien mat/tai khoan ngan hang -> ma TK 111/112 tuong ung (TT133). */
export function tkTheoPhuongThuc(pt: "Tiền mặt" | "Tài khoản công ty" | null | undefined): string {
  return pt === "Tài khoản công ty" ? TK.NGAN_HANG : TK.TIEN_MAT;
}

/** Ghi chu chuan de dan vao dau file Excel co cot dinh khoan goi y. */
export const GHI_CHU_DINH_KHOAN_GOI_Y =
  "Cột định khoản (TK Nợ/TK Có) là gợi ý theo Thông tư 133/2016/TT-BTC (chế độ kế toán DNNVV, sửa đổi bởi TT46/2025) để đối chiếu khi nhập lại vào phần mềm kế toán — không phải bút toán chính thức.";
