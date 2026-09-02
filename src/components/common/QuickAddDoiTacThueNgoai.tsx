"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { lookupTaxCode } from "@/lib/taxLookup";
import SearchableSelect from "@/components/common/SearchableSelect";

export interface DoiTacThueNgoaiOption {
  id: string;
  ten?: string;
}

const NHOM_DOI_TAC = ["Công ty đối tác (vận tải)", "Hãng tàu", "Đại lý cước biển", "Dịch vụ khác"];

/** Giong QuickAddNhaCungCap nhung cho Doi tac thue ngoai (bang doi_tac_thue_ngoai). */
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
  const supabase = useMemo(() => createClient(), []);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ma_so_thue: "", ten: "", nhom: "", dien_thoai: "" });
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupMsg, setLookupMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectOptions = options.map((d) => ({ value: d.id, label: d.ten ?? "" }));

  function set(key: keyof typeof form, v: string) {
    setForm((prev) => ({ ...prev, [key]: v }));
  }

  function closeModal() {
    setOpen(false);
    setError(null);
    setLookupMsg(null);
    setForm({ ma_so_thue: "", ten: "", nhom: "", dien_thoai: "" });
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
    setForm((prev) => ({ ...prev, ten: result.name || prev.ten }));
    setLookupMsg("Đã tự động điền tên — kiểm tra lại trước khi lưu.");
  }

  async function handleAdd() {
    if (!form.ten.trim() || !form.nhom) return;
    setSaving(true);
    setError(null);
    const payload = {
      ma_so_thue: form.ma_so_thue.trim() || null,
      ten: form.ten.trim(),
      nhom: form.nhom,
      dien_thoai: form.dien_thoai.trim() || null,
    };
    const { data, error: err } = await supabase.from("doi_tac_thue_ngoai").insert(payload).select("id, ten").single();
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    onAdded(data as DoiTacThueNgoaiOption & { ten: string });
    onChange(data.id);
    closeModal();
  }

  const inputCls =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none";

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={closeModal}>
          <div className="w-full max-w-sm rounded-xl bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Thêm đối tác thuê ngoài mới</h3>
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
                  Tên đối tác <span className="text-red-500">*</span>
                </label>
                <input autoFocus value={form.ten} onChange={(e) => set("ten", e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Nhóm <span className="text-red-500">*</span>
                </label>
                <select value={form.nhom} onChange={(e) => set("nhom", e.target.value)} className={inputCls}>
                  <option value="">-- Chọn --</option>
                  {NHOM_DOI_TAC.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Điện thoại</label>
                <input value={form.dien_thoai} onChange={(e) => set("dien_thoai", e.target.value)} className={inputCls} />
              </div>
            </div>
            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={closeModal} className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700">
                Hủy
              </button>
              <button
                type="button"
                disabled={saving || !form.ten.trim() || !form.nhom}
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
