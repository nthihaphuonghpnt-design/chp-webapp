"use client";

import { useMemo, useState } from "react";
import { xuatExcelKeO, CONG_TY_HEADER_LINES, taiLogoCongTy, type ExcelColumn } from "@/lib/excel";

interface PhongBan {
  ten: string;
}
interface NhanVien {
  id: string;
  ho_ten: string;
  luong_co_dinh: number | null;
  muc_dong_bhxh: number | null;
  phong_ban: PhongBan | PhongBan[] | null;
}
interface ChiPhiGiaoNhan {
  nhan_vien_id: string | null;
  thanh_tien: number | null;
  created_at: string;
}
interface DonHang {
  id: string;
  ngay_len_don: string;
  sale_phu_trach_id: string | null;
}
interface ChiPhi {
  don_hang_id: string;
  gia_von_buy: number | null;
  gia_ban_sell: number | null;
  noi_bo: boolean;
  trang_thai: string;
}
interface PhuThu {
  don_hang_id: string;
  thanh_tien: number | null;
}
interface ThueNgoai {
  don_hang_id: string;
  gia_von_buy: number | null;
  gia_ban_sell: number | null;
}
interface DinhPhi {
  thang_nam: string;
  so_tien: number | null;
}
interface LuongDaTra {
  id: string;
  thang_luong: string;
  so_tien: number;
  phuong_thuc: "Tiền mặt" | "Tài khoản công ty";
  ngay_tra: string;
}

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? v[0] ?? null : v;
}
function fmt(n: number) {
  return Math.round(n).toLocaleString("en-US");
}

function thangTruoc(thang: string) {
  const [y, m] = thang.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 2, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthRange() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

const GIAM_TRU_BAN_THAN = 11_000_000;
const TY_LE_BHXH_NV = 0.105;
const HOA_HONG_SALE = 0.4;

const BAC_THUE = [
  { den: 5_000_000, thue: 0.05 },
  { den: 10_000_000, thue: 0.1 },
  { den: 18_000_000, thue: 0.15 },
  { den: 32_000_000, thue: 0.2 },
  { den: 52_000_000, thue: 0.25 },
  { den: 80_000_000, thue: 0.3 },
  { den: Infinity, thue: 0.35 },
];

function tinhThueTNCN(thuNhapChiuThue: number) {
  if (thuNhapChiuThue <= 0) return 0;
  let thue = 0;
  let truoc = 0;
  for (const bac of BAC_THUE) {
    if (thuNhapChiuThue > truoc) {
      const phan = Math.min(thuNhapChiuThue, bac.den) - truoc;
      thue += phan * bac.thue;
      truoc = bac.den;
    } else break;
  }
  return thue;
}

export default function LuongCuaToiView({
  nv,
  chiPhiGiaoNhanList,
  donHangCuaToi,
  chiPhiList,
  phuThuList,
  thueNgoaiList,
  dinhPhiList,
  soLoTheoThangRaw,
  luongDaTraList,
}: {
  nv: NhanVien | null;
  chiPhiGiaoNhanList: ChiPhiGiaoNhan[];
  donHangCuaToi: DonHang[];
  chiPhiList: ChiPhi[];
  phuThuList: PhuThu[];
  thueNgoaiList: ThueNgoai[];
  dinhPhiList: DinhPhi[];
  soLoTheoThangRaw: { ngay_len_don: string }[];
  luongDaTraList: LuongDaTra[];
}) {
  const [thangLuong, setThangLuong] = useState(monthRange());
  const [dangXuat, setDangXuat] = useState(false);
  const thangHoatDong = thangTruoc(thangLuong);

  const pb = one(nv?.phong_ban ?? null)?.ten ?? "";

  const dinhPhiTheoThang = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of dinhPhiList) map.set(d.thang_nam, (map.get(d.thang_nam) ?? 0) + (d.so_tien ?? 0));
    return map;
  }, [dinhPhiList]);
  const soLoTheoThang = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of soLoTheoThangRaw) {
      const key = d.ngay_len_don.slice(0, 7);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [soLoTheoThangRaw]);

  function loiNhuanTruocHoaHongCuaDon(donHangId: string, thangKey: string) {
    const cp = chiPhiList.filter((c) => c.don_hang_id === donHangId && c.trang_thai !== "Từ chối");
    const buy = cp.filter((c) => c.noi_bo).reduce((s, c) => s + (c.gia_von_buy ?? 0), 0);
    const sell =
      cp.reduce((s, c) => s + (c.gia_ban_sell ?? 0), 0) +
      phuThuList.filter((p) => p.don_hang_id === donHangId).reduce((s, p) => s + (p.thanh_tien ?? 0), 0) +
      thueNgoaiList.filter((t) => t.don_hang_id === donHangId).reduce((s, t) => s + (t.gia_ban_sell ?? 0), 0);
    const thueNgoaiBuy = thueNgoaiList.filter((t) => t.don_hang_id === donHangId).reduce((s, t) => s + (t.gia_von_buy ?? 0), 0);
    const tongDinhPhi = dinhPhiTheoThang.get(thangKey) ?? 0;
    const soLo = soLoTheoThang.get(thangKey) ?? 0;
    const dinhPhi = soLo > 0 ? tongDinhPhi / soLo : 0;
    return sell - buy - thueNgoaiBuy - dinhPhi;
  }

  const luong = useMemo(() => {
    if (!nv) return null;
    const luongCoDinh = nv.luong_co_dinh ?? 0;
    let luongTheoLo = 0;
    let chiTietTheoLo: { soDon: string; soTien: number }[] = [];
    if (pb === "Sale") {
      const donThangTruoc = donHangCuaToi.filter((d) => d.ngay_len_don.slice(0, 7) === thangHoatDong);
      chiTietTheoLo = donThangTruoc.map((d) => ({ soDon: d.id, soTien: loiNhuanTruocHoaHongCuaDon(d.id, thangHoatDong) * HOA_HONG_SALE }));
      luongTheoLo = chiTietTheoLo.reduce((s, r) => s + r.soTien, 0);
    } else {
      luongTheoLo = chiPhiGiaoNhanList
        .filter((c) => c.created_at.slice(0, 7) === thangHoatDong)
        .reduce((s, c) => s + (c.thanh_tien ?? 0), 0);
    }
    const tongThuNhap = luongCoDinh + luongTheoLo;
    const mucDongBhxh = nv.muc_dong_bhxh ?? luongCoDinh;
    const bhxhNv = mucDongBhxh * TY_LE_BHXH_NV;
    const thuNhapChiuThue = Math.max(0, tongThuNhap - bhxhNv - GIAM_TRU_BAN_THAN);
    const thueTncn = tinhThueTNCN(thuNhapChiuThue);
    const thucLanh = tongThuNhap - bhxhNv - thueTncn;
    return { luongCoDinh, luongTheoLo, tongThuNhap, mucDongBhxh, bhxhNv, thueTncn, thucLanh };
  }, [nv, pb, donHangCuaToi, chiPhiGiaoNhanList, thangHoatDong]); // eslint-disable-line react-hooks/exhaustive-deps

  const daTra = luongDaTraList.find((d) => d.thang_luong === thangLuong) ?? null;

  async function handleXuatPhieuLuong() {
    if (!nv || !luong) return;
    setDangXuat(true);
    const columns: ExcelColumn[] = [
      { header: "Khoản mục", key: "muc", width: 28 },
      { header: "Số tiền", key: "tien", width: 16, numFmt: "#,##0" },
    ];
    const rows: (string | number)[][] = [
      ["Lương cố định", luong.luongCoDinh],
      [pb === "Sale" ? "Hoa hồng theo lô (tháng trước)" : "Lương theo lô/công việc", luong.luongTheoLo],
      ["Tổng thu nhập", luong.tongThuNhap],
      ["Mức đóng BHXH", luong.mucDongBhxh],
      ["BHXH (nhân viên đóng, 10.5%)", -Math.round(luong.bhxhNv)],
      ["Thuế TNCN", -Math.round(luong.thueTncn)],
      ["THỰC LÃNH", luong.thucLanh],
    ];
    const logo = await taiLogoCongTy();
    await xuatExcelKeO(`phieu-luong-${nv.ho_ten.replace(/[^\p{L}\p{N}]+/gu, "-")}-${thangLuong}.xlsx`, {
      sheetName: "Phiếu lương",
      logo: logo ?? undefined,
      headerLines: [
        ...CONG_TY_HEADER_LINES,
        "",
        { text: "PHIẾU LƯƠNG", bold: true, size: 14 },
        `Họ tên: ${nv.ho_ten}    Phòng ban: ${pb}`,
        `Tháng lương: ${thangLuong}`,
        "Ngày công trong tháng: ____________ (kế toán/nhân viên tự điền, hệ thống chưa chấm công điện tử)",
        "",
      ],
      columns,
      rows,
    });
    setDangXuat(false);
  }

  if (!nv) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10 text-center">
        <p className="text-slate-600">Không tìm thấy hồ sơ nhân viên gắn với tài khoản này.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-1 text-xl font-semibold text-slate-900">Lương của tôi</h1>
      <p className="mb-4 text-sm text-slate-500">{nv.ho_ten} · {pb}</p>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Tháng lương</label>
          <input
            type="month"
            value={thangLuong}
            onChange={(e) => setThangLuong(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <button
          onClick={handleXuatPhieuLuong}
          disabled={dangXuat}
          className="mt-6 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          {dangXuat ? "Đang xuất..." : "Xuất phiếu lương (Excel)"}
        </button>
      </div>

      {luong && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <dl className="divide-y divide-slate-100 text-sm">
            <Row label="Lương cố định" value={luong.luongCoDinh} />
            <Row label={pb === "Sale" ? "Hoa hồng theo lô (tháng trước)" : "Lương theo lô/công việc"} value={luong.luongTheoLo} />
            <Row label="Tổng thu nhập" value={luong.tongThuNhap} bold />
            <Row label="Mức đóng BHXH" value={luong.mucDongBhxh} />
            <Row label="BHXH (bạn đóng, 10.5%)" value={-luong.bhxhNv} />
            <Row label="Thuế TNCN" value={-luong.thueTncn} />
            <Row label="Thực lãnh" value={luong.thucLanh} bold big />
          </dl>
          <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">
            {daTra ? (
              <p className="text-green-700">
                Đã trả: <strong>{fmt(daTra.so_tien)}</strong> ngày {daTra.ngay_tra} ({daTra.phuong_thuc}).
              </p>
            ) : (
              <p className="text-slate-500">Kế toán chưa xác nhận đã trả lương tháng này.</p>
            )}
          </div>
        </div>
      )}

      <p className="mt-4 text-xs text-slate-400">
        Lương theo lô của tháng {thangLuong} được tính từ dữ liệu công việc tháng {thangHoatDong} (trễ 1 tháng theo quy định
        công ty). Nếu số liệu chưa khớp thực tế, liên hệ Kế toán để đối chiếu.
      </p>
    </div>
  );
}

function Row({ label, value, bold, big }: { label: string; value: number; bold?: boolean; big?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2">
      <dt className={`text-slate-600 ${bold ? "font-medium text-slate-900" : ""}`}>{label}</dt>
      <dd className={`${big ? "text-base" : ""} ${bold ? "font-semibold text-slate-900" : "text-slate-700"}`}>{fmt(value)}</dd>
    </div>
  );
}
