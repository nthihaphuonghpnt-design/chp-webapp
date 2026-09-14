// Ma tai khoan ke toan dung CHUNG cho moi noi trong app can goi y dinh khoan
// khi xuat Excel (Hoa don dau vao, So quy, Tam ung/Giai chi, Hoa don xuat...)
// — 1 nguon duy nhat de khong bi lech ma giua cac trang.
//
// Dung theo THONG TU 133/2016/TT-BTC (che do ke toan DOANH NGHIEP NHO VA
// VUA — sua doi, bo sung boi Thong tu 46/2025/TT-BTC hieu luc 01/07/2025),
// khong phai Thong tu 200 — vi CHP la doanh nghiep nho, va TT133 dung ma
// TK don gian hon (111/112, khong chia nho 1111/1121 nhu TT200; gop chung
// "Chi phi ban hang" + "Chi phi quan ly doanh nghiep" thanh 1 TK 642 "Chi
// phi quan ly kinh doanh").
//
// LUU Y QUAN TRONG: tu 01/01/2026 con co them Thong tu 99/2025/TT-BTC (ban
// hanh 27/10/2025) THAY THE Thong tu 200 cho doanh nghiep thong thuong, va
// DNNVV duoc QUYEN CHON ap dung theo huong nay thay vi TT133 neu muon. TT99
// tai cau truc lai he thong tai khoan khac han TT200/TT133 cu — nhung
// KHONG co du du lieu de biet chinh xac bang ma TK moi cua TT99 (chi co
// thong tin tong quan qua tra cuu, chua co bang chi tiet tung so TK), nen
// CHUA the cap nhat dung theo TT99 duoc. Neu Ke toan/phan mem ke toan cua
// CHP dang dung TT99 (khong phai TT133), can sua lai file nay cho khop —
// hoi ke toan/don vi lam so sach de xac nhan dang dung che do nao truoc khi
// tin theo cac ma duoi day.
// BHXH_PHAI_NOP (338) van giu la ma "cha" dung cho cac cho khac trong app
// chi can dinh khoan gop (vd Tam ung/Giai chi neu sau nay dung toi). Rieng
// Bang luong (luong.ts co ham tinhBhxhChiTiet) tach ro tung tieu khoan theo
// quy uoc tu Thong tu 200/2014/TT-BTC (3382 KPCD, 3383 BHXH, 3384 BHYT, 3386
// BHTN) — quy uoc nay van duoc dung pho bien trong thuc te du TT133 khong
// bat buoc phai chia nho 338. KPCD (2% cong ty dong, neu co) chua duoc app
// tinh — chi co BHXH/BHYT/BHTN.
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
  BHTN_PHAI_NOP_CHI_TIET: "3386",
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
  "Cột định khoản (TK Nợ/TK Có) là gợi ý theo Thông tư 133/2016/TT-BTC (chế độ kế toán DNNVV, sửa đổi bởi TT46/2025) để đối chiếu khi nhập lại vào phần mềm kế toán — không phải bút toán chính thức. Nếu công ty đang áp dụng Thông tư 99/2025/TT-BTC (thay thế TT200, có hiệu lực từ 01/01/2026) thay vì TT133, cần đối chiếu lại mã tài khoản với kế toán trước khi dùng.";
