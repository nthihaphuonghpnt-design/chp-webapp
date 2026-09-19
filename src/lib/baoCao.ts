// Phan loai thong nhat 1 dong phat_sinh_chi_phi thanh doanh thu / chi phi that / chi ho.
// Dung CHUNG cho moi phep tinh trong BaoCaoView.tsx — khong tu viet reduce/filter rieng le
// o tung cho, de tranh lech nhau giua cac bao cao (chi_ho tung bi tinh nham vao doanh thu
// o loiNhuanTheoLo/chiPhiTheoLoai/doanhSoTheoSale trong khi congNoTheoLo lai loc dung).
export interface ChiPhiPhanLoaiInput {
  so_tien_da_chi: number | null;
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
    return { doanhThu: 0, chiPhiThuc: 0, chiHo: c.so_tien_da_chi ?? 0 };
  }
  return {
    doanhThu: c.gia_ban_sell ?? 0,
    chiPhiThuc: c.noi_bo ? (c.so_tien_da_chi ?? 0) : 0,
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

// Nhieu lo hang Sale chua nhap gia ban tung dong chi phi/phu thu/thue ngoai
// (chi nhap "Gia ban" chung 1 lan luc tao don, xem don_hang.gia) — neu tong
// doanh thu gop tu tung dong = 0 (chua ai itemize gi ca), dung tam gia ban
// chung cua don hang lam co so tinh loi nhuan/bao cao, theo yeu cau Bao Dung
// (2026-09-19). CHI ap dung khi tong itemize dung la 0 — da co du 1 dong gia
// ban (du nho) thi khong ghi de, tranh sai lech voi du lieu da nhap that.
export function doanhThuVoiFallbackGiaDonHang(tongDoanhThuItemize: number, giaDonHang: number | null): number {
  return tongDoanhThuItemize > 0 ? tongDoanhThuItemize : (giaDonHang ?? 0);
}
