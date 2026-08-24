"use client";

import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/client";

export interface LineItemField {
  key: string;
  label: string;
  type: "text" | "number" | "textarea";
  required?: boolean;
}

type Row = Record<string, unknown> & { id: string };

export default function LineItemsSection({
  table,
  donHangId,
  soDonHang,
  title,
  fields,
  initialRows,
  canEdit,
}: {
  table: string;
  donHangId: string;
  soDonHang: string;
  title: string;
  fields: LineItemField[];
  initialRows: Row[];
  canEdit: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  async function handleSave(values: Record<string, string>) {
    const payload: Record<string, unknown> = { don_hang_id: donHangId };
    for (const f of fields) {
      payload[f.key] = values[f.key] === "" ? null : f.type === "number" ? Number(values[f.key]) : values[f.key];
    }

    if (editing) {
      const { data, error } = await supabase.from(table).update(payload).eq("id", editing.id).select().single();
      if (!error && data) {
        setRows((prev) => prev.map((r) => (r.id === editing.id ? (data as Row) : r)));
        setShowForm(false);
      }
    } else {
      const { data, error } = await supabase.from(table).insert(payload).select().single();
      if (!error && data) {
        setRows((prev) => [data as Row, ...prev]);
        setShowForm(false);
      }
    }
  }

  async function handleDelete(row: Row) {
    if (!window.confirm("Xóa dòng này?")) return;
    const { error } = await supabase.from(table).delete().eq("id", row.id);
    if (!error) setRows((prev) => prev.filter((r) => r.id !== row.id));
  }

  function handleExportExcel() {
    const data = rows.map((r) => {
      const obj: Record<string, unknown> = {};
      fields.forEach((f) => (obj[f.label] = r[f.key] ?? ""));
      return obj;
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, title);
    XLSX.writeFile(wb, `${table}-${soDonHang}.xlsx`);
  }

  function handleDownloadTemplate() {
    const headers = fields.map((f) => f.label);
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mẫu nhập");
    XLSX.writeFile(wb, `mau-nhap-${table}.xlsx`);
  }

  async function handleImportFile(file: File) {
    setImporting(true);
    setImportMsg(null);
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]], { defval: "" });

    const records: Record<string, unknown>[] = [];
    const errors: string[] = [];

    raw.forEach((rawRow, idx) => {
      const rowNum = idx + 2;
      const norm: Record<string, unknown> = {};
      for (const key of Object.keys(rawRow)) norm[key.trim().toLowerCase()] = rawRow[key];

      const record: Record<string, unknown> = { don_hang_id: donHangId };
      let hasError = false;
      for (const f of fields) {
        const raw = norm[f.label.trim().toLowerCase()];
        const value = typeof raw === "string" ? raw.trim() : raw;
        if (f.required && !value && value !== 0) {
          errors.push(`Dòng ${rowNum}: thiếu "${f.label}".`);
          hasError = true;
          continue;
        }
        record[f.key] = value === "" || value === undefined ? null : f.type === "number" ? Number(value) : value;
      }
      if (!hasError) records.push(record);
    });

    if (records.length === 0) {
      setImportMsg(errors.length ? errors.join(" | ") : "File không có dòng hợp lệ.");
      setImporting(false);
      return;
    }

    const { data, error } = await supabase.from(table).insert(records).select();
    setImporting(false);
    if (error) {
      setImportMsg(`Lỗi: ${error.message}`);
      return;
    }
    setRows((prev) => [...((data as Row[]) ?? []), ...prev]);
    setImportMsg(`Đã nhập ${data?.length ?? 0} dòng${errors.length ? `, lỗi: ${errors.join(" | ")}` : "."}`);
  }

  const total = rows.reduce((s, r) => s + (Number(r[fields.find((f) => f.type === "number")?.key ?? ""]) || 0), 0);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleExportExcel} className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700">
            Xuất Excel
          </button>
          {canEdit && (
            <>
              <button onClick={handleDownloadTemplate} className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700">
                Tải mẫu
              </button>
              <label className="cursor-pointer rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700">
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
                className="rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white"
              >
                + Thêm
              </button>
            </>
          )}
        </div>
      </div>

      {importMsg && <p className="mb-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">{importMsg}</p>}

      <div className="flex flex-col gap-2">
        {rows.map((row) => (
          <div key={row.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-3 text-sm">
            <div>
              {fields.map((f) => (
                <span key={f.key} className="mr-3 text-slate-700">
                  <span className="text-slate-400">{f.label}: </span>
                  {String(row[f.key] ?? "—")}
                </span>
              ))}
            </div>
            {canEdit && (
              <div className="flex shrink-0 gap-3">
                <button
                  onClick={() => {
                    setEditing(row);
                    setShowForm(true);
                  }}
                  className="text-xs font-medium text-blue-600"
                >
                  Sửa
                </button>
                <button onClick={() => handleDelete(row)} className="text-xs font-medium text-red-600">
                  Xóa
                </button>
              </div>
            )}
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm text-slate-400">Chưa có dữ liệu.</p>}
      </div>

      {rows.length > 0 && (
        <p className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-600">
          Tổng: <strong>{total.toLocaleString("en-US")}</strong>
        </p>
      )}

      {showForm && (
        <LineItemForm fields={fields} initial={editing} onCancel={() => setShowForm(false)} onSave={handleSave} />
      )}
    </div>
  );
}

function LineItemForm({
  fields,
  initial,
  onCancel,
  onSave,
}: {
  fields: LineItemField[];
  initial: Row | null;
  onCancel: () => void;
  onSave: (values: Record<string, string>) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const v: Record<string, string> = {};
    for (const f of fields) v[f.key] = initial ? String(initial[f.key] ?? "") : "";
    return v;
  });

  const cls = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(values);
        }}
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-md sm:rounded-2xl"
      >
        <h2 className="mb-4 text-lg font-semibold text-slate-900">{initial ? "Sửa" : "Thêm mới"}</h2>
        <div className="flex flex-col gap-3">
          {fields.map((f) => (
            <div key={f.key}>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {f.label}
                {f.required && <span className="text-red-500"> *</span>}
              </label>
              {f.type === "textarea" ? (
                <textarea
                  required={f.required}
                  rows={2}
                  value={values[f.key]}
                  onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  className={cls}
                />
              ) : (
                <input
                  type={f.type === "number" ? "number" : "text"}
                  step={f.type === "number" ? "any" : undefined}
                  required={f.required}
                  value={values[f.key]}
                  onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  className={cls}
                />
              )}
            </div>
          ))}
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
