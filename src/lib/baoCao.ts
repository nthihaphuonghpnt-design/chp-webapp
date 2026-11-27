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

// ---------------------------------------------------------------------------
// Cong no phai thu theo lo — CONG THUC DUY NHAT dung chung cho Bao cao, Hoa
// don xuat, Bang ke, Tab chi tiet don (yeu cau P1 muc 1, 2026-11-26).
//
// Phai thu cua lo = (dich vu truoc VAT + VAT) + chi ho − da thu, trong do:
// - Dich vu/VAT lay theo TUNG DONG chi phi/phu thu (khong chi_ho), bat ke
//   dong do da len hoa don hay chua — vat_percent dang la cot CHI DUNG cho
//   VAT dau vao (gia mua) tu truoc (xem tien_thue/tong_tien generated tu
//   so_tien_da_chi), nen o day dung LAI cung cot do cho VAT dau ra (gia ban)
//   theo dung quy uoc moi (muc 2): gia_ban_sell la gia TRUOC VAT, vat_percent
//   null/0 (dong cu chua nhap) -> VAT = 0, KHONG tu suy doan 8% de khong lam
//   sai lech du lieu lich su da nhap theo quy uoc cu (gia da gom VAT).
// - Chi ho: cong du theo so_tien_da_chi, khong VAT, du da len hoa don hay chua.
// - Da thu: PHAN BO theo ty le "claim" (gia tri quy doi sang tien hoa don: dich
//   vu la gia_ban_sell*(1+vat%), chi ho la so_tien_da_chi) cua rieng lo nay
//   trong tung hoa don / tong claim cua TAT CA cac lo gop trong hoa don do —
//   tranh cong lap khi 1 hoa don gom nhieu lo (yeu cau P1 muc 1 dong 25).
export interface DongPhaiThuInput {
  don_hang_id: string;
  chi_ho: boolean;
  gia_ban_sell: number | null;
  vat_percent: number | null;
  so_tien_da_chi: number | null;
  hoa_don_id: string | null;
}
export interface HoaDonChoPhaiThuInput {
  id: string;
  so_tien_da_thu: number | null;
  tong_tien?: number | null;
  tien_chi_ho?: number | null;
}
export interface LienKetHoaDonDonInput {
  hoa_don_id: string;
  don_hang_id: string;
}
export interface CongNoLoKetQua {
  dichVuTruocVat: number;
  vat: number;
  chiHo: number;
  tongPhaiThu: number;
  daThu: number;
  /** Phan cua daThu thuoc chi ho (phan con lai la dich vu + VAT) */
  daThuChiHo: number;
  conPhaiThu: number;
  /** true = chua co dong gia ban nao, dich vu dang lay tam "Gia ban" cua don */
  tamTinh: boolean;
}

function claimCuaDong(d: DongPhaiThuInput): number {
  if (d.chi_ho) return d.so_tien_da_chi ?? 0;
  return (d.gia_ban_sell ?? 0) * (1 + (d.vat_percent ?? 0) / 100);
}

function giaTriCuaLo(dongCuaDon: DongPhaiThuInput[], giaDonHang: number | null) {
  const dichVuRows = dongCuaDon.filter((d) => !d.chi_ho);
  const dichVuTruocVatItemize = dichVuRows.reduce((s, d) => s + (d.gia_ban_sell ?? 0), 0);
  const dichVuTruocVat = doanhThuVoiFallbackGiaDonHang(dichVuTruocVatItemize, giaDonHang);
  // Dung fallback gia don hang (chua itemize dong nao) thi khong co VAT rieng de tinh.
  const vat = dichVuTruocVatItemize > 0 ? dichVuRows.reduce((s, d) => s + (d.gia_ban_sell ?? 0) * (d.vat_percent ?? 0) / 100, 0) : 0;
  const chiHo = dongCuaDon.filter((d) => d.chi_ho).reduce((s, d) => s + (d.so_tien_da_chi ?? 0), 0);
  const tamTinh = dichVuTruocVatItemize <= 0 && dichVuTruocVat > 0;
  return { dichVuTruocVat, vat, chiHo, tongPhaiThu: dichVuTruocVat + vat + chiHo, tamTinh };
}

/** Tinh cong no phai thu cho nhieu lo hang cung luc (hieu qua hon goi tung lo 1,
 * vi can gom claim theo hoa don tren TOAN BO du lieu truoc khi phan bo).
 *
 * lienKet (bang hoa_don_don_hang): hoa don nhap tay chi gan voi don qua bang
 * nay, khong gan hoa_don_id tren tung dong — tien da thu cua chung duoc chia
 * cho cac lo duoc gan theo ty le tong phai thu cua tung lo (chia deu neu tat
 * ca bang 0). De chia dung, dongList/giaDonHangMap phai du ca cac lo gop chung. */
export function tinhCongNoTheoLo(
  donHangIds: string[],
  dongList: DongPhaiThuInput[],
  hoaDonMap: Map<string, HoaDonChoPhaiThuInput>,
  giaDonHangMap: Map<string, number | null>,
  lienKet: LienKetHoaDonDonInput[] = [],
): Map<string, CongNoLoKetQua> {
  const dongTheoDon = new Map<string, DongPhaiThuInput[]>();
  const claimTheoHoaDon = new Map<string, number>();
  for (const d of dongList) {
    const ds = dongTheoDon.get(d.don_hang_id);
    if (ds) ds.push(d);
    else dongTheoDon.set(d.don_hang_id, [d]);
    if (!d.hoa_don_id) continue;
    claimTheoHoaDon.set(d.hoa_don_id, (claimTheoHoaDon.get(d.hoa_don_id) ?? 0) + claimCuaDong(d));
  }
  const giaTri = (donHangId: string) => giaTriCuaLo(dongTheoDon.get(donHangId) ?? [], giaDonHangMap.get(donHangId) ?? null);

  // Hoa don khong co dong nao gan hoa_don_id -> chia theo lienKet.
  const donTheoHoaDon = new Map<string, Set<string>>();
  for (const l of lienKet) {
    if (!hoaDonMap.has(l.hoa_don_id) || (claimTheoHoaDon.get(l.hoa_don_id) ?? 0) > 0) continue;
    const set = donTheoHoaDon.get(l.hoa_don_id) ?? new Set<string>();
    set.add(l.don_hang_id);
    donTheoHoaDon.set(l.hoa_don_id, set);
  }
  const thuQuaLienKet = new Map<string, { tong: number; chiHo: number }>();
  for (const [hid, set] of donTheoHoaDon) {
    const hd = hoaDonMap.get(hid)!;
    const daThuHd = hd.so_tien_da_thu ?? 0;
    if (!daThuHd) continue;
    const ids = Array.from(set);
    const trongSo = ids.map((i) => Math.max(0, giaTri(i).tongPhaiThu));
    const tongTrongSo = trongSo.reduce((a, b) => a + b, 0);
    const tyLeChiHo = (hd.tong_tien ?? 0) > 0 ? Math.min(1, Math.max(0, (hd.tien_chi_ho ?? 0) / hd.tong_tien!)) : 0;
    ids.forEach((donHangId, i) => {
      const phan = daThuHd * (tongTrongSo > 0 ? trongSo[i] / tongTrongSo : 1 / ids.length);
      const cu = thuQuaLienKet.get(donHangId) ?? { tong: 0, chiHo: 0 };
      thuQuaLienKet.set(donHangId, { tong: cu.tong + phan, chiHo: cu.chiHo + phan * tyLeChiHo });
    });
  }

  const result = new Map<string, CongNoLoKetQua>();
  for (const donHangId of donHangIds) {
    const dongCuaDon = dongTheoDon.get(donHangId) ?? [];
    const gt = giaTri(donHangId);
    const hoaDonIds = Array.from(new Set(dongCuaDon.map((d) => d.hoa_don_id).filter((x): x is string => !!x)));
    let daThu = thuQuaLienKet.get(donHangId)?.tong ?? 0;
    let daThuChiHo = thuQuaLienKet.get(donHangId)?.chiHo ?? 0;
    for (const hid of hoaDonIds) {
      const hd = hoaDonMap.get(hid);
      if (!hd) continue;
      const dongCuaHd = dongCuaDon.filter((d) => d.hoa_don_id === hid);
      const claimDon = dongCuaHd.reduce((s, d) => s + claimCuaDong(d), 0);
      const claimDonChiHo = dongCuaHd.filter((d) => d.chi_ho).reduce((s, d) => s + claimCuaDong(d), 0);
      const claimTong = claimTheoHoaDon.get(hid) ?? 0;
      if (claimTong > 0) {
        daThu += (claimDon / claimTong) * (hd.so_tien_da_thu ?? 0);
        daThuChiHo += (claimDonChiHo / claimTong) * (hd.so_tien_da_thu ?? 0);
      }
    }
    result.set(donHangId, { ...gt, daThu, daThuChiHo, conPhaiThu: gt.tongPhaiThu - daThu });
  }
  return result;
}
