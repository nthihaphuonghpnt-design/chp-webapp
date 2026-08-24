"use client";

import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/client";
import SearchableSelect from "@/components/common/SearchableSelect";

interface KhachHang {
  id: string;
  ten_day_du: string;
  ten_viet_tat: string | null;
}

interface Row {
  id: string;
  khach_hang_id: string;
  so_hop_dong: string | null;
  loai_hop_dong: string | null;
  ngay_hieu_luc: string | null;
  ngay_het_han: string | null;
  ghi_chu: string | null;
  khach_hang: KhachHang | KhachHang[] | null;
}

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? v[0] ?? null : v;
}

function khName(kh: KhachHang | null) {
  return kh ? kh.ten_viet_tat || kh.ten_day_du : "—";
}

const LOAI_HOP_DONG = ["Dịch vụ logistics", "Ủy thác XNK", "Khác"];

function trangThaiHieuLuc(row: Row) {
  const today = new Date().toISOString().slice(0, 10);
  if (row.ngay_het_han && row.ngay_het_han < today) return { label: "Hết hạn", color: "bg-red-100 text-red-700" };
  if (row.ngay_hieu_luc && row.ngay_hieu_luc > today) return { label: "Chưa hiệu lực", color: "bg-slate-100 text-slate-600" };
  return { label: "Còn hiệu lực", color: "bg-green-100 text-green-700" };
}

export default function HopDongView({
  initialRows,
  khachHangList,
  canEdit,
  canDelete,
}: {
  initialRows: Row[];
  khachHangList: KhachHang[];
  canEdit: boolean;
  canDelete: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  const filtered = rows.filter((r) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      (r.so_hop_dong ?? "").toLowerCase().includes(q) ||
      khName(one(r.khach_hang)).toLowerCase().includes(q)
    );
  });

  async function handleSave(values: Record<string, string>) {
    const payload: Record<string, unknown> = {
      khach_hang_id: values.khach_hang_id,
      so_hop_dong: values.so_hop_dong || null,
      loai_hop_dong: values.loai_hop_dong || null,
      ngay_hieu_luc: values.ngay_hieu_luc || null,
      ngay_het_han: values.ngay_het_han || null,
      ghi_chu: values.ghi_chu || null,
    };

    if (editing) {
      const { data, error } = await supabase
        .from("hop_dong_khach_hang")
        .update(payload)
        .eq("id", editing.id)
        .select("*, khach_hang:khach_hang_id(ten_day_du, ten_viet_tat)")
        .single();
      if (!error && data) {
        setRows((prev) => prev.map((r) => (r.id === editing.id ? (data as Row) : r)));
        setShowForm(false);
      } else if (error) {
        window.alert(error.message);
      }
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data: nv } = await supabase.from("nhan_vien").select("id").eq("auth_user_id", user?.id).single();

      const { data, error } = await supabase
        .from("hop_dong_khach_hang")
        .insert({ ...payload, nguoi_tao_id: nv?.id })
        .select("*, khach_hang:khach_hang_id(ten_day_du, ten_viet_tat)")
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
    const { error } = await supabase.from("hop_dong_khach_hang").delete().eq("id", row.id);
    if (!error) setRows((prev) => prev.filter((r) => r.id !== row.id));
  }

  function handleExportExcel() {
    const data = filtered.map((r) => ({
      "Khách hàng": khName(one(r.khach_hang)),
      "Số hợp đồng": r.so_hop_dong ?? "",
      "Loại hợp đồng": r.loai_hop_dong ?? "",
      "Ngày hiệu lực": r.ngay_hieu_luc ?? "",
      "Ngày hết hạn": r.ngay_het_han ?? "",
      "Trạng thái": trangThaiHieuLuc(r).label,
      "Ghi chú": r.ghi_chu ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Hợp đồng");
    XLSX.writeFile(wb, "hop-dong-khach-hang.xlsx");
  }

  function handleDownloadTemplate() {
    const headers = ["Khách hàng *", "Số hợp đồng", "Loại hợp đồng", "Ngày hiệu lực (yyyy-mm-dd)", "Ngày hết hạn (yyyy-mm-dd)", "Ghi chú"];
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mẫu nhập");
    const guideRows = [
      ["Cột", "Giá trị hợp lệ"],
      ["Khách hàng", khachHangList.map((k) => k.ten_viet_tat || k.ten_day_du).join(", ")],
      ["Loại hợp đồng", LOAI_HOP_DONG.join(", ")],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(guideRows), "Hướng dẫn");
    XLSX.writeFile(wb, "mau-nhap-hop-dong.xlsx");
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

      const khName_ = get("Khách hàng *") || get("Khách hàng");
      const kh = khachHangList.find((k) => (k.ten_viet_tat || k.ten_day_du).toLowerCase() === khName_.toLowerCase() || k.ten_day_du.toLowerCase() === khName_.toLowerCase());
      if (!kh) {
        errors.push(`Dòng ${rowNum}: không tìm thấy khách hàng "${khName_}".`);
        return;
      }
      records.push({
        khach_hang_id: kh.id,
        so_hop_dong: get("Số hợp đồng") || null,
        loai_hop_dong: LOAI_HOP_DONG.includes(get("Loại hợp đồng")) ? get("Loại hợp đồng") : null,
        ngay_hieu_luc: get("Ngày hiệu lực (yyyy-mm-dd)") || null,
        ngay_het_han: get("Ngày hết hạn (yyyy-mm-dd)") || null,
        ghi_chu: get("Ghi chú") || null,
        nguoi_tao_id: nv?.id,
      });
    });

    if (records.length === 0) {
      setImportMsg(errors.length ? errors.join(" | ") : "File không có dòng hợp lệ.");
      setImporting(false);
      return;
    }

    const { data, error } = await supabase
      .from("hop_dong_khach_hang")
      .insert(records)
      .select("*, khach_hang:khach_hang_id(ten_day_du, ten_viet_tat)");
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
        <h1 className="text-xl font-semibold text-slate-900">Hợp đồng khách hàng</h1>
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

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Tìm theo số hợp đồng, khách hàng..."
        className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
      />

      {importMsg && <p className="mb-4 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">{importMsg}</p>}

      <div className="flex flex-col gap-2">
        {filtered.map((row) => {
          const status = trangThaiHieuLuc(row);
          return (
            <div key={row.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-slate-900">
                  {row.so_hop_dong || "(chưa có số)"} · {khName(one(row.khach_hang))}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}>{status.label}</span>
              </div>
              <p className="text-slate-500">
                {row.loai_hop_dong ?? "—"} · Hiệu lực: {row.ngay_hieu_luc ?? "—"} → {row.ngay_het_han ?? "—"}
              </p>
              {row.ghi_chu && <p className="text-slate-500">{row.ghi_chu}</p>}
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
        {filtered.length === 0 && <p className="py-8 text-center text-sm text-slate-400">Chưa có hợp đồng nào.</p>}
      </div>

      {showForm && (
        <HopDongForm initial={editing} khachHangList={khachHangList} onCancel={() => setShowForm(false)} onSave={handleSave} />
      )}
    </div>
  );
}

function HopDongForm({
  initial,
  khachHangList,
  onCancel,
  onSave,
}: {
  initial: Row | null;
  khachHangList: KhachHang[];
  onCancel: () => void;
  onSave: (values: Record<string, string>) => void;
}) {
  const [values, setValues] = useState({
    khach_hang_id: initial?.khach_hang_id ?? "",
    so_hop_dong: initial?.so_hop_dong ?? "",
    loai_hop_dong: initial?.loai_hop_dong ?? "",
    ngay_hieu_luc: initial?.ngay_hieu_luc ?? "",
    ngay_het_han: initial?.ngay_het_han ?? "",
    ghi_chu: initial?.ghi_chu ?? "",
  });

  function set(key: keyof typeof values, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  const khOptions = khachHangList.map((k) => ({ value: k.id, label: k.ten_viet_tat || k.ten_day_du }));
  const cls = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";

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
            <label className="mb-1 block text-sm font-medium text-slate-700">Khách hàng</label>
            <SearchableSelect options={khOptions} value={values.khach_hang_id} onChange={(v) => set("khach_hang_id", v)} />
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
