"use client";

import { useMemo, useState } from "react";
import { xuatExcelKeO, type ExcelColumn } from "@/lib/excel";
import type { SoQuy } from "@/types/database";

function fmt(n: number) {
  return Math.round(n).toLocaleString("en-US");
}

function monthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  return { start, end };
}

const NGUON_LABEL: Record<string, string> = {
  phat_sinh_chi_phi: "Thanh toán chi phí",
  don_thue_ngoai: "Thanh toán thuê ngoài",
  hoa_don_xuat: "Thu tiền hóa đơn",
  tam_ung_giai_chi: "Tạm ứng/Giải chi",
};

export default function SoQuyView({ initialRows }: { initialRows: SoQuy[] }) {
  const defaultRange = monthRange();
  const [loaiSo, setLoaiSo] = useState<"Tiền mặt" | "Tài khoản công ty">("Tiền mặt");
  const [tuNgay, setTuNgay] = useState(defaultRange.start);
  const [denNgay, setDenNgay] = useState(defaultRange.end);

  const rowsCuaSo = initialRows.filter((r) => r.loai_so === loaiSo);

  const tonDauKy = useMemo(() => {
    return rowsCuaSo
      .filter((r) => r.ngay < tuNgay)
      .reduce((s, r) => s + (r.loai_giao_dich === "Thu" ? r.so_tien : -r.so_tien), 0);
  }, [rowsCuaSo, tuNgay]);

  const trongKy = rowsCuaSo.filter((r) => r.ngay >= tuNgay && r.ngay <= denNgay).sort((a, b) => a.ngay.localeCompare(b.ngay));

  const tongThu = trongKy.filter((r) => r.loai_giao_dich === "Thu").reduce((s, r) => s + r.so_tien, 0);
  const tongChi = trongKy.filter((r) => r.loai_giao_dich === "Chi").reduce((s, r) => s + r.so_tien, 0);
  const tonCuoiKy = tonDauKy + tongThu - tongChi;

  const rowsWithRunning = trongKy.reduce<(SoQuy & { tonSauGiaoDich: number })[]>((acc, r) => {
    const tonTruoc = acc.length > 0 ? acc[acc.length - 1].tonSauGiaoDich : tonDauKy;
    const tonSauGiaoDich = tonTruoc + (r.loai_giao_dich === "Thu" ? r.so_tien : -r.so_tien);
    acc.push({ ...r, tonSauGiaoDich });
    return acc;
  }, []);

  async function handleExportExcel() {
    const columns: ExcelColumn[] = [
      { header: "Ngày", key: "ngay", width: 12 },
      { header: "Loại", key: "loai", width: 18 },
      { header: "Nội dung", key: "noiDung", width: 30 },
      { header: "Thu", key: "thu", width: 14 },
      { header: "Chi", key: "chi", width: 14 },
      { header: "Tồn", key: "ton", width: 14 },
    ];
    const rows = [
      ["", "", `TỒN ĐẦU KỲ (${tuNgay})`, "", "", tonDauKy],
      ...rowsWithRunning.map((r) => [
        r.ngay,
        NGUON_LABEL[r.nguon_bang] ?? r.nguon_bang,
        r.noi_dung ?? "",
        r.loai_giao_dich === "Thu" ? r.so_tien : "",
        r.loai_giao_dich === "Chi" ? r.so_tien : "",
        r.tonSauGiaoDich,
      ]),
    ];
    const totalRow = ["", "", `TỒN CUỐI KỲ (${denNgay})`, tongThu, tongChi, tonCuoiKy];
    await xuatExcelKeO(`so-quy-${loaiSo}-${tuNgay}_${denNgay}.xlsx`, {
      sheetName: "Sổ quỹ",
      headerLines: [`SỔ QUỸ — ${loaiSo}`, `Từ ${tuNgay} đến ${denNgay}`],
      columns,
      rows,
      totalRow,
    });
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Sổ quỹ</h1>
        <button onClick={handleExportExcel} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm">
          Xuất Excel
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-2">
        <div className="flex rounded-lg border border-slate-300 bg-white p-1">
          {(["Tiền mặt", "Tài khoản công ty"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setLoaiSo(v)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${loaiSo === v ? "bg-blue-600 text-white" : "text-slate-600"}`}
            >
              {v}
            </button>
          ))}
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">Từ ngày</label>
          <input type="date" value={tuNgay} onChange={(e) => setTuNgay(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">Đến ngày</label>
          <input type="date" value={denNgay} onChange={(e) => setDenNgay(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs text-slate-500">Tồn đầu kỳ</p>
          <p className="text-lg font-semibold text-slate-900">{fmt(tonDauKy)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs text-slate-500">Thu trong kỳ</p>
          <p className="text-lg font-semibold text-green-600">{fmt(tongThu)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs text-slate-500">Chi trong kỳ</p>
          <p className="text-lg font-semibold text-red-600">{fmt(tongChi)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs text-slate-500">Tồn cuối kỳ</p>
          <p className="text-lg font-semibold text-slate-900">{fmt(tonCuoiKy)}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              {["Ngày", "Nguồn", "Nội dung", "Thu", "Chi", "Tồn"].map((h) => (
                <th key={h} className="px-3 py-2 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowsWithRunning.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-3 py-2">{r.ngay}</td>
                <td className="px-3 py-2">{NGUON_LABEL[r.nguon_bang] ?? r.nguon_bang}</td>
                <td className="px-3 py-2">{r.noi_dung ?? "—"}</td>
                <td className="px-3 py-2 text-green-600">{r.loai_giao_dich === "Thu" ? fmt(r.so_tien) : ""}</td>
                <td className="px-3 py-2 text-red-600">{r.loai_giao_dich === "Chi" ? fmt(r.so_tien) : ""}</td>
                <td className="px-3 py-2 font-medium">{fmt(r.tonSauGiaoDich)}</td>
              </tr>
            ))}
            {rowsWithRunning.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-slate-400">
                  Không có giao dịch trong khoảng thời gian này.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-slate-400">
        Sổ quỹ tự động cập nhật từ: Tạm ứng/Giải chi đã duyệt, thanh toán Chi phí phát sinh, thanh
        toán Thuê dịch vụ ngoài, thu tiền Hóa đơn — chọn đúng &quot;Phương thức&quot; (Tiền mặt/Tài
        khoản công ty) ở từng nơi để dòng tiền tự chạy vào đúng sổ.
      </p>
    </div>
  );
}
