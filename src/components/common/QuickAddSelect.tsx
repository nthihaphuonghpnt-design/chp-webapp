"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Option {
  id: string;
  ten: string;
}

/**
 * Select don gian cho 1 bang danh muc (chi co cot "ten"), kem nut "+ Thêm mới"
 * de tao nhanh 1 dong danh muc chua co, khong phai roi qua trang Danh mục.
 */
export default function QuickAddSelect({
  table,
  label,
  options,
  value,
  onChange,
  onAdded,
  className = "",
}: {
  table: string;
  label: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  onAdded: (row: Option) => void;
  className?: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [open, setOpen] = useState(false);
  const [ten, setTen] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    if (!ten.trim()) return;
    setSaving(true);
    setError(null);
    const { data, error: err } = await supabase.from(table).insert({ ten: ten.trim() }).select("id, ten").single();
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    onAdded(data as Option);
    onChange((data as Option).id);
    setOpen(false);
    setTen("");
  }

  const selectCls =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none";

  return (
    <div className={`flex gap-2 ${className}`}>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={selectCls}>
        <option value="">-- Chọn --</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.ten}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={`Thêm ${label} mới`}
        className="shrink-0 rounded-lg border border-slate-300 px-3 text-sm font-medium text-blue-600 hover:bg-blue-50"
      >
        +
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Thêm {label} mới</h3>
            <input
              autoFocus
              value={ten}
              onChange={(e) => setTen(e.target.value)}
              placeholder={`Tên ${label}`}
              className={selectCls}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAdd();
                }
              }}
            />
            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setError(null);
                  setTen("");
                }}
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={saving || !ten.trim()}
                onClick={handleAdd}
                className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {saving ? "Đang lưu..." : "Thêm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
