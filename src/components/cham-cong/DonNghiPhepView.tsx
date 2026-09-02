"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { homNayVN } from "@/lib/chamCong";

interface DonNghiPhep {
  id: string;
  ngay_bat_dau: string;
  ngay_ket_thuc: string;
  ly_do: string | null;
  trang_thai: "Chờ duyệt" | "Đã duyệt" | "Từ chối";
  ghi_chu_duyet: string | null;
}

const TRANG_THAI_COLOR: Record<string, string> = {
  "Chờ duyệt": "bg-amber-100 text-amber-700",
  "Đã duyệt": "bg-green-100 text-green-700",
  "Từ chối": "bg-red-100 text-red-700",
};

export default function DonNghiPhepView({
  nhanVienId,
  initialRows,
}: {
  nhanVienId?: string;
  initialRows: DonNghiPhep[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<DonNghiPhep[]>(initialRows);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const homNay = homNayVN();
  const [values, setValues] = useState({ ngay_bat_dau: homNay, ngay_ket_thuc: homNay, ly_do: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nhanVienId) return;
    setSaving(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("don_xin_nghi_phep")
      .insert({
        nhan_vien_id: nhanVienId,
        ngay_bat_dau: values.ngay_bat_dau,
        ngay_ket_thuc: values.ngay_ket_thuc,
        ly_do: values.ly_do.trim() || null,
      })
      .select()
      .single();
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setRows((prev) => [data as DonNghiPhep, ...prev]);
    setShowForm(false);
    setValues({ ngay_bat_dau: homNay, ngay_ket_thuc: homNay, ly_do: "" });
  }

  const cls = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";

  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Đơn xin nghỉ phép</h2>
        <button onClick={() => setShowForm((v) => !v)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-blue-600">
          {showForm ? "Đóng" : "+ Gửi đơn"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-4 flex flex-col gap-3 rounded-lg bg-slate-50 p-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Từ ngày</label>
              <input
                type="date"
                required
                min={homNay}
                value={values.ngay_bat_dau}
                onChange={(e) => setValues((p) => ({ ...p, ngay_bat_dau: e.target.value }))}
                className={cls}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Đến ngày</label>
              <input
                type="date"
                required
                min={values.ngay_bat_dau}
                value={values.ngay_ket_thuc}
                onChange={(e) => setValues((p) => ({ ...p, ngay_ket_thuc: e.target.value }))}
                className={cls}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Lý do</label>
            <textarea rows={2} value={values.ly_do} onChange={(e) => setValues((p) => ({ ...p, ly_do: e.target.value }))} className={cls} />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button type="submit" disabled={saving} className="self-start rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
            {saving ? "Đang gửi..." : "Gửi đơn"}
          </button>
        </form>
      )}

      <div className="flex flex-col gap-2">
        {rows.map((r) => (
          <div key={r.id} className="rounded-lg border border-slate-100 p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-slate-800">
                {r.ngay_bat_dau === r.ngay_ket_thuc ? r.ngay_bat_dau : `${r.ngay_bat_dau} → ${r.ngay_ket_thuc}`}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TRANG_THAI_COLOR[r.trang_thai]}`}>{r.trang_thai}</span>
            </div>
            {r.ly_do && <p className="mt-1 text-slate-500">{r.ly_do}</p>}
            {r.ghi_chu_duyet && <p className="mt-1 text-xs text-slate-400">Ghi chú: {r.ghi_chu_duyet}</p>}
          </div>
        ))}
        {rows.length === 0 && <p className="py-4 text-center text-sm text-slate-400">Chưa có đơn xin nghỉ phép nào.</p>}
      </div>
    </div>
  );
}
