"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { danhSachNgay } from "@/lib/chamCong";

/**
 * Them nhanh 1 ky nghi le nhieu ngay lien tiep (vd Tet 9 ngay, 2/9 nghi 2
 * ngay...) thay vi phai them tung ngay 1 qua DanhMucManager ben duoi.
 */
export default function ThemNgayLeHangLoat() {
  const router = useRouter();
  const [form, setForm] = useState({ tuNgay: "", denNgay: "", ten: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const soNgay =
    form.tuNgay && form.denNgay && form.denNgay >= form.tuNgay ? danhSachNgay(form.tuNgay, form.denNgay).length : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.tuNgay || !form.denNgay || !form.ten.trim() || form.denNgay < form.tuNgay) return;
    setSaving(true);
    setMsg(null);
    const supabase = createClient();
    const records = danhSachNgay(form.tuNgay, form.denNgay).map((ngay) => ({ ngay, ten: form.ten.trim() }));
    const { error } = await supabase.from("lich_nghi_le").upsert(records, { onConflict: "ngay" });
    setSaving(false);
    if (error) {
      setMsg(`Lỗi: ${error.message}`);
      return;
    }
    setMsg(`Đã thêm ${records.length} ngày nghỉ lễ (${form.tuNgay} → ${form.denNgay}).`);
    setForm({ tuNgay: "", denNgay: "", ten: "" });
    router.refresh();
  }

  const cls = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";

  return (
    <form onSubmit={handleSubmit} className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-slate-900">Thêm kỳ nghỉ nhiều ngày (vd Tết, 2/9...)</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Từ ngày</label>
          <input type="date" required value={form.tuNgay} onChange={(e) => setForm((p) => ({ ...p, tuNgay: e.target.value }))} className={cls} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Đến ngày</label>
          <input
            type="date"
            required
            min={form.tuNgay}
            value={form.denNgay}
            onChange={(e) => setForm((p) => ({ ...p, denNgay: e.target.value }))}
            className={cls}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-slate-700">Tên kỳ nghỉ</label>
          <input
            required
            value={form.ten}
            onChange={(e) => setForm((p) => ({ ...p, ten: e.target.value }))}
            placeholder="VD: Tết Nguyên đán 2027"
            className={cls}
          />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button type="submit" disabled={saving || soNgay === 0} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
          {saving ? "Đang lưu..." : soNgay > 0 ? `Thêm ${soNgay} ngày` : "Thêm"}
        </button>
        {msg && <p className="text-xs text-slate-500">{msg}</p>}
      </div>
    </form>
  );
}
