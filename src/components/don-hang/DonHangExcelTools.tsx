"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { xuatExcelKeO, CONG_TY_HEADER_LINES, taiLogoCongTy, type ExcelColumn } from "@/lib/excel";
import { createClient } from "@/lib/supabase/client";

interface Option {
  id: string;
  ten: string;
}

interface MasterData {
  khachHang: { id: string; ten_day_du: string; ten_viet_tat: string | null }[];
  loaiContainer: Option[];
  hangHoa: Option[];
  diaDiem: Option[];
}

const LOAI_DON_HANG = ["Xuất", "Nhập", "Khác"];
const LOAI_KICH_CO = ["20'", "40'", "45'", "Hàng lẻ"];
const DVT = ["Cont", "Chuyến", "Kiện", "Khối", "Tấn", "Kg", "2x20"];

// Cac cot co the nhap/xuat, theo dung thu tu B1
const IMPORT_COLUMNS = [
  { header: "Khách hàng *", key: "khach_hang_id", kind: "khachHang", required: true },
  { header: "Loại đơn hàng", key: "loai_don_hang", kind: "fixed", options: LOAI_DON_HANG },
  { header: "Loại kích cỡ", key: "loai_kich_co", kind: "fixed", options: LOAI_KICH_CO },
  { header: "Đơn vị tính", key: "dvt", kind: "fixed", options: DVT },
  { header: "Số lượng", key: "so_luong", kind: "number" },
  { header: "Số vận đơn/booking", key: "so_bl_bk", kind: "text" },
  { header: "Số lô", key: "so_lo", kind: "text" },
  { header: "Hàng hóa", key: "hang_hoa_id", kind: "hangHoa" },
  { header: "Khối lượng", key: "khoi_luong", kind: "number" },
  { header: "Kích thước", key: "kich_thuoc", kind: "text" },
  { header: "Nơi lấy cont/hàng", key: "noi_lay_cont_hang_id", kind: "diaDiem" },
  { header: "Nơi đóng/giao", key: "noi_dong_giao_id", kind: "diaDiem" },
  { header: "Nơi hạ/trả rỗng", key: "noi_ha_tra_rong_id", kind: "diaDiem" },
  { header: "Ngày lên đơn * (yyyy-mm-dd)", key: "ngay_len_don", kind: "date", required: true },
  { header: "Ngày vận chuyển (yyyy-mm-dd)", key: "ngay_van_chuyen", kind: "date" },
  { header: "Hạn lệnh ngày (yyyy-mm-dd)", key: "han_lenh_ngay", kind: "date" },
  { header: "Hạn lệnh giờ (hh:mm)", key: "han_lenh_gio", kind: "text" },
  { header: "Ghi chú vận chuyển", key: "ghi_chu_van_chuyen", kind: "text" },
  { header: "Giá bán", key: "gia", kind: "number" },
] as const;

function excelDateToIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value ?? "").trim();
}

function findByName(list: { id: string; ten: string }[], name: string) {
  return list.find((o) => o.ten.trim().toLowerCase() === name.trim().toLowerCase());
}

export default function DonHangExcelTools({
  rows,
  masterData,
  canImport,
}: {
  rows: Record<string, unknown>[];
  masterData: MasterData;
  canImport: boolean;
}) {
  const supabase = createClient();
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState<{ success: number; errors: string[] } | null>(null);

  function handleDownloadTemplate() {
    const headers = IMPORT_COLUMNS.map((c) => c.header);
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mẫu nhập đơn hàng");

    const guideRows: (string | undefined)[][] = [["Cột", "Giá trị hợp lệ"]];
    guideRows.push(["Khách hàng", masterData.khachHang.map((k) => k.ten_viet_tat || k.ten_day_du).join(", ")]);
    guideRows.push(["Loại đơn hàng", LOAI_DON_HANG.join(", ")]);
    guideRows.push(["Loại kích cỡ", LOAI_KICH_CO.join(", ")]);
    guideRows.push(["Đơn vị tính", DVT.join(", ")]);
    guideRows.push(["Hàng hóa", masterData.hangHoa.map((o) => o.ten).join(", ")]);
    guideRows.push(["Nơi lấy/đóng/hạ", masterData.diaDiem.map((o) => o.ten).join(", ")]);
    guideRows.push(["Ngày tháng", "Gõ theo định dạng yyyy-mm-dd, ví dụ 2026-08-25"]);
    guideRows.push(["Container/số ký", "Nhập sau ở trang chi tiết đơn hàng (một lô có thể có nhiều container)."]);
    const wsGuide = XLSX.utils.aoa_to_sheet(guideRows);
    XLSX.utils.book_append_sheet(wb, wsGuide, "Hướng dẫn");

    XLSX.writeFile(wb, "mau-nhap-don-hang.xlsx");
  }

  async function handleExportExcel() {
    const columns: ExcelColumn[] = [
      { header: "Số đơn hàng", key: "soDonHang", width: 14 },
      { header: "Số container", key: "soCont", width: 16 },
      ...IMPORT_COLUMNS.map((col) => ({
        header: col.header.replace(/\s*\*.*$/, "").replace(/\s*\(.*\)$/, ""),
        key: col.key,
        width: 16,
      })),
      { header: "Trạng thái", key: "trangThai", width: 14 },
      { header: "OPS xác nhận", key: "ops", width: 12 },
      { header: "CS xác nhận", key: "cs", width: 12 },
    ];
    const v = (x: unknown): string | number => (typeof x === "number" ? x : String(x ?? ""));
    const exportRows = rows.map((row) => [
      v(row.so_don_hang),
      v(row.so_cont_label ?? ""),
      ...IMPORT_COLUMNS.map((col) => v(row[col.key.replace("_id", "_label")] ?? row[col.key] ?? "")),
      v(row.trang_thai),
      row.ops_xac_nhan ? "Có" : "Không",
      row.cs_xac_nhan ? "Có" : "Không",
    ]);
    const logo = await taiLogoCongTy();
    await xuatExcelKeO(`don-hang-${new Date().toISOString().slice(0, 10)}.xlsx`, {
      sheetName: "Đơn hàng",
      logo: logo ?? undefined,
      headerLines: [...CONG_TY_HEADER_LINES, "", { text: "DANH SÁCH ĐƠN HÀNG", bold: true, size: 12 }],
      columns,
      rows: exportRows,
    });
  }

  async function handleImportFile(file: File) {
    setImporting(true);
    setSummary(null);

    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array", cellDates: true });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: nv } = await supabase.from("nhan_vien").select("id").eq("auth_user_id", user?.id).single();

    const records: Record<string, unknown>[] = [];
    const errors: string[] = [];

    raw.forEach((rawRow, idx) => {
      const rowNum = idx + 2;
      const normalized: Record<string, unknown> = {};
      for (const key of Object.keys(rawRow)) {
        normalized[key.trim().toLowerCase()] = rawRow[key];
      }

      const record: Record<string, unknown> = { nguoi_tao_id: nv?.id };
      let hasError = false;

      for (const col of IMPORT_COLUMNS) {
        const normHeader = col.header.trim().toLowerCase();
        const rawValue = normalized[normHeader];
        const value = typeof rawValue === "string" ? rawValue.trim() : rawValue;

        if (col.kind === "khachHang") {
          if (!value) {
            if (col.required) { errors.push(`Dòng ${rowNum}: thiếu Khách hàng.`); hasError = true; }
            continue;
          }
          const match = masterData.khachHang.find(
            (k) => (k.ten_viet_tat || k.ten_day_du).trim().toLowerCase() === String(value).trim().toLowerCase()
              || k.ten_day_du.trim().toLowerCase() === String(value).trim().toLowerCase()
          );
          if (!match) { errors.push(`Dòng ${rowNum}: không tìm thấy khách hàng "${value}".`); hasError = true; continue; }
          record[col.key] = match.id;
        } else if (col.kind === "hangHoa" || col.kind === "diaDiem") {
          if (!value) continue;
          const list = col.kind === "hangHoa" ? masterData.hangHoa : masterData.diaDiem;
          const match = findByName(list, String(value));
          if (!match) { errors.push(`Dòng ${rowNum}: không tìm thấy "${value}" ở cột "${col.header}".`); hasError = true; continue; }
          record[col.key] = match.id;
        } else if (col.kind === "fixed") {
          if (!value) continue;
          const opt = col.options?.find((o) => o.toLowerCase() === String(value).toLowerCase());
          if (!opt) { errors.push(`Dòng ${rowNum}: giá trị "${value}" không hợp lệ ở cột "${col.header}".`); hasError = true; continue; }
          record[col.key] = opt;
        } else if (col.kind === "date") {
          const iso = value ? excelDateToIso(value) : "";
          if (!iso) {
            if ("required" in col && col.required) { errors.push(`Dòng ${rowNum}: thiếu "${col.header}".`); hasError = true; }
            continue;
          }
          record[col.key] = iso;
        } else if (col.kind === "number") {
          record[col.key] = value === "" || value === undefined ? null : Number(value);
        } else {
          record[col.key] = value === "" ? null : value;
        }
      }

      if (!hasError) records.push(record);
    });

    if (records.length === 0) {
      setSummary({ success: 0, errors: errors.length ? errors : ["File không có dòng dữ liệu hợp lệ."] });
      setImporting(false);
      return;
    }

    const { data, error: err } = await supabase.from("don_hang").insert(records).select();
    setImporting(false);

    if (err) {
      setSummary({ success: 0, errors: [...errors, `Lỗi khi lưu: ${err.message}`] });
      return;
    }

    setSummary({ success: data?.length ?? 0, errors });
    if (data && data.length > 0) {
      setTimeout(() => window.location.reload(), 1500);
    }
  }

  return (
    <div className="mb-4">
      <div className="flex flex-wrap gap-2">
        <button onClick={handleExportExcel} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700">
          Xuất Excel
        </button>
        {canImport && (
          <>
            <button onClick={handleDownloadTemplate} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700">
              Tải mẫu Excel
            </button>
            <label className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700">
              {importing ? "Đang nhập..." : "Nhập từ Excel"}
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                disabled={importing}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImportFile(file);
                  e.target.value = "";
                }}
              />
            </label>
          </>
        )}
      </div>

      {summary && (
        <div
          className={`mt-3 rounded-lg border p-3 text-sm ${
            summary.errors.length > 0 ? "border-amber-300 bg-amber-50 text-amber-800" : "border-green-300 bg-green-50 text-green-800"
          }`}
        >
          <p className="font-medium">
            Đã nhập thành công {summary.success} đơn hàng
            {summary.errors.length > 0 ? `, ${summary.errors.length} dòng lỗi:` : "."}
          </p>
          {summary.success > 0 && <p className="text-xs">Đang tải lại danh sách...</p>}
          {summary.errors.length > 0 && (
            <ul className="mt-2 list-disc space-y-0.5 pl-5">
              {summary.errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
