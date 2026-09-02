"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FormModal, type FieldConfig } from "@/components/danh-muc/DanhMucManager";

interface Option {
  id: string;
  ten: string;
}

/**
 * Select don gian cho 1 bang danh muc, kem nut "+ Thêm mới" mo dung form
 * day du (giong het trang Danh mục dùng chung, khong bi thieu truong nao)
 * de tao nhanh 1 dong danh muc chua co, khong phai roi qua trang rieng.
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
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fields: FieldConfig[] = [
    { key: "ten", label: `Tên ${label}`, type: "text", required: true },
    { key: "ghi_chu", label: "Ghi chú", type: "textarea" },
  ];

  async function handleSubmit(values: Record<string, string>) {
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const payload: Record<string, unknown> = {};
    for (const f of fields) payload[f.key] = values[f.key] === "" ? null : values[f.key];
    const { data, error: err } = await supabase.from(table).insert(payload).select("id, ten").single();
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    onAdded(data as Option);
    onChange((data as Option).id);
    setOpen(false);
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
        <FormModal
          fields={fields}
          initial={null}
          saving={saving}
          error={error}
          onCancel={() => {
            setOpen(false);
            setError(null);
          }}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
