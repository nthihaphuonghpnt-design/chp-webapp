"use client";

import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { xuatExcelKeO, CONG_TY_HEADER_LINES, taiLogoCongTy, type ExcelColumn } from "@/lib/excel";
import { createClient } from "@/lib/supabase/client";
import SearchableSelect from "@/components/common/SearchableSelect";
import FileAttachSection from "@/components/common/FileAttachSection";
import MoneyInput from "@/components/common/MoneyInput";
import type { DinhKem } from "@/types/database";

interface NhanVien {
  id: string;
  ho_ten: string;
}

interface Row {
  id: string;
  nhan_vien_id: string;
  so_hop_dong: string | null;
  loai_hop_dong: string | null;
  chuc_vu: string | null;
  ngay_hieu_luc: string | null;
  ngay_het_han: string | null;
  luong_theo_hop_dong: number | null;
  trang_thai_hop_dong: "Chưa có hợp đồng" | "Đã có hợp đồng";
  ghi_chu: string | null;
  nhan_vien: NhanVien | NhanVien[] | null;
}

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? v[0] ?? null : v;
}
function nvTen(row: Row) {
  return one(row.nhan_vien)?.ho_ten ?? "—";
}
function fmt(n: number) {
  return Math.round(n).toLocaleString("en-US");
}

const LOAI_HOP_DONG = ["Thử việc", "Xác định thời hạn", "Không xác định thời hạn", "Khác"];

function trangThaiHieuLuc(row: Row) {
  const today = new Date().toISOString().slice(0, 10);
  if (row.ngay_het_han && row.ngay_het_han < today) return { label: "Hết hạn", color: "bg-red-100 text-red-700" };
  if (row.ngay_hieu_luc && row.ngay_hieu_luc > today) return { label: "Chưa hiệu lực", color: "bg-slate-100 text-slate-600" };
  return { label: "Còn hiệu lực", color: "bg-green-100 text-green-700" };
}

const HOP_DONG_COLOR: Record<string, string> = {
  "Chưa có hợp đồng": "bg-red-100 text-red-700",
  "Đã có hợp đồng": "bg-green-100 text-green-700",
};

export default function HopDongNhanVienView({
  initialRows,
  nhanVienList,
  dinhKemRows,
  canEdit,
  canDelete,
  currentUserId,
}: {
  initialRows: Row[];
  nhanVienList: NhanVien[];
  dinhKemRows: DinhKem[];
  canEdit: boolean;
  canDelete: boolean;
  currentUserId?: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [query, setQuery] = useState("");
  const [nvFilter, setNvFilter] = useState("");
  const [chuaCoHopDongOnly, setChuaCoHopDongOnly] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  const nvOptionsFilter = nhanVienList.map((n) => ({ value: n.id, label: n.ho_ten }));

  const filtered = rows
    .filter((r) => !chuaCoHopDongOnly || r.trang_thai_hop_dong === "Chưa có hợp đồng")
    .filter((r) => !nvFilter || r.nhan_vien_id === nvFilter)
    .filter((r) => {
      if (!query) return true;
      const q = query.toLowerCase();
      return (r.so_hop_dong ?? "").toLowerCase().includes(q) || nvTen(r).toLowerCase().includes(q);
    });

  async function refetchRow(id: string) {
    const { data } = await supabase
      .from("hop_dong_nhan_vien")
      .select("*, nhan_vien:nhan_vien_id(ho_ten)")
      .eq("id", id)
      .single();
    if (data) setRows((prev) => prev.map((r) => (r.id === id ? (data as Row) : r)));
  }

  async function handleSave(values: Record<string, string>) {
    const payload: Record<string, unknown> = {
      nhan_vien_id: values.nhan_vien_id || null,
      so_hop_dong: values.so_hop_dong || null,
      loai_hop_dong: values.loai_hop_dong || null,
      chuc_vu: values.chuc_vu || null,
      ngay_hieu_luc: values.ngay_hieu_luc || null,
      ngay_het_han: values.ngay_het_han || null,
      luong_theo_hop_dong: values.luong_theo_hop_dong ? Number(values.luong_theo_hop_dong) : null,
      ghi_chu: values.ghi_chu || null,
    };

    if (editing) {
      const { error } = await supabase.from("hop_dong_nhan_vien").update(payload).eq("id", editing.id);
      if (error) {
        window.alert(error.message);
        return;
      }
      await refetchRow(editing.id);
      setShowForm(false);
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data: nv } = await supabase.from("nhan_vien").select("id").eq("auth_user_id", user?.id).single();

      const { data, error } = await supabase
        .from("hop_dong_nhan_vien")
        .insert({ ...payload, nguoi_tao_id: nv?.id })
        .select("*, nhan_vien:nhan_vien_id(ho_ten)")
        .single();
      if (!error && data) {
        setRows((prev) => [data as Row, ...prev]);
        setShowForm(false);
      } else if (error) {
        window.alert(error.message);
      }
    }
  }

  async function handleDelete(row: Row) {
    if (!window.confirm(`Xóa hợp đồng "${row.so_hop_dong ?? ""}"?`)) return;
    const { error } = await supabase.from("hop_dong_nhan_vien").delete().eq("id", row.id);
    if (!error) setRows((prev) => prev.filter((r) => r.id !== row.id));
  }

  async function handleExportExcel() {
    const columns: ExcelColumn[] = [
      { header: "Nhân viên", key: "ten", width: 20 },
      { header: "Chức vụ", key: "chucVu", width: 16 },
      { header: "Số hợp đồng", key: "soHopDong", width: 16 },
      { header: "Loại hợp đồng", key: "loaiHopDong", width: 18 },
      { header: "Ngày hiệu lực", key: "hieuLuc", width: 12 },
      { header: "Ngày hết hạn", key: "hetHan", width: 12 },
      { header: "Lương theo HĐ", key: "luong", width: 14, numFmt: "#,##0" },
      { header: "Trạng thái hợp đồng", key: "trangThaiHd", width: 16 },
      { header: "Trạng thái hiệu lực", key: "trangThaiHl", width: 16 },
      { header: "Ghi chú", key: "ghiChu", width: 20 },
    ];
    const rows_ = filtered.map((r) => [
      nvTen(r),
      r.chuc_vu ?? "",
      r.so_hop_dong ?? "",
      r.loai_hop_dong ?? "",
      r.ngay_hieu_luc ?? "",
      r.ngay_het_han ?? "",
      r.luong_theo_hop_dong ?? "",
      r.trang_thai_hop_dong,
      trangThaiHieuLuc(r).label,
      r.ghi_chu ?? "",
    ]);
    const logo = await taiLogoCongTy();
    await xuatExcelKeO("hop-dong-nhan-vien.xlsx", {
      sheetName: "Hợp đồng nhân viên",
      logo: logo ?? undefined,
      headerLines: [...CONG_TY_HEADER_LINES, "", { text: "DANH SÁCH HỢP ĐỒNG NHÂN VIÊN", bold: true, size: 12 }],
      columns,
      rows: rows_,
    });
  }

  function handleDownloadTemplate() {
    const headers = [
      "Nhân viên *",
      "Chức vụ",
      "Số hợp đồng",
      "Loại hợp đồng",
      "Ngày hiệu lực (yyyy-mm-dd)",
      "Ngày hết hạn (yyyy-mm-dd)",
      "Lương theo hợp đồng",
      "Ghi chú",
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mẫu nhập");
    const guideRows = [
      ["Cột", "Giá trị hợp lệ"],
      ["Nhân viên", nhanVienList.map((n) => n.ho_ten).join(", ")],
      ["Loại hợp đồng", LOAI_HOP_DONG.join(", ")],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(guideRows), "Hướng dẫn");
    XLSX.writeFile(wb, "mau-nhap-hop-dong-nhan-vien.xlsx");
  }

  async function handleImportFile(file: File) {
    setImporting(true);
    setImportMsg(null);
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array", cellDates: true });
    const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]], { defval: "" });

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: nv } = await supabase.from("nhan_vien").select("id").eq("auth_user_id", user?.id).single();

    const records: Record<string, unknown>[] = [];
    const errors: string[] = [];

    raw.forEach((rawRow, idx) => {
      const rowNum = idx + 2;
      const norm: Record<string, unknown> = {};
      for (const key of Object.keys(rawRow)) norm[key.trim().toLowerCase()] = rawRow[key];
      const get = (h: string) => {
        const v = norm[h.toLowerCase()];
        return v instanceof Date ? v.toISOString().slice(0, 10) : String(v ?? "").trim();
      };

      const ten = get("Nhân viên *") || get("Nhân viên");
      const nvMatch = nhanVienList.find((n) => n.ho_ten.toLowerCase() === ten.toLowerCase());
      if (!nvMatch) {
        errors.push(`Dòng ${rowNum}: không tìm thấy nhân viên "${ten}".`);
        return;
      }

      records.push({
        nhan_vien_id: nvMatch.id,
        chuc_vu: get("Chức vụ") || null,
        so_hop_dong: get("Số hợp đồng") || null,
        loai_hop_dong: LOAI_HOP_DONG.includes(get("Loại hợp đồng")) ? get("Loại hợp đồng") : null,
        ngay_hieu_luc: get("Ngày hiệu lực (yyyy-mm-dd)") || null,
        ngay_het_han: get("Ngày hết hạn (yyyy-mm-dd)") || null,
        luong_theo_hop_dong: get("Lương theo hợp đồng") ? Number(get("Lương theo hợp đồng")) : null,
        ghi_chu: get("Ghi chú") || null,
        nguoi_tao_id: nv?.id,
      });
    });

    if (records.length === 0) {
      setImportMsg(errors.length ? errors.join(" | ") : "File không có dòng hợp lệ.");
      setImporting(false);
      return;
    }

    const { data, error } = await supabase.from("hop_dong_nhan_vien").insert(records).select("*, nhan_vien:nhan_vien_id(ho_ten)");
    setImporting(false);
    if (error) {
      setImportMsg(`Lỗi: ${error.message}`);
      return;
    }
    setRows((prev) => [...((data as Row[]) ?? []), ...prev]);
    setImportMsg(`Đã nhập ${data?.length ?? 0} dòng${errors.length ? `, lỗi: ${errors.join(" | ")}` : "."}`);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Hợp đồng nhân viên</h1>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleExportExcel} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            Xuất Excel
          </button>
          {canEdit && (
            <>
              <button onClick={handleDownloadTemplate} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
                Tải mẫu
              </button>
              <label className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-sm">
                {importing ? "Đang nhập..." : "Nhập Excel"}
                <input
                  ref={fileInputRef}
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
              <button
                onClick={() => {
                  setEditing(null);
                  setShowForm(true);
                }}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm"
              >
                + Thêm hợp đồng
              </button>
            </>
          )}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm theo số hợp đồng, tên nhân viên..."
          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
        />
        <div className="w-full sm:w-56">
          <SearchableSelect options={nvOptionsFilter} value={nvFilter} onChange={setNvFilter} placeholder="Lọc theo nhân viên" />
        </div>
        <label className="flex items-center gap-1.5 text-sm text-slate-600">
          <input type="checkbox" checked={chuaCoHopDongOnly} onChange={(e) => setChuaCoHopDongOnly(e.target.checked)} />
          Chỉ hiện chưa có hợp đồng
        </label>
      </div>

      {importMsg && <p className="mb-4 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">{importMsg}</p>}

      <div className="flex flex-col gap-2">
        {filtered.map((row) => {
          const status = trangThaiHieuLuc(row);
          return (
            <div key={row.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-slate-900">
                  {nvTen(row)}
                  {row.chuc_vu ? ` · ${row.chuc_vu}` : ""}
                  {row.so_hop_dong ? ` · ${row.so_hop_dong}` : ""}
                </span>
                <div className="flex gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${HOP_DONG_COLOR[row.trang_thai_hop_dong]}`}>
                    {row.trang_thai_hop_dong}
                  </span>
                  {row.trang_thai_hop_dong === "Đã có hợp đồng" && (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}>{status.label}</span>
                  )}
                </div>
              </div>
              <p className="text-slate-500">
                {row.loai_hop_dong ?? "—"} · Hiệu lực: {row.ngay_hieu_luc ?? "—"} → {row.ngay_het_han ?? "—"}
                {row.luong_theo_hop_dong ? ` · Lương: ${fmt(row.luong_theo_hop_dong)}` : ""}
              </p>
              {row.ghi_chu && <p className="text-slate-500">{row.ghi_chu}</p>}
              <FileAttachSection
                parentField="hop_dong_nhan_vien_id"
                parentId={row.id}
                pathPrefix="hop-dong-nhan-vien"
                lienKetToi="Hợp đồng nhân viên"
                initialRows={dinhKemRows.filter((d) => d.hop_dong_nhan_vien_id === row.id)}
                canUpload={canEdit}
                currentUserId={currentUserId}
              />
              {canEdit && (
                <div className="mt-2 flex gap-3">
                  <button
                    onClick={() => {
                      setEditing(row);
                      setShowForm(true);
                    }}
                    className="text-xs font-medium text-blue-600"
                  >
                    Sửa
                  </button>
                  {canDelete && (
                    <button onClick={() => handleDelete(row)} className="text-xs font-medium text-red-600">
                      Xóa
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && <p className="py-8 text-center text-sm text-slate-400">Không có hợp đồng nào.</p>}
      </div>

      {showForm && (
        <HopDongForm initial={editing} nhanVienList={nhanVienList} onCancel={() => setShowForm(false)} onSave={handleSave} />
      )}
    </div>
  );
}

function HopDongForm({
  initial,
  nhanVienList,
  onCancel,
  onSave,
}: {
  initial: Row | null;
  nhanVienList: NhanVien[];
  onCancel: () => void;
  onSave: (values: Record<string, string>) => void;
}) {
  const [values, setValues] = useState({
    nhan_vien_id: initial?.nhan_vien_id ?? "",
    chuc_vu: initial?.chuc_vu ?? "",
    so_hop_dong: initial?.so_hop_dong ?? "",
    loai_hop_dong: initial?.loai_hop_dong ?? "",
    ngay_hieu_luc: initial?.ngay_hieu_luc ?? "",
    ngay_het_han: initial?.ngay_het_han ?? "",
    luong_theo_hop_dong: initial?.luong_theo_hop_dong?.toString() ?? "",
    ghi_chu: initial?.ghi_chu ?? "",
  });

  function set(key: keyof typeof values, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  const daCoNhanVien = !!initial;
  const nvOptions = nhanVienList.map((n) => ({ value: n.id, label: n.ho_ten }));
  const cls =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(values);
        }}
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-lg sm:rounded-2xl"
      >
        <h2 className="mb-4 text-lg font-semibold text-slate-900">{initial ? "Sửa hợp đồng" : "Thêm hợp đồng"}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Nhân viên</label>
            {daCoNhanVien ? (
              <input disabled value={nvOptions.find((o) => o.value === values.nhan_vien_id)?.label ?? ""} className={cls} />
            ) : (
              <SearchableSelect options={nvOptions} value={values.nhan_vien_id} onChange={(v) => set("nhan_vien_id", v)} />
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Chức vụ</label>
            <input value={values.chuc_vu} onChange={(e) => set("chuc_vu", e.target.value)} className={cls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Số hợp đồng</label>
            <input value={values.so_hop_dong} onChange={(e) => set("so_hop_dong", e.target.value)} className={cls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Loại hợp đồng</label>
            <select value={values.loai_hop_dong} onChange={(e) => set("loai_hop_dong", e.target.value)} className={cls}>
              <option value="">-- Chọn --</option>
              {LOAI_HOP_DONG.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Lương theo hợp đồng</label>
            <MoneyInput value={values.luong_theo_hop_dong} onChange={(v) => set("luong_theo_hop_dong", v)} className={cls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Ngày hiệu lực</label>
            <input type="date" value={values.ngay_hieu_luc} onChange={(e) => set("ngay_hieu_luc", e.target.value)} className={cls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Ngày hết hạn</label>
            <input type="date" value={values.ngay_het_han} onChange={(e) => set("ngay_het_han", e.target.value)} className={cls} />
          </div>
        </div>
        <div className="mt-3">
          <label className="mb-1 block text-sm font-medium text-slate-700">Ghi chú</label>
          <textarea rows={2} value={values.ghi_chu} onChange={(e) => set("ghi_chu", e.target.value)} className={cls} />
        </div>
        <div className="mt-6 flex gap-3">
          <button type="button" onClick={onCancel} className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700">
            Hủy
          </button>
          <button type="submit" className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white">
            Lưu
          </button>
        </div>
      </form>
    </div>
  );
}
