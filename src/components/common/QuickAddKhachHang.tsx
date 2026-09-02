"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { lookupTaxCode } from "@/lib/taxLookup";
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
 * Dropdown chon khach hang, kem nut "+" mo hop thoai them nhanh 1 khach hang
 * moi (co tra cuu ten theo MST) ngay tren cac form tao don hang/hop dong...
 * khong can roi sang trang Danh mục → Khách hàng.
 */
export default function QuickAddKhachHang({
  options,
  value,
  onChange,
  onAdded,
  nhomKhachHangList,
  placeholder = "Gõ tên khách hàng...",
}: {
  options: KhachHangOption[];
  value: string;
  onChange: (value: string) => void;
  onAdded: (row: KhachHangOption & { ten_day_du: string }) => void;
  nhomKhachHangList?: { id: string; ten: string }[];
  placeholder?: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ma_so_thue: "", ten_day_du: "", ten_viet_tat: "", nhom_khach_hang_id: "" });
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupMsg, setLookupMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectOptions = options.map((k) => ({ value: k.id, label: khOptionLabel(k) }));

  function set(key: keyof typeof form, v: string) {
    setForm((prev) => ({ ...prev, [key]: v }));
  }

  function closeModal() {
    setOpen(false);
    setError(null);
    setLookupMsg(null);
    setForm({ ma_so_thue: "", ten_day_du: "", ten_viet_tat: "", nhom_khach_hang_id: "" });
  }

  async function handleTaxBlur() {
    const code = form.ma_so_thue.trim();
    if (!code || !/^\d{10}(\d{3})?$/.test(code)) return;
    setLookingUp(true);
    setLookupMsg(null);
    const result = await lookupTaxCode(code);
    setLookingUp(false);
    if (!result || !result.name) {
      setLookupMsg("Không tìm thấy thông tin cho mã số thuế này — vui lòng nhập tay.");
      return;
    }
    setForm((prev) => ({ ...prev, ten_day_du: result.name || prev.ten_day_du }));
    setLookupMsg("Đã tự động điền tên — kiểm tra lại trước khi lưu.");
  }

  async function handleAdd() {
    if (!form.ten_day_du.trim()) return;
    setSaving(true);
    setError(null);
    const payload = {
      ma_so_thue: form.ma_so_thue.trim() || null,
      ten_day_du: form.ten_day_du.trim(),
      ten_viet_tat: form.ten_viet_tat.trim() || null,
      nhom_khach_hang_id: form.nhom_khach_hang_id || null,
    };
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
    closeModal();
  }

  const inputCls =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none";

  return (
    <div className="flex gap-2">
      <SearchableSelect options={selectOptions} value={value} onChange={onChange} placeholder={placeholder} className="flex-1" />
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Thêm khách hàng mới"
        className="shrink-0 rounded-lg border border-slate-300 px-3 text-sm font-medium text-blue-600 hover:bg-blue-50"
      >
        +
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={closeModal}>
          <div className="w-full max-w-sm rounded-xl bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Thêm khách hàng mới</h3>
            <div className="flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Mã số thuế</label>
                <input
                  value={form.ma_so_thue}
                  onChange={(e) => set("ma_so_thue", e.target.value)}
                  onBlur={handleTaxBlur}
                  placeholder="Nhập rồi rời khỏi ô để tự tra cứu"
                  className={inputCls}
                />
                {lookingUp && <p className="mt-1 text-xs text-slate-400">Đang tra cứu...</p>}
                {lookupMsg && !lookingUp && <p className="mt-1 text-xs text-slate-500">{lookupMsg}</p>}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Tên đầy đủ <span className="text-red-500">*</span>
                </label>
                <input autoFocus value={form.ten_day_du} onChange={(e) => set("ten_day_du", e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Tên viết tắt</label>
                <input value={form.ten_viet_tat} onChange={(e) => set("ten_viet_tat", e.target.value)} className={inputCls} />
              </div>
              {nhomKhachHangList && nhomKhachHangList.length > 0 && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Nhóm khách hàng</label>
                  <select value={form.nhom_khach_hang_id} onChange={(e) => set("nhom_khach_hang_id", e.target.value)} className={inputCls}>
                    <option value="">-- Không thuộc nhóm --</option>
                    {nhomKhachHangList.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.ten}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={closeModal} className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700">
                Hủy
              </button>
              <button
                type="button"
                disabled={saving || !form.ten_day_du.trim()}
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
