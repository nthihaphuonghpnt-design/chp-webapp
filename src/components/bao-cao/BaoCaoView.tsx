"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";

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
  khach_hang_id: string;
  ngay_xuat: string;
  tong_tien: number;
  so_tien_da_thu: number | null;
  trang_thai_thanh_toan: string;
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

  function handleExportAll() {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(theoTrangThai.map((r) => ({ "Trạng thái": r.trangThai, "Số lượng": r.soLuong }))),
      "Đơn hàng theo TT"
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(doanhSoTheoSale.map((r) => ({ Sale: r.ten, "Doanh số (sell)": r.sell }))),
      "Doanh số theo Sale"
    );
    if (isKeToanOrGiamDoc) {
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(
          loiNhuanTheoLo.map((r) => ({
            "Số đơn": r.donHang.so_don_hang,
            Sell: r.sell,
            Buy: r.buy,
            "Buy thuê ngoài": r.thueNgoaiBuy,
            "Định phí phân bổ": r.dinhPhi,
            "LN trước hoa hồng": r.lnTruocHoaHong,
            "Hoa hồng Sale": r.hoaHongSale,
            "LN công ty": r.lnCongTy,
          }))
        ),
        "Lợi nhuận theo lô"
      );
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(chiPhiTheoLoai.map((r) => ({ "Loại chi phí": r.ten, Buy: r.buy, Sell: r.sell }))), "Chi phí theo loại");
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(congNoPhaiThu.map((r) => ({ "Khách hàng": r.ten, "Tổng hóa đơn": r.tongHoaDon, "Đã thu": r.daThu, "Còn phải thu": r.conPhaiThu }))),
        "Công nợ phải thu"
      );
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(congNoPhaiTra.map((r) => ({ "NCC/Đối tác": r.ten, "Tổng nợ": r.tongNo, "Đã trả": r.daTra, "Còn phải trả": r.conPhaiTra }))),
        "Công nợ phải trả"
      );
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(loiNhuanTheoDoiTac.map((r) => ({ "Đối tác": r.ten, Buy: r.buy, Sell: r.sell, "Chênh lệch": r.chenhLech }))),
        "LN theo đối tác thuê ngoài"
      );
    }
    XLSX.writeFile(wb, `bao-cao-${tuNgay}_${denNgay}.xlsx`);
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
