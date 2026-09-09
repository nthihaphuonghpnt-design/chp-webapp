// Phan loai thong nhat 1 dong phat_sinh_chi_phi thanh doanh thu / chi phi that / chi ho.
// Dung CHUNG cho moi phep tinh trong BaoCaoView.tsx — khong tu viet reduce/filter rieng le
// o tung cho, de tranh lech nhau giua cac bao cao (chi_ho tung bi tinh nham vao doanh thu
// o loiNhuanTheoLo/chiPhiTheoLoai/doanhSoTheoSale trong khi congNoTheoLo lai loc dung).
export interface ChiPhiPhanLoaiInput {
  gia_von_buy: number | null;
  gia_ban_sell: number | null;
  chi_ho: boolean;
  noi_bo: boolean;
}

export interface PhanLoaiChiPhiKetQua {
  doanhThu: number;
  chiPhiThuc: number;
  chiHo: number;
}

export function phanLoaiChiPhi(c: ChiPhiPhanLoaiInput): PhanLoaiChiPhiKetQua {
  if (c.chi_ho) {
    return { doanhThu: 0, chiPhiThuc: 0, chiHo: c.gia_von_buy ?? 0 };
  }
  return {
    doanhThu: c.gia_ban_sell ?? 0,
    chiPhiThuc: c.noi_bo ? (c.gia_von_buy ?? 0) : 0,
    chiHo: 0,
  };
}

export function tongPhanLoaiChiPhi(rows: ChiPhiPhanLoaiInput[]): PhanLoaiChiPhiKetQua {
  return rows.reduce<PhanLoaiChiPhiKetQua>(
    (acc, c) => {
      const p = phanLoaiChiPhi(c);
      return { doanhThu: acc.doanhThu + p.doanhThu, chiPhiThuc: acc.chiPhiThuc + p.chiPhiThuc, chiHo: acc.chiHo + p.chiHo };
    },
    { doanhThu: 0, chiPhiThuc: 0, chiHo: 0 },
  );
}
