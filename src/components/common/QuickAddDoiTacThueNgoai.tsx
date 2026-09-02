"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FormModal, type FieldConfig } from "@/components/danh-muc/DanhMucManager";
import SearchableSelect from "@/components/common/SearchableSelect";

export interface DoiTacThueNgoaiOption {
  id: string;
  ten?: string;
}

const NHOM_DOI_TAC = ["Công ty đối tác (vận tải)", "Hãng tàu", "Đại lý cước biển", "Dịch vụ khác"];

const FIELDS: FieldConfig[] = [
  { key: "ma_so_thue", label: "Mã số thuế", type: "text", hint: "Nhập rồi rời khỏi ô để tự động tra cứu tên, địa chỉ" },
  { key: "ten", label: "Tên đối tác", type: "text", required: true },
  { key: "nhom", label: "Nhóm", type: "select", required: true, options: NHOM_DOI_TAC.map((n) => ({ value: n, label: n })) },
  { key: "dia_chi", label: "Địa chỉ", type: "text" },
  { key: "nguoi_lien_he", label: "Người liên hệ", type: "text" },
  { key: "dien_thoai", label: "Điện thoại", type: "tel" },
  { key: "email", label: "Email", type: "email" },
  { key: "ghi_chu", label: "Ghi chú", type: "textarea" },
];

/** Giong QuickAddNhaCungCap nhung cho Doi tac thue ngoai (bang doi_tac_thue_ngoai), dung form day du nhu Danh muc. */
export default function QuickAddDoiTacThueNgoai({
  options,
  value,
  onChange,
  onAdded,
  placeholder = "Gõ tên đối tác thuê ngoài...",
  disabled = false,
}: {
  options: DoiTacThueNgoaiOption[];
  value: string;
  onChange: (value: string) => void;
  onAdded: (row: DoiTacThueNgoaiOption & { ten: string }) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectOptions = options.map((d) => ({ value: d.id, label: d.ten ?? "" }));

  async function handleSubmit(values: Record<string, string>) {
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const payload: Record<string, unknown> = {};
    for (const f of FIELDS) payload[f.key] = values[f.key] === "" ? null : values[f.key];
    const { data, error: err } = await supabase.from("doi_tac_thue_ngoai").insert(payload).select("id, ten").single();
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    onAdded(data as DoiTacThueNgoaiOption & { ten: string });
    onChange(data.id);
    setOpen(false);
  }

  return (
    <div className="flex gap-2">
      <SearchableSelect options={selectOptions} value={value} onChange={onChange} placeholder={placeholder} className="flex-1" disabled={disabled} />
      {!disabled && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          title="Thêm đối tác thuê ngoài mới"
          className="shrink-0 rounded-lg border border-slate-300 px-3 text-sm font-medium text-blue-600 hover:bg-blue-50"
        >
          +
        </button>
      )}

      {open && (
        <FormModal
          fields={FIELDS}
          initial={null}
          saving={saving}
          error={error}
          taxLookup={{ taxField: "ma_so_thue", nameField: "ten", addressField: "dia_chi" }}
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
