"use client";

import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/client";
import { xuatExcelKeO, CONG_TY_HEADER_LINES, taiLogoCongTy, type ExcelColumn } from "@/lib/excel";
import MoneyInput from "@/components/common/MoneyInput";
import QuickAddNhaCungCap, { type NhaCungCapOption } from "@/components/common/QuickAddNhaCungCap";

export interface HoaDonDauVao {
  id: string;
  mau_so_hoa_don: string | null;
  so_hoa_don: string | null;
  ngay_hoa_don: string;
  ngay_ky_hoa_don: string | null;
  nha_cung_cap_id: string | null;
  khoan_muc: string;
  loai_chi_phi: "Định phí cố định" | "Phát sinh";
  thang_phan_bo: string;
  tong_tien_hang: number;
  tien_thue_gtgt: number;
  tong_tien_thanh_toan: number;
  tinh_trang_thanh_toan: "Chưa thanh toán" | "Một phần" | "Đã đủ";
  so_tien_da_thanh_toan: number | null;
  phuong_thuc_thanh_toan: "Tiền mặt" | "Tài khoản công ty" | null;
  ghi_chu: string | null;
}

type EditValues = {
  mau_so_hoa_don: string;
  so_hoa_don: string;
  ngay_hoa_don: string;
  ngay_ky_hoa_don: string;
  nha_cung_cap_id: string;
  khoan_muc: string;
  loai_chi_phi: string;
  thang_phan_bo: string;
  tong_tien_hang: string;
  tien_thue_gtgt: string;
  tinh_trang_thanh_toan: string;
  so_tien_da_thanh_toan: string;
  phuong_thuc_thanh_toan: string;
  ghi_chu: string;
};

function thangHienTai() {
  return new Date().toISOString().slice(0, 7);
}

function dongTrong(): EditValues {
  return {
    mau_so_hoa_don: "",
    so_hoa_don: "",
    ngay_hoa_don: new Date().toISOString().slice(0, 10),
    ngay_ky_hoa_don: "",
    nha_cung_cap_id: "",
    khoan_muc: "",
    loai_chi_phi: "Phát sinh",
    thang_phan_bo: thangHienTai(),
    tong_tien_hang: "",
    tien_thue_gtgt: "",
    tinh_trang_thanh_toan: "Chưa thanh toán",
    so_tien_da_thanh_toan: "",
    phuong_thuc_thanh_toan: "",
    ghi_chu: "",
  };
}

function toEditValues(r: HoaDonDauVao): EditValues {
  return {
    mau_so_hoa_don: r.mau_so_hoa_don ?? "",
    so_hoa_don: r.so_hoa_don ?? "",
    ngay_hoa_don: r.ngay_hoa_don,
    ngay_ky_hoa_don: r.ngay_ky_hoa_don ?? "",
    nha_cung_cap_id: r.nha_cung_cap_id ?? "",
    khoan_muc: r.khoan_muc,
    loai_chi_phi: r.loai_chi_phi,
    thang_phan_bo: r.thang_phan_bo,
    tong_tien_hang: String(r.tong_tien_hang ?? ""),
    tien_thue_gtgt: String(r.tien_thue_gtgt ?? ""),
    tinh_trang_thanh_toan: r.tinh_trang_thanh_toan,
    so_tien_da_thanh_toan: String(r.so_tien_da_thanh_toan ?? ""),
    phuong_thuc_thanh_toan: r.phuong_thuc_thanh_toan ?? "",
    ghi_chu: r.ghi_chu ?? "",
  };
}

const fmt = (n: number | null | undefined) => (n ?? 0).toLocaleString("en-US");

const IMPORT_COLUMNS = [
  "Mẫu số hóa đơn",
  "Ngày hóa đơn (yyyy-mm-dd)",
  "Ngày ký hóa đơn (yyyy-mm-dd)",
  "Số hóa đơn",
  "Nhà cung cấp",
  "Khoản mục",
  "Loại (Định phí cố định / Phát sinh)",
  "Tháng phân bổ (yyyy-mm)",
  "Tổng tiền hàng",
  "Tiền thuế GTGT",
  "Ghi chú",
];

export default function HoaDonDauVaoView({
  initialRows,
  nhaCungCapList,
  canEdit,
}: {
  initialRows: HoaDonDauVao[];
  nhaCungCapList: NhaCungCapOption[];
  canEdit: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<HoaDonDauVao[]>(initialRows);
  const [ncList, setNcList] = useState<NhaCungCapOption[]>(nhaCungCapList);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<EditValues>(dongTrong());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thangLoc, setThangLoc] = useState(thangHienTai());
  const [loaiLoc, setLoaiLoc] = useState("Tất cả");
  const [query, setQuery] = useState("");
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<{ success: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ncMap = new Map(ncList.map((n) => [n.id, n.ten ?? ""]));

  const filteredRows = rows.filter((r) => {
    if (thangLoc && r.thang_phan_bo !== thangLoc) return false;
    if (loaiLoc !== "Tất cả" && r.loai_chi_phi !== loaiLoc) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      r.khoan_muc.toLowerCase().includes(q) ||
      (r.so_hoa_don ?? "").toLowerCase().includes(q) ||
      (ncMap.get(r.nha_cung_cap_id ?? "") ?? "").toLowerCase().includes(q)
    );
  });

  const tongTheoLoc = filteredRows.reduce((s, r) => s + (r.tong_tien_thanh_toan ?? 0), 0);

  function set(key: keyof EditValues, value: string) {
    setEditValues((prev) => ({ ...prev, [key]: value }));
  }

  function batDauThem() {
    const tam: HoaDonDauVao = {
      id: `new-${Date.now()}`,
      mau_so_hoa_don: null,
      so_hoa_don: null,
      ngay_hoa_don: new Date().toISOString().slice(0, 10),
      ngay_ky_hoa_don: null,
      nha_cung_cap_id: null,
      khoan_muc: "",
      loai_chi_phi: "Phát sinh",
      thang_phan_bo: thangLoc || thangHienTai(),
      tong_tien_hang: 0,
      tien_thue_gtgt: 0,
      tong_tien_thanh_toan: 0,
      tinh_trang_thanh_toan: "Chưa thanh toán",
      so_tien_da_thanh_toan: null,
      phuong_thuc_thanh_toan: null,
      ghi_chu: null,
    };
    setRows((prev) => [tam, ...prev]);
    setEditValues({ ...dongTrong(), thang_phan_bo: thangLoc || thangHienTai() });
    setEditingId(tam.id);
    setError(null);
  }

  function batDauSua(row: HoaDonDauVao) {
    setEditingId(row.id);
    setEditValues(toEditValues(row));
    setError(null);
  }

  function huy(row: HoaDonDauVao) {
    if (row.id.startsWith("new-")) {
      setRows((prev) => prev.filter((r) => r.id !== row.id));
    }
    setEditingId(null);
    setError(null);
  }

  async function luu(row: HoaDonDauVao) {
    if (!editValues.khoan_muc.trim()) {
      setError("Thiếu Khoản mục.");
      return;
    }
    setSaving(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: nv } = await supabase.from("nhan_vien").select("id").eq("auth_user_id", user?.id).single();

    const payload = {
      mau_so_hoa_don: editValues.mau_so_hoa_don || null,
      so_hoa_don: editValues.so_hoa_don || null,
      ngay_hoa_don: editValues.ngay_hoa_don,
      ngay_ky_hoa_don: editValues.ngay_ky_hoa_don || null,
      nha_cung_cap_id: editValues.nha_cung_cap_id || null,
      khoan_muc: editValues.khoan_muc.trim(),
      loai_chi_phi: editValues.loai_chi_phi,
      thang_phan_bo: editValues.thang_phan_bo,
      tong_tien_hang: editValues.tong_tien_hang ? Number(editValues.tong_tien_hang) : 0,
      tien_thue_gtgt: editValues.tien_thue_gtgt ? Number(editValues.tien_thue_gtgt) : 0,
      tinh_trang_thanh_toan: editValues.tinh_trang_thanh_toan,
      so_tien_da_thanh_toan: editValues.so_tien_da_thanh_toan ? Number(editValues.so_tien_da_thanh_toan) : 0,
      phuong_thuc_thanh_toan: editValues.phuong_thuc_thanh_toan || null,
      ghi_chu: editValues.ghi_chu || null,
    };

    if (row.id.startsWith("new-")) {
      const { data, error: err } = await supabase
        .from("hoa_don_dau_vao")
        .insert({ ...payload, nguoi_nhap_id: nv?.id })
        .select()
        .single();
      setSaving(false);
      if (err) {
        setError(err.message);
        return;
      }
      setRows((prev) => prev.map((r) => (r.id === row.id ? (data as HoaDonDauVao) : r)));
    } else {
      const { data, error: err } = await supabase.from("hoa_don_dau_vao").update(payload).eq("id", row.id).select().single();
      setSaving(false);
      if (err) {
        setError(err.message);
        return;
      }
      setRows((prev) => prev.map((r) => (r.id === row.id ? (data as HoaDonDauVao) : r)));
    }
    setEditingId(null);
  }

  async function xoa(row: HoaDonDauVao) {
    if (row.id.startsWith("new-")) {
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      return;
    }
    if (!window.confirm(`Xóa hẳn "${row.khoan_muc}"? Thao tác này không thể hoàn tác.`)) return;
    const { error: err } = await supabase.from("hoa_don_dau_vao").delete().eq("id", row.id);
    if (err) {
      window.alert(`Không thể xóa: ${err.message}`);
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== row.id));
  }

  function handleDownloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([IMPORT_COLUMNS]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mẫu nhập hóa đơn đầu vào");
    XLSX.writeFile(wb, "mau-nhap-hoa-don-dau-vao.xlsx");
  }

  async function handleExportExcel() {
    const columns: ExcelColumn[] = [
      { header: "Mẫu số", key: "mauSo", width: 12 },
      { header: "Ngày hóa đơn", key: "ngayHd", width: 14 },
      { header: "Ngày ký HĐ", key: "ngayKy", width: 14 },
      { header: "Số hóa đơn", key: "soHd", width: 14 },
      { header: "Nhà cung cấp", key: "ncc", width: 26 },
      { header: "Mã số thuế", key: "mst", width: 14 },
      { header: "Khoản mục", key: "khoanMuc", width: 22 },
      { header: "Loại", key: "loai", width: 16 },
      { header: "Tháng phân bổ", key: "thang", width: 12 },
      { header: "Tổng tiền hàng", key: "tienHang", width: 16, numFmt: "#,##0" },
      { header: "Tiền thuế GTGT", key: "thueGtgt", width: 16, numFmt: "#,##0" },
      { header: "Tổng tiền thanh toán", key: "tongTt", width: 18, numFmt: "#,##0" },
      { header: "Tình trạng TT", key: "tinhTrang", width: 14 },
      { header: "Đã trả", key: "daTra", width: 14, numFmt: "#,##0" },
      { header: "Ghi chú", key: "ghiChu", width: 20 },
    ];
    const exportRows = filteredRows.map((r) => [
      r.mau_so_hoa_don ?? "",
      r.ngay_hoa_don,
      r.ngay_ky_hoa_don ?? "",
      r.so_hoa_don ?? "",
      ncMap.get(r.nha_cung_cap_id ?? "") ?? "",
      "",
      r.khoan_muc,
      r.loai_chi_phi,
      r.thang_phan_bo,
      r.tong_tien_hang,
      r.tien_thue_gtgt,
      r.tong_tien_thanh_toan,
      r.tinh_trang_thanh_toan,
      r.so_tien_da_thanh_toan ?? 0,
      r.ghi_chu ?? "",
    ]);
    const logo = await taiLogoCongTy();
    await xuatExcelKeO(`hoa-don-dau-vao-${new Date().toISOString().slice(0, 10)}.xlsx`, {
      sheetName: "Hóa đơn đầu vào",
      logo: logo ?? undefined,
      headerLines: [...CONG_TY_HEADER_LINES, "", { text: "HÓA ĐƠN ĐẦU VÀO", bold: true, size: 12 }],
      columns,
      rows: exportRows,
    });
  }

  async function handleImportFile(file: File) {
    setImporting(true);
    setImportSummary(null);

    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array", cellDates: true });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: nv } = await supabase.from("nhan_vien").select("id").eq("auth_user_id", user?.id).single();

    function excelDate(v: unknown): string {
      if (v instanceof Date) return v.toISOString().slice(0, 10);
      return String(v ?? "").trim();
    }

    const records: Record<string, unknown>[] = [];
    const errors: string[] = [];

    raw.forEach((rawRow, idx) => {
      const rowNum = idx + 2;
      const n: Record<string, unknown> = {};
      for (const key of Object.keys(rawRow)) n[key.trim().toLowerCase()] = rawRow[key];

      const khoanMuc = String(n["khoản mục"] ?? "").trim();
      const thang = String(n["tháng phân bổ (yyyy-mm)"] ?? "").trim();
      if (!khoanMuc || !thang) {
        errors.push(`Dòng ${rowNum}: thiếu Khoản mục hoặc Tháng phân bổ.`);
        return;
      }

      const tenNcc = String(n["nhà cung cấp"] ?? "").trim();
      let nhaCungCapId: string | null = null;
      if (tenNcc) {
        const match = ncList.find((o) => (o.ten ?? "").trim().toLowerCase() === tenNcc.toLowerCase());
        if (!match) {
          errors.push(`Dòng ${rowNum}: không tìm thấy nhà cung cấp "${tenNcc}" (thêm trước ở Danh mục Nhà cung cấp).`);
          return;
        }
        nhaCungCapId = match.id;
      }

      const loai = String(n["loại (định phí cố định / phát sinh)"] ?? "Phát sinh").trim();

      records.push({
        mau_so_hoa_don: String(n["mẫu số hóa đơn"] ?? "").trim() || null,
        ngay_hoa_don: excelDate(n["ngày hóa đơn (yyyy-mm-dd)"]) || new Date().toISOString().slice(0, 10),
        ngay_ky_hoa_don: excelDate(n["ngày ký hóa đơn (yyyy-mm-dd)"]) || null,
        so_hoa_don: String(n["số hóa đơn"] ?? "").trim() || null,
        nha_cung_cap_id: nhaCungCapId,
        khoan_muc: khoanMuc,
        loai_chi_phi: loai === "Định phí cố định" ? "Định phí cố định" : "Phát sinh",
        thang_phan_bo: thang,
        tong_tien_hang: Number(n["tổng tiền hàng"] || 0),
        tien_thue_gtgt: Number(n["tiền thuế gtgt"] || 0),
        ghi_chu: String(n["ghi chú"] ?? "").trim() || null,
        nguoi_nhap_id: nv?.id,
      });
    });

    if (records.length === 0) {
      setImportSummary({ success: 0, errors: errors.length ? errors : ["File không có dòng dữ liệu hợp lệ."] });
      setImporting(false);
      return;
    }

    const { data, error: err } = await supabase.from("hoa_don_dau_vao").insert(records).select();
    setImporting(false);
    if (err) {
      setImportSummary({ success: 0, errors: [...errors, `Lỗi khi lưu: ${err.message}`] });
      return;
    }
    setRows((prev) => [...((data as HoaDonDauVao[]) ?? []), ...prev]);
    setImportSummary({ success: data?.length ?? 0, errors });
  }

  const thangOptions = Array.from(new Set(rows.map((r) => r.thang_phan_bo))).sort().reverse();
  if (!thangOptions.includes(thangLoc)) thangOptions.unshift(thangLoc);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Hóa đơn đầu vào</h1>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleExportExcel} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700">
            Xuất Excel
          </button>
          {canEdit && (
            <>
              <button onClick={handleDownloadTemplate} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700">
                Tải mẫu Excel
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-60"
              >
                {importing ? "Đang nhập..." : "Nhập Excel"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImportFile(file);
                  e.target.value = "";
                }}
              />
              <button
                onClick={batDauThem}
                disabled={editingId !== null}
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm disabled:opacity-60"
              >
                + Thêm dòng
              </button>
            </>
          )}
        </div>
      </div>

      {importSummary && (
        <div className={`mb-4 rounded-lg border p-3 text-sm ${importSummary.errors.length > 0 ? "border-amber-300 bg-amber-50 text-amber-800" : "border-green-300 bg-green-50 text-green-800"}`}>
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium">
              Đã nhập {importSummary.success} dòng{importSummary.errors.length > 0 ? `, ${importSummary.errors.length} dòng lỗi:` : "."}
            </p>
            <button onClick={() => setImportSummary(null)} className="text-xs underline">
              Đóng
            </button>
          </div>
          {importSummary.errors.length > 0 && (
            <ul className="mt-2 list-disc space-y-0.5 pl-5">
              {importSummary.errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        <select value={thangLoc} onChange={(e) => setThangLoc(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
          {thangOptions.map((t) => (
            <option key={t} value={t}>
              Tháng {t}
            </option>
          ))}
        </select>
        <select value={loaiLoc} onChange={(e) => setLoaiLoc(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
          <option>Tất cả</option>
          <option>Định phí cố định</option>
          <option>Phát sinh</option>
        </select>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm khoản mục, NCC, số hóa đơn..."
          className="min-w-[200px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[1200px] text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">Mẫu số</th>
              <th className="px-3 py-2 font-medium">Ngày HĐ</th>
              <th className="px-3 py-2 font-medium">Ngày ký</th>
              <th className="px-3 py-2 font-medium">Số HĐ</th>
              <th className="px-3 py-2 font-medium">Nhà cung cấp</th>
              <th className="px-3 py-2 font-medium">Khoản mục</th>
              <th className="px-3 py-2 font-medium">Loại</th>
              <th className="px-3 py-2 font-medium">Tháng PB</th>
              <th className="px-3 py-2 text-right font-medium">Tiền hàng</th>
              <th className="px-3 py-2 text-right font-medium">Thuế GTGT</th>
              <th className="px-3 py-2 text-right font-medium">Tổng TT</th>
              <th className="px-3 py-2 font-medium">Tình trạng</th>
              <th className="px-3 py-2 text-right font-medium">Đã trả</th>
              <th className="px-3 py-2 font-medium">PT thanh toán</th>
              <th className="px-3 py-2 font-medium">Ghi chú</th>
              {canEdit && <th className="px-3 py-2"></th>}
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) =>
              editingId === row.id ? (
                <tr key={row.id} className="border-t border-blue-100 bg-blue-50/40">
                  <td className="px-2 py-1.5">
                    <input value={editValues.mau_so_hoa_don} onChange={(e) => set("mau_so_hoa_don", e.target.value)} className="w-20 rounded border border-slate-300 px-2 py-1.5 text-sm" />
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="date" value={editValues.ngay_hoa_don} onChange={(e) => set("ngay_hoa_don", e.target.value)} className="w-32 rounded border border-slate-300 px-2 py-1.5 text-sm" />
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="date" value={editValues.ngay_ky_hoa_don} onChange={(e) => set("ngay_ky_hoa_don", e.target.value)} className="w-32 rounded border border-slate-300 px-2 py-1.5 text-sm" />
                  </td>
                  <td className="px-2 py-1.5">
                    <input value={editValues.so_hoa_don} onChange={(e) => set("so_hoa_don", e.target.value)} className="w-24 rounded border border-slate-300 px-2 py-1.5 text-sm" />
                  </td>
                  <td className="min-w-[180px] px-2 py-1.5">
                    <QuickAddNhaCungCap
                      options={ncList}
                      value={editValues.nha_cung_cap_id}
                      onChange={(v) => set("nha_cung_cap_id", v)}
                      onAdded={(n) => setNcList((prev) => [...prev, n])}
                    />
                  </td>
                  <td className="min-w-[160px] px-2 py-1.5">
                    <input value={editValues.khoan_muc} onChange={(e) => set("khoan_muc", e.target.value)} placeholder="VD: Thuê văn phòng" className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm" />
                  </td>
                  <td className="px-2 py-1.5">
                    <select value={editValues.loai_chi_phi} onChange={(e) => set("loai_chi_phi", e.target.value)} className="rounded border border-slate-300 bg-white px-2 py-1.5 text-sm">
                      <option>Định phí cố định</option>
                      <option>Phát sinh</option>
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <input value={editValues.thang_phan_bo} onChange={(e) => set("thang_phan_bo", e.target.value)} placeholder="YYYY-MM" className="w-24 rounded border border-slate-300 px-2 py-1.5 text-sm" />
                  </td>
                  <td className="px-2 py-1.5">
                    <MoneyInput value={editValues.tong_tien_hang} onChange={(v) => set("tong_tien_hang", v)} className="w-28 rounded border border-slate-300 px-2 py-1.5 text-right text-sm" />
                  </td>
                  <td className="px-2 py-1.5">
                    <MoneyInput value={editValues.tien_thue_gtgt} onChange={(v) => set("tien_thue_gtgt", v)} className="w-24 rounded border border-slate-300 px-2 py-1.5 text-right text-sm" />
                  </td>
                  <td className="px-3 py-1.5 text-right font-medium text-slate-700">
                    {fmt(Number(editValues.tong_tien_hang || 0) + Number(editValues.tien_thue_gtgt || 0))}
                  </td>
                  <td className="px-2 py-1.5">
                    <select value={editValues.tinh_trang_thanh_toan} onChange={(e) => set("tinh_trang_thanh_toan", e.target.value)} className="rounded border border-slate-300 bg-white px-2 py-1.5 text-sm">
                      <option>Chưa thanh toán</option>
                      <option>Một phần</option>
                      <option>Đã đủ</option>
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <MoneyInput value={editValues.so_tien_da_thanh_toan} onChange={(v) => set("so_tien_da_thanh_toan", v)} className="w-24 rounded border border-slate-300 px-2 py-1.5 text-right text-sm" />
                  </td>
                  <td className="px-2 py-1.5">
                    <select value={editValues.phuong_thuc_thanh_toan} onChange={(e) => set("phuong_thuc_thanh_toan", e.target.value)} className="rounded border border-slate-300 bg-white px-2 py-1.5 text-sm">
                      <option value="">—</option>
                      <option>Tiền mặt</option>
                      <option>Tài khoản công ty</option>
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <input value={editValues.ghi_chu} onChange={(e) => set("ghi_chu", e.target.value)} className="w-28 rounded border border-slate-300 px-2 py-1.5 text-sm" />
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-right">
                    <button onClick={() => luu(row)} disabled={saving} className="mr-2 text-sm font-medium text-blue-600 disabled:opacity-60">
                      {saving ? "..." : "Lưu"}
                    </button>
                    <button onClick={() => huy(row)} className="text-sm font-medium text-slate-500">
                      Hủy
                    </button>
                  </td>
                </tr>
              ) : (
                <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2 text-slate-700">{row.mau_so_hoa_don ?? "—"}</td>
                  <td className="px-3 py-2 text-slate-700">{row.ngay_hoa_don}</td>
                  <td className="px-3 py-2 text-slate-700">{row.ngay_ky_hoa_don ?? "—"}</td>
                  <td className="px-3 py-2 text-slate-700">{row.so_hoa_don ?? "—"}</td>
                  <td className="px-3 py-2 text-slate-700">{ncMap.get(row.nha_cung_cap_id ?? "") || "—"}</td>
                  <td className="px-3 py-2 font-medium text-slate-900">{row.khoan_muc}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${row.loai_chi_phi === "Định phí cố định" ? "bg-indigo-100 text-indigo-700" : "bg-amber-100 text-amber-700"}`}>
                      {row.loai_chi_phi}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-700">{row.thang_phan_bo}</td>
                  <td className="px-3 py-2 text-right text-slate-700">{fmt(row.tong_tien_hang)}</td>
                  <td className="px-3 py-2 text-right text-slate-700">{fmt(row.tien_thue_gtgt)}</td>
                  <td className="px-3 py-2 text-right font-medium text-slate-900">{fmt(row.tong_tien_thanh_toan)}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        row.tinh_trang_thanh_toan === "Đã đủ" ? "bg-green-100 text-green-700" : row.tinh_trang_thanh_toan === "Một phần" ? "bg-amber-100 text-amber-700" : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {row.tinh_trang_thanh_toan}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right text-slate-700">{fmt(row.so_tien_da_thanh_toan)}</td>
                  <td className="px-3 py-2 text-slate-700">{row.phuong_thuc_thanh_toan ?? "—"}</td>
                  <td className="max-w-[140px] truncate px-3 py-2 text-slate-500" title={row.ghi_chu ?? ""}>
                    {row.ghi_chu ?? "—"}
                  </td>
                  {canEdit && (
                    <td className="whitespace-nowrap px-3 py-2 text-right">
                      <button onClick={() => batDauSua(row)} disabled={editingId !== null} className="mr-3 text-sm font-medium text-blue-600 hover:underline disabled:opacity-40">
                        Sửa
                      </button>
                      <button onClick={() => xoa(row)} disabled={editingId !== null} className="text-sm font-medium text-red-600 hover:underline disabled:opacity-40">
                        Xóa
                      </button>
                    </td>
                  )}
                </tr>
              )
            )}
            {filteredRows.length === 0 && (
              <tr>
                <td colSpan={16} className="px-4 py-8 text-center text-slate-400">
                  Chưa có hóa đơn nào trong tháng này.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <p className="mt-4 text-sm text-slate-700">
        Tổng hóa đơn đầu vào tháng {thangLoc}{loaiLoc !== "Tất cả" ? ` (${loaiLoc})` : ""}: <strong>{fmt(tongTheoLoc)}</strong>
      </p>
      <p className="mt-2 max-w-3xl text-xs text-slate-400">
        Dùng để phân bổ đều cho các lô hàng phát sinh trong tháng đó khi tính lợi nhuận (Định phí phân bổ/lô = Tổng hóa đơn đầu vào tháng ÷ Số lô hàng trong tháng) — gồm cả &ldquo;Định phí cố định&rdquo; (thuê
        nhà, lương...) lẫn &ldquo;Phát sinh&rdquo; (ăn uống, văn phòng phẩm...). Đánh dấu &ldquo;Đã đủ&rdquo;/&ldquo;Một phần&rdquo; + chọn phương thức thanh toán để tự động ghi vào Sổ quỹ.
      </p>
    </div>
  );
}
