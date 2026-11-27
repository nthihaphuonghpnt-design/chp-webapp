"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { taoWorkbook, themSheetKeO, taiWorkbook } from "@/lib/excel";
import {
  phanLoaiChiPhi,
  tongPhanLoaiChiPhi,
  doanhThuVoiFallbackGiaDonHang,
  tinhCongNoTheoLo,
  type DongPhaiThuInput,
  type HoaDonChoPhaiThuInput,
} from "@/lib/baoCao";
import { khachXuatDichVu, type NhomCoMe } from "@/lib/nhomKhach";
import { khoangThangVietNam } from "@/lib/ngayVietNam";

interface DonHang {
  id: string;
  so_don_hang: string;
  ngay_len_don: string;
  trang_thai: string;
  sale_phu_trach_id: string | null;
  khach_hang_id: string | null;
  khach_hang_dich_vu_id?: string | null;
  gia: number | null;
}
interface ChiPhi {
  don_hang_id: string;
  loai_chi_phi_id: string | null;
  nha_cung_cap_id: string | null;
  doi_tac_thue_ngoai_id: string | null;
  so_tien_da_chi: number | null;
  gia_ban_sell: number | null;
  chi_ho: boolean;
  noi_bo: boolean;
  vat_percent: number | null;
  hoa_don_id: string | null;
  ngay_phat_sinh: string;
  tinh_trang_thanh_toan: string;
  so_tien_da_thanh_toan: number | null;
  trang_thai: string;
}
interface PhuThu {
  don_hang_id: string;
  thanh_tien: number | null;
  hoa_don_id: string | null;
}
interface ThueNgoai {
  don_hang_id: string;
  doi_tac_thue_ngoai_id: string | null;
  so_tien_da_chi: number | null;
  gia_ban_sell: number | null;
  chi_ho: boolean;
  hoa_don_id: string | null;
  so_tien_da_thanh_toan: number | null;
  ngay_thue: string;
  trang_thai: string;
}
interface ChiPhiGiaoNhan {
  don_hang_id: string;
  thanh_tien: number | null;
}
interface HoaDon {
  id: string;
  khach_hang_id: string;
  so_hoa_don: string | null;
  ngay_xuat: string;
  tong_tien: number;
  tien_chi_ho: number | null;
  so_tien_da_thu: number | null;
  trang_thai_thanh_toan: string;
  trang_thai: "Đã phát hành" | "Đã điều chỉnh" | "Đã thay thế" | "Đã hủy";
}
interface HoaDonDonHang {
  hoa_don_id: string;
  don_hang_id: string;
}
interface DinhPhi {
  thang_nam: string;
  so_tien: number | null;
}
interface Option {
  id: string;
  ten: string;
}
interface KhachHang {
  id: string;
  ten_day_du: string;
  ten_viet_tat: string | null;
  nhom_khach_hang_id?: string | null;
}
interface NhanVien {
  id: string;
  ho_ten: string;
}

const TRANG_THAI_DON = ["Tiếp nhận", "Làm thủ tục", "Thông quan", "Giao hàng", "Hoàn tất"];

function monthRange() {
  return khoangThangVietNam();
}

function fmt(n: number) {
  return n.toLocaleString("en-US");
}

export default function BaoCaoView({
  donHangList,
  chiPhiList,
  phuThuList,
  thueNgoaiList,
  hoaDonList,
  hoaDonDonHangList,
  dinhPhiList,
  chiPhiGiaoNhanList,
  nhaCungCapList,
  doiTacList,
  loaiChiPhiList,
  khachHangList,
  nhanVienList,
  currentUserId,
  currentPhongBan,
  nhomList = [],
}: {
  nhomList?: NhomCoMe[];
  donHangList: DonHang[];
  chiPhiList: ChiPhi[];
  phuThuList: PhuThu[];
  thueNgoaiList: ThueNgoai[];
  hoaDonList: HoaDon[];
  hoaDonDonHangList: HoaDonDonHang[];
  dinhPhiList: DinhPhi[];
  chiPhiGiaoNhanList: ChiPhiGiaoNhan[];
  nhaCungCapList: Option[];
  doiTacList: Option[];
  loaiChiPhiList: Option[];
  khachHangList: KhachHang[];
  nhanVienList: NhanVien[];
  currentUserId?: string;
  currentPhongBan: string;
}) {
  const defaultRange = monthRange();
  const [tuNgay, setTuNgay] = useState(defaultRange.start);
  const [denNgay, setDenNgay] = useState(defaultRange.end);
  // P2 muc 13 (2026-11-27): man hinh "Debit" thay file doi_chieu_debit_Excel_vs_webapp.xlsx
  // — loc rieng theo khach cho bang Cong no theo lo, khong anh huong cac bang khac.
  const [khachHangLocDebit, setKhachHangLocDebit] = useState("");

  const isKeToanOrGiamDoc = currentPhongBan === "Kế toán" || currentPhongBan === "Giám đốc";
  const isSale = currentPhongBan === "Sale";

  function nccTen(id: string | null) {
    return nhaCungCapList.find((n) => n.id === id)?.ten ?? doiTacList.find((n) => n.id === id)?.ten ?? "—";
  }
  function khTen(id: string | null) {
    const kh = khachHangList.find((k) => k.id === id);
    return kh ? kh.ten_viet_tat || kh.ten_day_du : "—";
  }
  function nvTen(id: string | null) {
    return nhanVienList.find((n) => n.id === id)?.ho_ten ?? "—";
  }
  const donHangTrongKy = donHangList.filter((d) => d.ngay_len_don >= tuNgay && d.ngay_len_don <= denNgay);

  // --- Dinh phi phan bo theo thang (dung toan bo du lieu, khong loc theo ky, giong logic o trang chi tiet don hang) ---
  const dinhPhiTheoThang = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of dinhPhiList) map.set(d.thang_nam, (map.get(d.thang_nam) ?? 0) + (d.so_tien ?? 0));
    return map;
  }, [dinhPhiList]);
  const soLoTheoThang = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of donHangList) {
      const key = d.ngay_len_don.slice(0, 7);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [donHangList]);
  function dinhPhiPhanBoChoDon(d: DonHang) {
    const key = d.ngay_len_don.slice(0, 7);
    const tong = dinhPhiTheoThang.get(key) ?? 0;
    const soLo = soLoTheoThang.get(key) ?? 0;
    return soLo > 0 ? tong / soLo : 0;
  }

  // --- 1) Don hang theo trang thai ---
  const theoTrangThai = TRANG_THAI_DON.map((tt) => ({
    trangThai: tt,
    soLuong: donHangTrongKy.filter((d) => d.trang_thai === tt).length,
  }));

  // --- 2) Loi nhuan theo lo hang (Ke toan/Giam doc) ---
  const loiNhuanTheoLo = useMemo(() => {
    if (!isKeToanOrGiamDoc) return [];
    return donHangTrongKy.map((d) => {
      const cp = chiPhiList.filter((c) => c.don_hang_id === d.id && c.trang_thai !== "Từ chối");
      const { doanhThu, chiPhiThuc, chiHo } = tongPhanLoaiChiPhi(cp);
      const buy = chiPhiThuc;
      const thueNgoaiHopLe = thueNgoaiList.filter((t) => t.don_hang_id === d.id && t.trang_thai !== "Từ chối");
      const soKhoanChoDuyet = cp.filter((c) => c.trang_thai !== "Đã duyệt").length +
        thueNgoaiHopLe.filter((t) => t.trang_thai !== "Đã duyệt").length;
      // Dong Thue ngoai Chi ho loai khoi ca doanh thu lan chi phi, giong het
      // cach chi_ho dang loai o Chi phi phat sinh (xem page.tsx chi tiet don
      // hang — cung logic, phai giu khop nhau).
      const thueNgoaiKhongChiHo = thueNgoaiHopLe.filter((t) => !t.chi_ho);
      const sellItemize =
        doanhThu +
        phuThuList.filter((p) => p.don_hang_id === d.id).reduce((s, p) => s + (p.thanh_tien ?? 0), 0) +
        thueNgoaiKhongChiHo.reduce((s, t) => s + (t.gia_ban_sell ?? 0), 0);
      // Chua ai nhap gia ban tung dong thi tam dung Gia ban chung cua don
      // hang lam co so — xem doanhThuVoiFallbackGiaDonHang trong baoCao.ts.
      const sell = doanhThuVoiFallbackGiaDonHang(sellItemize, d.gia);
      const thueNgoaiBuy = thueNgoaiKhongChiHo.reduce((s, t) => s + (t.so_tien_da_chi ?? 0), 0);
      const giaoNhan = chiPhiGiaoNhanList.filter((g) => g.don_hang_id === d.id).reduce((s, g) => s + (g.thanh_tien ?? 0), 0);
      const dinhPhi = dinhPhiPhanBoChoDon(d);
      const lnTruocHoaHong = sell - buy - thueNgoaiBuy - giaoNhan - dinhPhi;
      return { donHang: d, sell, buy, thueNgoaiBuy, giaoNhan, dinhPhi, chiHo, soKhoanChoDuyet, lnTruocHoaHong, hoaHongSale: lnTruocHoaHong * 0.4, lnCongTy: lnTruocHoaHong * 0.6 };
    });
  }, [donHangTrongKy, chiPhiList, phuThuList, thueNgoaiList, chiPhiGiaoNhanList, isKeToanOrGiamDoc]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- 2b) Cong no theo lo (Ke toan/Giam doc) ---
  // CONG THUC DUY NHAT (P1 muc 1, 2026-11-26): xem tinhCongNoTheoLo trong
  // lib/baoCao.ts — dung chung voi Bang ke, Hoa don xuat, Tab chi tiet don.
  const congNoTheoLo = useMemo(() => {
    if (!isKeToanOrGiamDoc) return [];
    const hoaDonMap = new Map<string, HoaDonChoPhaiThuInput>(
      hoaDonList
        .filter((h) => h.trang_thai !== "Đã hủy" && h.trang_thai !== "Đã thay thế")
        .map((h) => [h.id, { id: h.id, so_tien_da_thu: h.so_tien_da_thu, tong_tien: h.tong_tien, tien_chi_ho: h.tien_chi_ho }]),
    );
    const dongList: DongPhaiThuInput[] = [
      ...chiPhiList
        .filter((c) => c.trang_thai !== "Từ chối")
        .map((c) => ({
          don_hang_id: c.don_hang_id,
          chi_ho: c.chi_ho,
          gia_ban_sell: c.gia_ban_sell,
          vat_percent: c.vat_percent,
          so_tien_da_chi: c.so_tien_da_chi,
          hoa_don_id: c.hoa_don_id && hoaDonMap.has(c.hoa_don_id) ? c.hoa_don_id : null,
        })),
      ...phuThuList.map((p) => ({
        don_hang_id: p.don_hang_id,
        chi_ho: false,
        gia_ban_sell: p.thanh_tien,
        vat_percent: null,
        so_tien_da_chi: null,
        hoa_don_id: p.hoa_don_id && hoaDonMap.has(p.hoa_don_id) ? p.hoa_don_id : null,
      })),
      ...thueNgoaiList
        .filter((t) => t.trang_thai !== "Từ chối")
        .map((t) => ({
          don_hang_id: t.don_hang_id,
          chi_ho: t.chi_ho,
          gia_ban_sell: t.gia_ban_sell,
          vat_percent: null, // don_thue_ngoai chua co cot VAT rieng
          so_tien_da_chi: t.so_tien_da_chi,
          hoa_don_id: t.hoa_don_id && hoaDonMap.has(t.hoa_don_id) ? t.hoa_don_id : null,
        })),
    ];
    // Lay gia cua TOAN BO don (khong chi trong ky): hoa don gop co the gom lo ngoai ky.
    const giaDonHangMap = new Map(donHangList.map((d) => [d.id, d.gia]));
    const ketQua = tinhCongNoTheoLo(
      donHangTrongKy.map((d) => d.id),
      dongList,
      hoaDonMap,
      giaDonHangMap,
      hoaDonDonHangList,
    );
    return donHangTrongKy.map((d) => {
      const kq = ketQua.get(d.id)!;
      const hoaDonIds = hoaDonDonHangList.filter((l) => l.don_hang_id === d.id).map((l) => l.hoa_don_id);
      const hoaDonLienQuan = hoaDonList.filter((h) => hoaDonIds.includes(h.id) && h.trang_thai !== "Đã hủy" && h.trang_thai !== "Đã thay thế");
      const khDichVuId = khachXuatDichVu(d, khachHangList, nhomList);
      const phaiThuDichVu = kq.dichVuTruocVat + kq.vat;
      return {
        donHang: d,
        khTen: khTen(d.khach_hang_id),
        khDichVuId,
        khDichVuTen: khTen(khDichVuId),
        // Tach 2 ben: dich vu + VAT (khach xuat HD dich vu) va chi ho (khach cua lo).
        phaiThuDichVu,
        daThuDichVu: kq.daThu - kq.daThuChiHo,
        daThuChiHo: kq.daThuChiHo,
        conDichVu: phaiThuDichVu - (kq.daThu - kq.daThuChiHo),
        conChiHo: kq.chiHo - kq.daThuChiHo,
        tamTinh: kq.tamTinh,
        dichVuTruocVat: kq.dichVuTruocVat,
        vat: kq.vat,
        chiHo: kq.chiHo,
        tongPhaiThu: kq.tongPhaiThu,
        daThu: kq.daThu,
        conPhaiThu: kq.conPhaiThu,
        soHoaDon: hoaDonLienQuan.map((h) => h.so_hoa_don || "(chưa có số)").join(", "),
        soLuongHoaDon: hoaDonLienQuan.length,
        // Neu 1 hoa don gom nhieu don hang thi da thu hien da duoc PHAN BO theo
        // ty le dich vu cua tung lo (xem tinhCongNoTheoLo) — van hien canh bao
        // de ke toan biet so "Da thu" nay la phan bo, khong phai tien thuc nhan
        // rieng cho lo nay.
        gomNhieuDon: hoaDonLienQuan.some((h) => hoaDonDonHangList.filter((l) => l.hoa_don_id === h.id).length > 1),
      };
    });
  }, [donHangTrongKy, chiPhiList, phuThuList, thueNgoaiList, hoaDonDonHangList, hoaDonList, isKeToanOrGiamDoc]); // eslint-disable-line react-hooks/exhaustive-deps

  // P2 muc 13: "Trang thai" cua 1 lo theo dung 4 muc doc yeu cau — thay the
  // viec Ke toan tu doi chieu tay voi file Excel rieng.
  function trangThaiDebit(r: (typeof congNoTheoLo)[number]): string {
    if (r.soLuongHoaDon === 0) return "Chưa xuất HĐ";
    if (r.conPhaiThu <= 0) return "Đã thu";
    if (r.daThu > 0) return "Thu một phần";
    return "Đã xuất chưa thu";
  }
  const TRANG_THAI_DEBIT_COLOR: Record<string, string> = {
    "Chưa xuất HĐ": "bg-slate-100 text-slate-600",
    "Đã xuất chưa thu": "bg-amber-100 text-amber-700",
    "Thu một phần": "bg-blue-100 text-blue-700",
    "Đã thu": "bg-green-100 text-green-700",
  };
  // Gia tri loc: id khach hang, hoac "nhom:<id nhom>". Khop neu 1 trong 2 ben cua lo khop.
  function khopBoLocKhach(id: string | null) {
    if (!id) return false;
    if (!khachHangLocDebit.startsWith("nhom:")) return id === khachHangLocDebit;
    return khachHangList.find((k) => k.id === id)?.nhom_khach_hang_id === khachHangLocDebit.slice(5);
  }
  const congNoTheoLoLoc = khachHangLocDebit
    ? congNoTheoLo.filter((r) => khopBoLocKhach(r.donHang.khach_hang_id) || khopBoLocKhach(r.khDichVuId))
    : congNoTheoLo;
  const tongLoc = congNoTheoLoLoc.reduce(
    (s, r) => ({ phaiThu: s.phaiThu + r.tongPhaiThu, daThu: s.daThu + r.daThu, conDichVu: s.conDichVu + r.conDichVu, conChiHo: s.conChiHo + r.conChiHo }),
    { phaiThu: 0, daThu: 0, conDichVu: 0, conChiHo: 0 },
  );

  function handleExportDebit() {
    const wb = taoWorkbook();
    themSheetKeO(wb, {
      sheetName: "Debit theo lô",
      columns: [
        { header: "Số đơn", key: "soDon", width: 14 },
        { header: "Khách HĐ chi hộ", key: "kh", width: 20 },
        { header: "Khách HĐ dịch vụ", key: "khDv", width: 20 },
        { header: "Hóa đơn", key: "soHd", width: 18 },
        { header: "Còn nợ dịch vụ + VAT", key: "conDv", width: 18, numFmt: "#,##0" },
        { header: "Còn nợ chi hộ", key: "conCh", width: 16, numFmt: "#,##0" },
        { header: "VAT", key: "vat", width: 14, numFmt: "#,##0" },
        { header: "Chi hộ", key: "chiHo", width: 14, numFmt: "#,##0" },
        { header: "Tổng phải thu", key: "tongPhaiThu", width: 16, numFmt: "#,##0" },
        { header: "Đã thu", key: "daThu", width: 14, numFmt: "#,##0" },
        { header: "Còn nợ", key: "conPhaiThu", width: 14, numFmt: "#,##0" },
        { header: "Trạng thái", key: "trangThai", width: 18 },
      ],
      rows: congNoTheoLoLoc.map((r) => [
        r.donHang.so_don_hang,
        r.khTen,
        r.khDichVuTen,
        r.soLuongHoaDon > 0 ? r.soHoaDon : "Chưa xuất HĐ",
        r.conDichVu,
        r.conChiHo,
        r.vat,
        r.chiHo,
        r.tongPhaiThu,
        r.daThu,
        r.conPhaiThu,
        trangThaiDebit(r),
      ]),
    });
    taiWorkbook(wb, `debit-${tuNgay}-den-${denNgay}.xlsx`);
  }

  // --- 3) Doanh so theo Sale ---
  const doanhSoTheoSale = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of loiNhuanTheoLo.length > 0 ? loiNhuanTheoLo : []) {
      const saleId = row.donHang.sale_phu_trach_id ?? "chua-gan";
      map.set(saleId, (map.get(saleId) ?? 0) + row.sell);
    }
    // Neu khong phai Ke toan/Giam doc (khong co loiNhuanTheoLo), tinh rieng doanh so tu sell da co
    // — dung CHUNG dieu kien loc voi loiNhuanTheoLo o tren (loai "Tu choi", cong
    // ca thue ngoai) de "Doanh so theo Sale" Sale tu xem khop voi so Ke toan/Giam
    // doc thay khi xem cung 1 lo. Xem BUG (Phase 6): truoc day nhanh nay khong
    // loai "Tu choi" nen Sale thay so cao hon that.
    if (loiNhuanTheoLo.length === 0) {
      for (const d of donHangTrongKy) {
        const saleId = d.sale_phu_trach_id ?? "chua-gan";
        const cp = chiPhiList.filter((c) => c.don_hang_id === d.id && c.trang_thai !== "Từ chối");
        const thueNgoaiHopLe = thueNgoaiList.filter((t) => t.don_hang_id === d.id && t.trang_thai !== "Từ chối" && !t.chi_ho);
        const sellItemize =
          tongPhanLoaiChiPhi(cp).doanhThu +
          phuThuList.filter((p) => p.don_hang_id === d.id).reduce((s, p) => s + (p.thanh_tien ?? 0), 0) +
          thueNgoaiHopLe.reduce((s, t) => s + (t.gia_ban_sell ?? 0), 0);
        const sell = doanhThuVoiFallbackGiaDonHang(sellItemize, d.gia);
        map.set(saleId, (map.get(saleId) ?? 0) + sell);
      }
    }
    let entries = Array.from(map.entries()).map(([saleId, sell]) => ({
      saleId,
      ten: saleId === "chua-gan" ? "(Chưa gán Sale)" : nvTen(saleId),
      sell,
    }));
    if (isSale) entries = entries.filter((e) => e.saleId === currentUserId);
    return entries;
  }, [loiNhuanTheoLo, donHangTrongKy, chiPhiList, phuThuList, thueNgoaiList, isSale, currentUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- 4) Bao cao chi phi theo loai ---
  // Loai "Tu choi" — dung CHUNG dieu kien voi loiNhuanTheoLo/congNoTheoLo o tren,
  // vi chiPhiTrongKy con duoc dung lai cho congNoPhaiTra (5) ben duoi: chi phi bi
  // tu choi khong phai no phai tra that su, khong nen tinh vao ca 2 bao cao nay.
  const chiPhiTrongKy = chiPhiList.filter(
    (c) => c.ngay_phat_sinh >= tuNgay && c.ngay_phat_sinh <= denNgay && c.trang_thai !== "Từ chối"
  );
  const chiPhiTheoLoai = useMemo(() => {
    const map = new Map<string, { ten: string; buy: number; sell: number; chiHo: number }>();
    for (const c of chiPhiTrongKy) {
      const key = c.loai_chi_phi_id ?? "khac";
      const ten = loaiChiPhiList.find((l) => l.id === c.loai_chi_phi_id)?.ten ?? "Khác";
      if (!map.has(key)) map.set(key, { ten, buy: 0, sell: 0, chiHo: 0 });
      const m = map.get(key)!;
      const p = phanLoaiChiPhi(c);
      m.buy += p.chiPhiThuc;
      m.sell += p.doanhThu;
      m.chiHo += p.chiHo;
    }
    return Array.from(map.values());
  }, [chiPhiTrongKy, loaiChiPhiList]);

  // --- 5) Cong no phai thu (theo khach hang) ---
  // Cong tu CHINH congNoTheoLo (2b) theo khach hang cua tung lo — dam bao tong
  // theo khach LUON bang tong cac lo cua khach do (yeu cau P1 muc 1 dong 26),
  // khong tu tinh rieng tu hoa don nhu truoc (de lech voi congNoTheoLo).
  const congNoPhaiThu = useMemo(() => {
    const map = new Map<string, { id: string; ten: string; tongHoaDon: number; daThu: number; conPhaiThu: number }>();
    function cong(id: string | null, ten: string, phaiThu: number, daThu: number) {
      const key = id ?? "khac";
      if (!map.has(key)) map.set(key, { id: key, ten, tongHoaDon: 0, daThu: 0, conPhaiThu: 0 });
      const m = map.get(key)!;
      m.tongHoaDon += phaiThu;
      m.daThu += daThu;
      m.conPhaiThu += phaiThu - daThu;
    }
    for (const r of congNoTheoLo) {
      cong(r.khDichVuId, r.khDichVuTen, r.phaiThuDichVu, r.daThuDichVu);
      if (r.chiHo || r.daThuChiHo) cong(r.donHang.khach_hang_id, r.khTen, r.chiHo, r.daThuChiHo);
    }
    return Array.from(map.values());
  }, [congNoTheoLo]);

  const congNoTheoNhom = nhomList
    .map((n) => {
      const ds = congNoPhaiThu.filter((r) => khachHangList.find((k) => k.id === r.id)?.nhom_khach_hang_id === n.id);
      return {
        id: n.id,
        ten: n.ten,
        soKhach: ds.length,
        tongHoaDon: ds.reduce((s, r) => s + r.tongHoaDon, 0),
        daThu: ds.reduce((s, r) => s + r.daThu, 0),
        conPhaiThu: ds.reduce((s, r) => s + r.conPhaiThu, 0),
      };
    })
    .filter((n) => n.soKhach > 0);

  // --- 6) Cong no phai tra (NCC tu chi phi noi bo, + doi tac tu thue ngoai) ---
  // Loai "Tu choi" — cung ly do nhu chiPhiTrongKy o tren; con dung lai cho (7)
  // Loi nhuan theo doi tac thue ngoai ben duoi.
  const thueNgoaiTrongKy = thueNgoaiList.filter(
    (t) => t.ngay_thue >= tuNgay && t.ngay_thue <= denNgay && t.trang_thai !== "Từ chối"
  );
  const congNoPhaiTra = useMemo(() => {
    const map = new Map<string, { ten: string; tongNo: number; daTra: number }>();
    for (const c of chiPhiTrongKy) {
      const key = c.nha_cung_cap_id ?? c.doi_tac_thue_ngoai_id;
      if (!key) continue;
      if (!map.has(key)) map.set(key, { ten: nccTen(key), tongNo: 0, daTra: 0 });
      const m = map.get(key)!;
      m.tongNo += c.so_tien_da_chi ?? 0;
      m.daTra += c.so_tien_da_thanh_toan ?? 0;
    }
    for (const t of thueNgoaiTrongKy) {
      const key = t.doi_tac_thue_ngoai_id;
      if (!key) continue;
      if (!map.has(key)) map.set(key, { ten: nccTen(key), tongNo: 0, daTra: 0 });
      const m = map.get(key)!;
      m.tongNo += t.so_tien_da_chi ?? 0;
      m.daTra += t.so_tien_da_thanh_toan ?? 0;
    }
    return Array.from(map.values()).map((m) => ({ ...m, conPhaiTra: m.tongNo - m.daTra }));
  }, [chiPhiTrongKy, thueNgoaiTrongKy]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- 7) Loi nhuan theo doi tac thue ngoai ---
  const loiNhuanTheoDoiTac = useMemo(() => {
    const map = new Map<string, { ten: string; buy: number; sell: number }>();
    for (const t of thueNgoaiTrongKy) {
      const key = t.doi_tac_thue_ngoai_id ?? "khac";
      if (!map.has(key)) map.set(key, { ten: nccTen(t.doi_tac_thue_ngoai_id), buy: 0, sell: 0 });
      const m = map.get(key)!;
      m.buy += t.so_tien_da_chi ?? 0;
      m.sell += t.gia_ban_sell ?? 0;
    }
    return Array.from(map.values()).map((m) => ({ ...m, chenhLech: m.sell - m.buy }));
  }, [thueNgoaiTrongKy]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleExportAll() {
    const wb = taoWorkbook();
    themSheetKeO(wb, {
      sheetName: "Đơn hàng theo TT",
      columns: [
        { header: "Trạng thái", key: "tt", width: 16 },
        { header: "Số lượng", key: "sl", width: 10 },
      ],
      rows: theoTrangThai.map((r) => [r.trangThai, r.soLuong]),
    });
    themSheetKeO(wb, {
      sheetName: "Doanh số theo Sale",
      columns: [
        { header: "Sale", key: "sale", width: 18 },
        { header: "Doanh số", key: "sell", width: 16 },
      ],
      rows: doanhSoTheoSale.map((r) => [r.ten, r.sell]),
    });
    if (isKeToanOrGiamDoc) {
      themSheetKeO(wb, {
        sheetName: "Lợi nhuận theo lô",
        columns: [
          { header: "Số đơn", key: "soDon", width: 14 },
          { header: "Giá bán", key: "sell", width: 14 },
          { header: "Số tiền đã chi", key: "buy", width: 16 },
          { header: "Số tiền đã chi thuê ngoài", key: "thueNgoaiBuy", width: 18 },
          { header: "Giao nhận / COMMS CT, HT", key: "giaoNhan", width: 22 },
          { header: "Định phí phân bổ", key: "dinhPhi", width: 14 },
          { header: "Chi hộ (không tính lãi/lỗ)", key: "chiHo", width: 18 },
          { header: "Khoản chưa duyệt", key: "soKhoanChoDuyet", width: 18 },
          { header: "LN tạm tính trước hoa hồng", key: "lnTruocHoaHong", width: 27 },
          { header: "Hoa hồng Sale dự kiến", key: "hoaHongSale", width: 23 },
          { header: "LN công ty tạm tính", key: "lnCongTy", width: 22 },
        ],
        rows: loiNhuanTheoLo.map((r) => [
          r.donHang.so_don_hang,
          r.sell,
          r.buy,
          r.thueNgoaiBuy,
          r.giaoNhan,
          r.dinhPhi,
          r.chiHo,
          r.soKhoanChoDuyet,
          r.lnTruocHoaHong,
          r.hoaHongSale,
          r.lnCongTy,
        ]),
      });
      themSheetKeO(wb, {
        sheetName: "Công nợ theo lô",
        columns: [
          { header: "Số đơn", key: "soDon", width: 14 },
          { header: "Khách hàng", key: "kh", width: 20 },
          { header: "Dịch vụ (trước VAT)", key: "dichVu", width: 18, numFmt: "#,##0" },
          { header: "VAT", key: "vat", width: 14, numFmt: "#,##0" },
          { header: "Chi hộ", key: "chiHo", width: 14, numFmt: "#,##0" },
          { header: "Tổng phải thu", key: "tongPhaiThu", width: 16, numFmt: "#,##0" },
          { header: "Số hóa đơn", key: "soHd", width: 18 },
          { header: "Đã thu", key: "daThu", width: 14, numFmt: "#,##0" },
          { header: "Còn phải thu", key: "conPhaiThu", width: 14, numFmt: "#,##0" },
          { header: "Trạng thái", key: "trangThai", width: 18 },
        ],
        rows: congNoTheoLo.map((r) => [
          r.donHang.so_don_hang,
          r.khTen,
          r.dichVuTruocVat,
          r.vat,
          r.chiHo,
          r.tongPhaiThu,
          r.soLuongHoaDon > 0 ? r.soHoaDon : "Chưa xuất HĐ",
          r.daThu,
          r.conPhaiThu,
          trangThaiDebit(r),
        ]),
      });
      themSheetKeO(wb, {
        sheetName: "Chi phí theo loại",
        columns: [
          { header: "Loại chi phí", key: "loai", width: 20 },
          { header: "Số tiền đã chi", key: "buy", width: 16 },
          { header: "Giá bán", key: "sell", width: 14 },
          { header: "Chi hộ", key: "chiHo", width: 14 },
        ],
        rows: chiPhiTheoLoai.map((r) => [r.ten, r.buy, r.sell, r.chiHo]),
      });
      themSheetKeO(wb, {
        sheetName: "Công nợ phải thu",
        columns: [
          { header: "Khách hàng", key: "kh", width: 22 },
          { header: "Tổng phải thu", key: "tongHoaDon", width: 16 },
          { header: "Đã thu", key: "daThu", width: 14 },
          { header: "Còn phải thu", key: "conPhaiThu", width: 14 },
        ],
        rows: congNoPhaiThu.map((r) => [r.ten, r.tongHoaDon, r.daThu, r.conPhaiThu]),
      });
      themSheetKeO(wb, {
        sheetName: "Công nợ phải trả",
        columns: [
          { header: "NCC/Đối tác", key: "ncc", width: 22 },
          { header: "Tổng nợ", key: "tongNo", width: 14 },
          { header: "Đã trả", key: "daTra", width: 14 },
          { header: "Còn phải trả", key: "conPhaiTra", width: 14 },
        ],
        rows: congNoPhaiTra.map((r) => [r.ten, r.tongNo, r.daTra, r.conPhaiTra]),
      });
      themSheetKeO(wb, {
        sheetName: "LN theo đối tác thuê ngoài",
        columns: [
          { header: "Đối tác", key: "doiTac", width: 20 },
          { header: "Số tiền đã chi", key: "buy", width: 16 },
          { header: "Giá bán", key: "sell", width: 14 },
          { header: "Chênh lệch", key: "chenhLech", width: 14 },
        ],
        rows: loiNhuanTheoDoiTac.map((r) => [r.ten, r.buy, r.sell, r.chenhLech]),
      });
    }
    await taiWorkbook(wb, `bao-cao-${tuNgay}_${denNgay}.xlsx`);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Báo cáo</h1>
        <button onClick={handleExportAll} className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm">
          Xuất Excel tổng hợp
        </button>
      </div>

      <div className="mb-6 flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-xs text-slate-500">Từ ngày</label>
          <input type="date" value={tuNgay} onChange={(e) => setTuNgay(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">Đến ngày</label>
          <input type="date" value={denNgay} onChange={(e) => setDenNgay(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
        </div>
        <Link href="/tam-ung-giai-chi" className="ml-auto text-sm font-medium text-blue-600 underline">
          Xem báo cáo Tạm ứng - Giải chi →
        </Link>
        {isKeToanOrGiamDoc && (
          <Link href="/bao-cao/vat" className="text-sm font-medium text-blue-600 underline">
            Xem báo cáo VAT →
          </Link>
        )}
      </div>

      <Section title="Đơn hàng theo trạng thái">
        <SimpleTable
          cols={["Trạng thái", "Số lượng"]}
          rows={theoTrangThai.map((r) => [r.trangThai, r.soLuong.toString()])}
        />
      </Section>

      <Section title="Doanh số theo Sale">
        <SimpleTable cols={["Sale", "Doanh số"]} rows={doanhSoTheoSale.map((r) => [r.ten, fmt(r.sell)])} />
      </Section>

      {isKeToanOrGiamDoc && (
        <>
          <Section title="Lợi nhuận theo lô hàng (tạm tính)">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    {["Số đơn", "Giá bán", "Số tiền đã chi", "Số tiền đã chi thuê ngoài", "Giao nhận / COMMS CT, HT", "Định phí", "Chi hộ", "Chưa duyệt", "LN trước HH Sale", "HH Sale dự kiến", "LN công ty"].map((h) => (
                      <th key={h} className="px-3 py-2 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loiNhuanTheoLo.map((r) => (
                    <tr key={r.donHang.id} className="border-t border-slate-100">
                      <td className="px-3 py-2">
                        <Link href={`/don-hang/${r.donHang.id}`} className="text-blue-600 hover:underline">
                          {r.donHang.so_don_hang}
                        </Link>
                      </td>
                      <td className="px-3 py-2">{fmt(r.sell)}</td>
                      <td className="px-3 py-2">{fmt(r.buy)}</td>
                      <td className="px-3 py-2">{fmt(r.thueNgoaiBuy)}</td>
                      <td className="px-3 py-2">{fmt(r.giaoNhan)}</td>
                      <td className="px-3 py-2">{fmt(r.dinhPhi)}</td>
                      <td className="px-3 py-2 text-slate-500">{r.chiHo > 0 ? fmt(r.chiHo) : "—"}</td>
                      <td className="px-3 py-2">{r.soKhoanChoDuyet > 0 ? <span className="font-medium text-amber-700">{r.soKhoanChoDuyet} khoản</span> : "—"}</td>
                      <td className="px-3 py-2">{fmt(r.lnTruocHoaHong)}</td>
                      <td className="px-3 py-2">{fmt(r.hoaHongSale)}</td>
                      <td className="px-3 py-2 font-medium">{fmt(r.lnCongTy)}</td>
                    </tr>
                  ))}
                  {loiNhuanTheoLo.length === 0 && (
                    <tr>
                      <td colSpan={11} className="px-3 py-6 text-center text-slate-400">
                        Không có đơn hàng trong khoảng thời gian này.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Số liệu tạm tính có thể gồm chi phí chưa duyệt và đơn hàng chưa hoàn tất; hoa hồng Sale là mức dự kiến, chưa phải số lương đã chốt. Cột &quot;Chi hộ&quot; chỉ để theo dõi (tiền ứng hộ khách, không phải doanh thu/chi phí của công ty) — không cộng vào LN.
            </p>
          </Section>

          <Section id="cong-no-theo-lo" title="Công nợ theo lô hàng (Debit — thay file Excel đối chiếu)">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-500">Lọc theo khách hàng:</label>
                <select
                  value={khachHangLocDebit}
                  onChange={(e) => setKhachHangLocDebit(e.target.value)}
                  className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                >
                  <option value="">Tất cả khách hàng</option>
                  {nhomList.map((n) => (
                    <option key={n.id} value={`nhom:${n.id}`}>
                      Nhóm: {n.ten}
                    </option>
                  ))}
                  {khachHangList.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.ten_viet_tat || k.ten_day_du}
                    </option>
                  ))}
                </select>
              </div>
              <button onClick={handleExportDebit} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
                Xuất Excel (Debit)
              </button>
            </div>
            <p className="mb-2 text-sm text-slate-600">
              Đang lọc: Tổng phải thu <strong>{fmt(tongLoc.phaiThu)}</strong> · Đã thu <strong>{fmt(tongLoc.daThu)}</strong> · Còn nợ dịch vụ + VAT{" "}
              <strong>{fmt(tongLoc.conDichVu)}</strong> · Còn nợ chi hộ <strong>{fmt(tongLoc.conChiHo)}</strong>
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    {["Số đơn", "Khách hàng", "Dịch vụ (trước VAT)", "VAT", "Chi hộ", "Tổng phải thu", "Hóa đơn", "Đã thu", "Còn phải thu", "Trạng thái"].map((h) => (
                      <th key={h} className="px-3 py-2 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {congNoTheoLoLoc.map((r) => {
                    return (
                      <tr key={r.donHang.id} className="border-t border-slate-100">
                        <td className="px-3 py-2">
                          <Link href={`/don-hang/${r.donHang.id}`} className="text-blue-600 hover:underline">
                            {r.donHang.so_don_hang}
                          </Link>
                        </td>
                        <td className="px-3 py-2">
                          {r.khTen}
                          {r.khDichVuId !== r.donHang.khach_hang_id && <p className="text-xs text-slate-400">HĐ dịch vụ: {r.khDichVuTen}</p>}
                        </td>
                        <td className="px-3 py-2">
                          {fmt(r.dichVuTruocVat)}
                          {r.tamTinh && <p className="text-xs text-amber-600">tạm tính theo giá đơn</p>}
                        </td>
                        <td className="px-3 py-2">{fmt(r.vat)}</td>
                        <td className="px-3 py-2">{fmt(r.chiHo)}</td>
                        <td className="px-3 py-2">{fmt(r.tongPhaiThu)}</td>
                        <td className="px-3 py-2">
                          {r.soLuongHoaDon > 0 ? (
                            <>
                              {r.soHoaDon}
                              {r.gomNhieuDon && <span className="ml-1 text-amber-600" title="Hóa đơn này gồm nhiều đơn hàng — Đã thu đã được phân bổ theo tỷ lệ dịch vụ của từng đơn, không phải tiền thực nhận riêng cho đơn này">*</span>}
                            </>
                          ) : (
                            <span className="text-slate-400">Chưa xuất HĐ</span>
                          )}
                        </td>
                        <td className="px-3 py-2">{fmt(r.daThu)}</td>
                        <td className="px-3 py-2 font-medium">
                          {fmt(r.conPhaiThu)}
                          {r.khDichVuId !== r.donHang.khach_hang_id && (
                            <p className="text-xs font-normal text-slate-400">
                              DV {fmt(r.conDichVu)} · Chi hộ {fmt(r.conChiHo)}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TRANG_THAI_DEBIT_COLOR[trangThaiDebit(r)]}`}>
                            {trangThaiDebit(r)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {congNoTheoLoLoc.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-3 py-6 text-center text-slate-400">
                        Không có đơn hàng trong khoảng thời gian này.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              * Hóa đơn gộp nhiều đơn hàng: &quot;Đã thu&quot; của mỗi đơn đã được phân bổ theo tỷ lệ dịch vụ của đơn đó trong hóa đơn, không phải tiền thực nhận riêng cho đơn này.
            </p>
          </Section>

          <Section title="Báo cáo chi phí theo loại">
            <SimpleTable
              cols={["Loại chi phí", "Số tiền đã chi", "Giá bán", "Chi hộ"]}
              rows={chiPhiTheoLoai.map((r) => [r.ten, fmt(r.buy), fmt(r.sell), r.chiHo > 0 ? fmt(r.chiHo) : "—"])}
            />
          </Section>

          {congNoTheoNhom.length > 0 && (
            <Section title="Công nợ phải thu (theo nhóm khách hàng, các lô lên đơn trong kỳ đang chọn)">
              <SimpleTable
                cols={["Nhóm", "Số khách có số liệu", "Tổng phải thu", "Đã thu", "Còn phải thu"]}
                rows={congNoTheoNhom.map((r) => [r.ten, String(r.soKhach), fmt(r.tongHoaDon), fmt(r.daThu), fmt(r.conPhaiThu)])}
              />
            </Section>
          )}

          <Section title="Công nợ phải thu (theo khách hàng)">
            <SimpleTable
              cols={["Khách hàng", "Tổng phải thu", "Đã thu", "Còn phải thu"]}
              rows={congNoPhaiThu.map((r) => [r.ten, fmt(r.tongHoaDon), fmt(r.daThu), fmt(r.conPhaiThu)])}
            />
          </Section>

          <Section title="Công nợ phải trả (theo nhà cung cấp / đối tác thuê ngoài)">
            <SimpleTable
              cols={["NCC/Đối tác", "Tổng nợ", "Đã trả", "Còn phải trả"]}
              rows={congNoPhaiTra.map((r) => [r.ten, fmt(r.tongNo), fmt(r.daTra), fmt(r.conPhaiTra)])}
            />
          </Section>

          <Section title="Lợi nhuận theo đối tác thuê ngoài">
            <SimpleTable
              cols={["Đối tác", "Số tiền đã chi", "Giá bán", "Chênh lệch"]}
              rows={loiNhuanTheoDoiTac.map((r) => [r.ten, fmt(r.buy), fmt(r.sell), fmt(r.chenhLech)])}
            />
          </Section>
        </>
      )}
    </div>
  );
}

function Section({ title, children, id }: { title: string; children: React.ReactNode; id?: string }) {
  return (
    <div id={id} className="mb-6 scroll-mt-4 rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-slate-900">{title}</h2>
      {children}
    </div>
  );
}

function SimpleTable({ cols, rows }: { cols: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-slate-500">
          <tr>
            {cols.map((c) => (
              <th key={c} className="px-3 py-2 font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-slate-100">
              {r.map((v, j) => (
                <td key={j} className="px-3 py-2">
                  {v}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={cols.length} className="px-3 py-6 text-center text-slate-400">
                Không có dữ liệu.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
