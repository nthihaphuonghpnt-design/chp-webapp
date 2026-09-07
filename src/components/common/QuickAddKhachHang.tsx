"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FormModal, type FieldConfig } from "@/components/danh-muc/DanhMucManager";
import SearchableSelect from "@/components/common/SearchableSelect";

export interface KhachHangOption {
  id: string;
  ten_day_du?: string;
  ten_viet_tat?: string | null;
  nhom_khach_hang_ten?: string | null;
}

function khOptionLabel(k: KhachHangOption) {
  const ten = k.ten_viet_tat || k.ten_day_du || "";
  return k.nhom_khach_hang_ten ? `${ten} — (${k.nhom_khach_hang_ten})` : ten;
}

/**
 * Dropdown chon khach hang, kem nut "+" mo dung form Them khach hang day du
 * (giong het Danh mục → Khách hàng — MST tra cuu tu dong, nhom khach hang...)
 * ngay tren cac form tao don hang/hop dong, khong bi thieu thong tin so voi
 * form them nhanh rut gon truoc day.
 */
export default function QuickAddKhachHang({
  options,
  value,
  onChange,
  onAdded,
  nhomKhachHangList,
  placeholder = "Gõ tên khách hàng...",
  disabled = false,
}: {
  options: KhachHangOption[];
  value: string;
  onChange: (value: string) => void;
  onAdded: (row: KhachHangOption & { ten_day_du: string }) => void;
  nhomKhachHangList?: { id: string; ten: string }[];
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectOptions = options.map((k) => ({ value: k.id, label: khOptionLabel(k) }));

  const fields: FieldConfig[] = useMemo(
    () => [
      { key: "ma_so_thue", label: "Mã số thuế", type: "text", hint: "Nhập rồi rời khỏi ô để tự động tra cứu tên, địa chỉ" },
      { key: "ten_day_du", label: "Tên đầy đủ", type: "text", required: true },
      { key: "ten_viet_tat", label: "Tên viết tắt", type: "text" },
      {
        key: "nhom_khach_hang_id",
        label: "Nhóm khách hàng",
        type: "select",
        options: (nhomKhachHangList ?? []).map((n) => ({ value: n.id, label: n.ten })),
        hint: "Để trống nếu khách hàng độc lập, không thuộc nhóm nào. Chưa có nhóm cần thì bấm \"+\" tạo ngay tại đây.",
        quickAddTable: "nhom_khach_hang",
      },
      { key: "dia_chi", label: "Địa chỉ", type: "text" },
      { key: "nguoi_lien_he", label: "Người liên hệ", type: "text" },
      { key: "dien_thoai", label: "Điện thoại", type: "tel" },
      { key: "email", label: "Email", type: "email" },
      { key: "ghi_chu", label: "Ghi chú", type: "textarea" },
    ],
    [nhomKhachHangList]
  );

  async function handleSubmit(values: Record<string, string>) {
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const payload: Record<string, unknown> = {};
    for (const f of fields) payload[f.key] = values[f.key] === "" ? null : values[f.key];
    const { data, error: err } = await supabase
      .from("khach_hang")
      .insert(payload)
      .select("id, ten_day_du, ten_viet_tat, nhom_khach_hang:nhom_khach_hang_id(ten)")
      .single();
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    const nhom = Array.isArray(data.nhom_khach_hang) ? data.nhom_khach_hang[0] : data.nhom_khach_hang;
    const row = {
      id: data.id as string,
      ten_day_du: data.ten_day_du as string,
      ten_viet_tat: data.ten_viet_tat as string | null,
      nhom_khach_hang_ten: (nhom as { ten: string } | null)?.ten ?? null,
    };
    onAdded(row);
    onChange(row.id);
    setOpen(false);
  }

  return (
    <div className="flex gap-2">
      <SearchableSelect options={selectOptions} value={value} onChange={onChange} placeholder={placeholder} className="flex-1" disabled={disabled} />
      {!disabled && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          title="Thêm khách hàng mới"
          className="shrink-0 rounded-lg border border-slate-300 px-3 text-sm font-medium text-blue-600 hover:bg-blue-50"
        >
          +
        </button>
      )}

      {open && (
        <FormModal
          fields={fields}
          initial={null}
          saving={saving}
          error={error}
          taxLookup={{ taxField: "ma_so_thue", nameField: "ten_day_du", addressField: "dia_chi" }}
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
