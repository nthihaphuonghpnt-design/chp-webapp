"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface NhanVien {
  ho_ten: string;
}

interface DonNghiPhep {
  id: string;
  nhan_vien_id: string;
  ngay_bat_dau: string;
  ngay_ket_thuc: string;
  ly_do: string | null;
  trang_thai: "Chờ duyệt" | "Đã duyệt" | "Từ chối";
  ghi_chu_duyet: string | null;
  nhan_vien: NhanVien | NhanVien[] | null;
}

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? v[0] ?? null : v;
}

const TRANG_THAI_COLOR: Record<string, string> = {
  "Chờ duyệt": "bg-amber-100 text-amber-700",
  "Đã duyệt": "bg-green-100 text-green-700",
  "Từ chối": "bg-red-100 text-red-700",
};

export default function DonNghiPhepAdminView({
  initialRows,
  currentNhanVienId,
}: {
  initialRows: DonNghiPhep[];
  currentNhanVienId?: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<DonNghiPhep[]>(initialRows);
  const [chiChoDuyet, setChiChoDuyet] = useState(true);
  const [ghiChuMap, setGhiChuMap] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const filtered = rows.filter((r) => !chiChoDuyet || r.trang_thai === "Chờ duyệt");

  async function handleDuyet(row: DonNghiPhep, trangThai: "Đã duyệt" | "Từ chối") {
    setSavingId(row.id);
    const { data, error } = await supabase
      .from("don_xin_nghi_phep")
      .update({
        trang_thai: trangThai,
        nguoi_duyet_id: currentNhanVienId ?? null,
        thoi_gian_duyet: new Date().toISOString(),
        ghi_chu_duyet: ghiChuMap[row.id]?.trim() || null,
      })
      .eq("id", row.id)
      .select("*, nhan_vien:nhan_vien_id(ho_ten)")
      .single();
    setSavingId(null);
    if (error) {
      window.alert(error.message);
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === row.id ? (data as DonNghiPhep) : r)));
  }

  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900">Duyệt đơn xin nghỉ phép</h2>
        <label className="flex items-center gap-1.5 text-xs text-slate-600">
          <input type="checkbox" checked={chiChoDuyet} onChange={(e) => setChiChoDuyet(e.target.checked)} />
          Chỉ hiện chờ duyệt
        </label>
      </div>

      <div className="flex flex-col gap-2">
        {filtered.map((r) => {
          const nv = one(r.nhan_vien);
          return (
            <div key={r.id} className="rounded-lg border border-slate-100 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-slate-800">
                  {nv?.ho_ten ?? "—"} · {r.ngay_bat_dau === r.ngay_ket_thuc ? r.ngay_bat_dau : `${r.ngay_bat_dau} → ${r.ngay_ket_thuc}`}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TRANG_THAI_COLOR[r.trang_thai]}`}>{r.trang_thai}</span>
              </div>
              {r.ly_do && <p className="mt-1 text-slate-500">Lý do: {r.ly_do}</p>}
              {r.trang_thai === "Chờ duyệt" ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <input
                    value={ghiChuMap[r.id] ?? ""}
                    onChange={(e) => setGhiChuMap((p) => ({ ...p, [r.id]: e.target.value }))}
                    placeholder="Ghi chú (không bắt buộc)"
                    className="min-w-0 flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    disabled={savingId === r.id}
                    onClick={() => handleDuyet(r, "Đã duyệt")}
                    className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
                  >
                    Duyệt
                  </button>
                  <button
                    disabled={savingId === r.id}
                    onClick={() => handleDuyet(r, "Từ chối")}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
                  >
                    Từ chối
                  </button>
                </div>
              ) : (
                r.ghi_chu_duyet && <p className="mt-1 text-xs text-slate-400">Ghi chú: {r.ghi_chu_duyet}</p>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && <p className="py-4 text-center text-sm text-slate-400">Không có đơn nào.</p>}
      </div>
    </div>
  );
}
