"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { taoWorkbook, themSheetKeO, taiWorkbook } from "@/lib/excel";

interface DonHang {
  id: string;
  so_don_hang: string;
  ngay_len_don: string;
  trang_thai: string;
  sale_phu_trach_id: string | null;
  khach_hang_id: string | null;
}
interface ChiPhi {
  don_hang_id: string;
  loai_chi_phi_id: string | null;
  nha_cung_cap_id: string | null;
  doi_tac_thue_ngoai_id: string | null;
  gia_von_buy: number | null;
  gia_ban_sell: number | null;
  chi_ho: boolean;
  noi_bo: boolean;
  ngay_phat_sinh: string;
  tinh_trang_thanh_toan: string;
  so_tien_da_thanh_toan: number | null;
  trang_thai: string;
}
interface PhuThu {
  don_hang_id: string;
  thanh_tien: number | null;
}
interface ThueNgoai {
  don_hang_id: string;
  doi_tac_thue_ngoai_id: string | null;
  gia_von_buy: number | null;
  gia_ban_sell: number | null;
  so_tien_da_thanh_toan: number | null;
  ngay_thue: string;
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
}
interface NhanVien {
  id: string;
  ho_ten: string;
}

const TRANG_THAI_DON = ["Tiếp nhận", "Làm thủ tục", "Thông quan", "Giao hàng", "Hoàn tất"];

function monthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  return { start, end };
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
  nhaCungCapList,
  doiTacList,
  loaiChiPhiList,
  khachHangList,
  nhanVienList,
  currentUserId,
  currentPhongBan,
}: {
  donHangList: DonHang[];
  chiPhiList: ChiPhi[];
  phuThuList: PhuThu[];
  thueNgoaiList: ThueNgoai[];
  hoaDonList: HoaDon[];
  hoaDonDonHangList: HoaDonDonHang[];
  dinhPhiList: DinhPhi[];
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
      const buy = cp.filter((c) => c.noi_bo).reduce((s, c) => s + (c.gia_von_buy ?? 0), 0);
      const sell =
        cp.reduce((s, c) => s + (c.gia_ban_sell ?? 0), 0) +
        phuThuList.filter((p) => p.don_hang_id === d.id).reduce((s, p) => s + (p.thanh_tien ?? 0), 0) +
        thueNgoaiList.filter((t) => t.don_hang_id === d.id).reduce((s, t) => s + (t.gia_ban_sell ?? 0), 0);
      const thueNgoaiBuy = thueNgoaiList.filter((t) => t.don_hang_id === d.id).reduce((s, t) => s + (t.gia_von_buy ?? 0), 0);
      const dinhPhi = dinhPhiPhanBoChoDon(d);
      const lnTruocHoaHong = sell - buy - thueNgoaiBuy - dinhPhi;
      return { donHang: d, sell, buy, thueNgoaiBuy, dinhPhi, lnTruocHoaHong, hoaHongSale: lnTruocHoaHong * 0.4, lnCongTy: lnTruocHoaHong * 0.6 };
    });
  }, [donHangTrongKy, chiPhiList, phuThuList, thueNgoaiList, isKeToanOrGiamDoc]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- 2b) Cong no theo lo (Ke toan/Giam doc): gia ban + chi ho + hoa don da xuat + con phai thu ---
  const congNoTheoLo = useMemo(() => {
    if (!isKeToanOrGiamDoc) return [];
    return donHangTrongKy.map((d) => {
      const cp = chiPhiList.filter((c) => c.don_hang_id === d.id && c.trang_thai !== "Từ chối");
      const giaBan =
        cp.filter((c) => !c.chi_ho).reduce((s, c) => s + (c.gia_ban_sell ?? 0), 0) +
        phuThuList.filter((p) => p.don_hang_id === d.id).reduce((s, p) => s + (p.thanh_tien ?? 0), 0);
      const chiHo = cp.filter((c) => c.chi_ho).reduce((s, c) => s + (c.gia_von_buy ?? 0), 0);
      const hoaDonIds = hoaDonDonHangList.filter((l) => l.don_hang_id === d.id).map((l) => l.hoa_don_id);
      const hoaDonLienQuan = hoaDonList.filter((h) => hoaDonIds.includes(h.id));
      const tongHoaDon = hoaDonLienQuan.reduce((s, h) => s + h.tong_tien, 0);
      const daThu = hoaDonLienQuan.reduce((s, h) => s + (h.so_tien_da_thu ?? 0), 0);
      return {
        donHang: d,
        khTen: khTen(d.khach_hang_id),
        giaBan,
        chiHo,
        soHoaDon: hoaDonLienQuan.map((h) => h.so_hoa_don || "(chưa có số)").join(", "),
        soLuongHoaDon: hoaDonLienQuan.length,
        tongHoaDon,
        daThu,
        // Neu 1 hoa don gom nhieu don hang thi "da thu" cua rieng lo nay khong tach
        // rach roi duoc (tien thu ve tinh chung cho ca hoa don) — chi chinh xac khi
        // moi don hang 1 hoa don rieng.
        gomNhieuDon: hoaDonLienQuan.some((h) => hoaDonDonHangList.filter((l) => l.hoa_don_id === h.id).length > 1),
      };
    });
  }, [donHangTrongKy, chiPhiList, phuThuList, hoaDonDonHangList, hoaDonList, isKeToanOrGiamDoc]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- 3) Doanh so theo Sale ---
  const doanhSoTheoSale = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of loiNhuanTheoLo.length > 0 ? loiNhuanTheoLo : []) {
      const saleId = row.donHang.sale_phu_trach_id ?? "chua-gan";
      map.set(saleId, (map.get(saleId) ?? 0) + row.sell);
    }
    // Neu khong phai Ke toan/Giam doc (khong co loiNhuanTheoLo), tinh rieng doanh so tu sell da co
    if (loiNhuanTheoLo.length === 0) {
      for (const d of donHangTrongKy) {
        const saleId = d.sale_phu_trach_id ?? "chua-gan";
        const sell =
          chiPhiList.filter((c) => c.don_hang_id === d.id).reduce((s, c) => s + (c.gia_ban_sell ?? 0), 0) +
          phuThuList.filter((p) => p.don_hang_id === d.id).reduce((s, p) => s + (p.thanh_tien ?? 0), 0);
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
  }, [loiNhuanTheoLo, donHangTrongKy, chiPhiList, phuThuList, isSale, currentUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- 4) Bao cao chi phi theo loai ---
  const chiPhiTrongKy = chiPhiList.filter((c) => c.ngay_phat_sinh >= tuNgay && c.ngay_phat_sinh <= denNgay);
  const chiPhiTheoLoai = useMemo(() => {
    const map = new Map<string, { ten: string; buy: number; sell: number }>();
    for (const c of chiPhiTrongKy) {
      const key = c.loai_chi_phi_id ?? "khac";
      const ten = loaiChiPhiList.find((l) => l.id === c.loai_chi_phi_id)?.ten ?? "Khác";
      if (!map.has(key)) map.set(key, { ten, buy: 0, sell: 0 });
      const m = map.get(key)!;
      m.buy += c.gia_von_buy ?? 0;
      m.sell += c.gia_ban_sell ?? 0;
    }
    return Array.from(map.values());
  }, [chiPhiTrongKy, loaiChiPhiList]);

  // --- 5) Cong no phai thu (theo khach hang, tu hoa don) ---
  const hoaDonTrongKy = hoaDonList.filter((h) => h.ngay_xuat >= tuNgay && h.ngay_xuat <= denNgay);
  const congNoPhaiThu = useMemo(() => {
    const map = new Map<string, { ten: string; tongHoaDon: number; daThu: number }>();
    for (const h of hoaDonTrongKy) {
      const key = h.khach_hang_id;
      if (!map.has(key)) map.set(key, { ten: khTen(key), tongHoaDon: 0, daThu: 0 });
      const m = map.get(key)!;
      m.tongHoaDon += h.tong_tien;
      m.daThu += h.so_tien_da_thu ?? 0;
    }
    return Array.from(map.values()).map((m) => ({ ...m, conPhaiThu: m.tongHoaDon - m.daThu }));
  }, [hoaDonTrongKy]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- 6) Cong no phai tra (NCC tu chi phi noi bo, + doi tac tu thue ngoai) ---
  const thueNgoaiTrongKy = thueNgoaiList.filter((t) => t.ngay_thue >= tuNgay && t.ngay_thue <= denNgay);
  const congNoPhaiTra = useMemo(() => {
    const map = new Map<string, { ten: string; tongNo: number; daTra: number }>();
    for (const c of chiPhiTrongKy) {
      const key = c.nha_cung_cap_id ?? c.doi_tac_thue_ngoai_id;
      if (!key) continue;
      if (!map.has(key)) map.set(key, { ten: nccTen(key), tongNo: 0, daTra: 0 });
      const m = map.get(key)!;
      m.tongNo += c.gia_von_buy ?? 0;
      m.daTra += c.so_tien_da_thanh_toan ?? 0;
    }
    for (const t of thueNgoaiTrongKy) {
      const key = t.doi_tac_thue_ngoai_id;
      if (!key) continue;
      if (!map.has(key)) map.set(key, { ten: nccTen(key), tongNo: 0, daTra: 0 });
      const m = map.get(key)!;
      m.tongNo += t.gia_von_buy ?? 0;
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
      m.buy += t.gia_von_buy ?? 0;
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
        { header: "Doanh số (sell)", key: "sell", width: 16 },
      ],
      rows: doanhSoTheoSale.map((r) => [r.ten, r.sell]),
    });
    if (isKeToanOrGiamDoc) {
      themSheetKeO(wb, {
        sheetName: "Lợi nhuận theo lô",
        columns: [
          { header: "Số đơn", key: "soDon", width: 14 },
          { header: "Sell", key: "sell", width: 14 },
          { header: "Buy", key: "buy", width: 14 },
          { header: "Buy thuê ngoài", key: "thueNgoaiBuy", width: 14 },
          { header: "Định phí phân bổ", key: "dinhPhi", width: 14 },
          { header: "LN trước hoa hồng", key: "lnTruocHoaHong", width: 16 },
          { header: "Hoa hồng Sale", key: "hoaHongSale", width: 14 },
          { header: "LN công ty", key: "lnCongTy", width: 14 },
        ],
        rows: loiNhuanTheoLo.map((r) => [
          r.donHang.so_don_hang,
          r.sell,
          r.buy,
          r.thueNgoaiBuy,
          r.dinhPhi,
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
          { header: "Giá bán", key: "giaBan", width: 14, numFmt: "#,##0" },
          { header: "Chi hộ", key: "chiHo", width: 14, numFmt: "#,##0" },
          { header: "Số hóa đơn", key: "soHd", width: 18 },
          { header: "Tổng hóa đơn", key: "tongHd", width: 14, numFmt: "#,##0" },
          { header: "Đã thu", key: "daThu", width: 14, numFmt: "#,##0" },
          { header: "Còn phải thu", key: "conPhaiThu", width: 14, numFmt: "#,##0" },
        ],
        rows: congNoTheoLo.map((r) => [
          r.donHang.so_don_hang,
          r.khTen,
          r.giaBan,
          r.chiHo,
          r.soLuongHoaDon > 0 ? r.soHoaDon : "Chưa xuất HĐ",
          r.tongHoaDon,
          r.daThu,
          r.soLuongHoaDon > 0 ? r.tongHoaDon - r.daThu : r.giaBan + r.chiHo,
        ]),
      });
      themSheetKeO(wb, {
        sheetName: "Chi phí theo loại",
        columns: [
          { header: "Loại chi phí", key: "loai", width: 20 },
          { header: "Buy", key: "buy", width: 14 },
          { header: "Sell", key: "sell", width: 14 },
        ],
        rows: chiPhiTheoLoai.map((r) => [r.ten, r.buy, r.sell]),
      });
      themSheetKeO(wb, {
        sheetName: "Công nợ phải thu",
        columns: [
          { header: "Khách hàng", key: "kh", width: 22 },
          { header: "Tổng hóa đơn", key: "tongHoaDon", width: 16 },
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
          { header: "Buy", key: "buy", width: 14 },
          { header: "Sell", key: "sell", width: 14 },
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
      </div>

      <Section title="Đơn hàng theo trạng thái">
        <SimpleTable
          cols={["Trạng thái", "Số lượng"]}
          rows={theoTrangThai.map((r) => [r.trangThai, r.soLuong.toString()])}
        />
      </Section>

      <Section title="Doanh số theo Sale (Sell)">
        <SimpleTable cols={["Sale", "Doanh số"]} rows={doanhSoTheoSale.map((r) => [r.ten, fmt(r.sell)])} />
      </Section>

      {isKeToanOrGiamDoc && (
        <>
          <Section title="Lợi nhuận theo lô hàng">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    {["Số đơn", "Sell", "Buy", "Buy thuê ngoài", "Định phí", "LN trước hoa hồng", "Hoa hồng Sale", "LN công ty"].map((h) => (
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
                      <td className="px-3 py-2">{fmt(r.dinhPhi)}</td>
                      <td className="px-3 py-2">{fmt(r.lnTruocHoaHong)}</td>
                      <td className="px-3 py-2">{fmt(r.hoaHongSale)}</td>
                      <td className="px-3 py-2 font-medium">{fmt(r.lnCongTy)}</td>
                    </tr>
                  ))}
                  {loiNhuanTheoLo.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-3 py-6 text-center text-slate-400">
                        Không có đơn hàng trong khoảng thời gian này.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="Công nợ theo lô hàng (giá bán + chi hộ + hóa đơn)">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    {["Số đơn", "Khách hàng", "Giá bán", "Chi hộ", "Hóa đơn", "Tổng HĐ", "Đã thu", "Còn phải thu"].map((h) => (
                      <th key={h} className="px-3 py-2 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {congNoTheoLo.map((r) => {
                    const conPhaiThu = r.soLuongHoaDon > 0 ? r.tongHoaDon - r.daThu : r.giaBan + r.chiHo;
                    return (
                      <tr key={r.donHang.id} className="border-t border-slate-100">
                        <td className="px-3 py-2">
                          <Link href={`/don-hang/${r.donHang.id}`} className="text-blue-600 hover:underline">
                            {r.donHang.so_don_hang}
                          </Link>
                        </td>
                        <td className="px-3 py-2">{r.khTen}</td>
                        <td className="px-3 py-2">{fmt(r.giaBan)}</td>
                        <td className="px-3 py-2">{fmt(r.chiHo)}</td>
                        <td className="px-3 py-2">
                          {r.soLuongHoaDon > 0 ? (
                            <>
                              {r.soHoaDon}
                              {r.gomNhieuDon && <span className="ml-1 text-amber-600" title="Hóa đơn này gồm nhiều đơn hàng, số đã thu không tách riêng được cho từng đơn">*</span>}
                            </>
                          ) : (
                            <span className="text-slate-400">Chưa xuất HĐ</span>
                          )}
                        </td>
                        <td className="px-3 py-2">{fmt(r.tongHoaDon)}</td>
                        <td className="px-3 py-2">{fmt(r.daThu)}</td>
                        <td className="px-3 py-2 font-medium">{fmt(conPhaiThu)}</td>
                      </tr>
                    );
                  })}
                  {congNoTheoLo.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-3 py-6 text-center text-slate-400">
                        Không có đơn hàng trong khoảng thời gian này.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              * Hóa đơn gộp nhiều đơn hàng thì &quot;Đã thu&quot;/&quot;Còn phải thu&quot; hiển thị theo cả hóa đơn, không tách được cho riêng từng đơn.
            </p>
          </Section>

          <Section title="Báo cáo chi phí theo loại">
            <SimpleTable cols={["Loại chi phí", "Buy", "Sell"]} rows={chiPhiTheoLoai.map((r) => [r.ten, fmt(r.buy), fmt(r.sell)])} />
          </Section>

          <Section title="Công nợ phải thu (theo khách hàng)">
            <SimpleTable
              cols={["Khách hàng", "Tổng hóa đơn", "Đã thu", "Còn phải thu"]}
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
              cols={["Đối tác", "Buy", "Sell", "Chênh lệch"]}
              rows={loiNhuanTheoDoiTac.map((r) => [r.ten, fmt(r.buy), fmt(r.sell), fmt(r.chenhLech)])}
            />
          </Section>
        </>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
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
