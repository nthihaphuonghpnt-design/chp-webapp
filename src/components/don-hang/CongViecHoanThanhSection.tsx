"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type TrangThai = "Chưa hoàn thành" | "Đã hoàn thành" | "Đã tiếp nhận";

export interface CongViecEntry {
  nhanVienId: string;
  hoTen: string;
  vaiTro: string;
  trangThai: TrangThai;
}

const TRANG_THAI_COLOR: Record<TrangThai, string> = {
  "Chưa hoàn thành": "bg-slate-100 text-slate-600",
  "Đã hoàn thành": "bg-amber-100 text-amber-700",
  "Đã tiếp nhận": "bg-green-100 text-green-700",
};

export default function CongViecHoanThanhSection({
  donHangId,
  initialEntries,
  currentUserId,
  currentPhongBan,
}: {
  donHangId: string;
  initialEntries: CongViecEntry[];
  currentUserId?: string;
  currentPhongBan: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [entries, setEntries] = useState(initialEntries);
  const [busy, setBusy] = useState<string | null>(null);

  const isKeToanOrGiamDoc = currentPhongBan === "Kế toán" || currentPhongBan === "Giám đốc";

  if (entries.length === 0) return null;

  async function handleHoanThanh() {
    setBusy("self");
    const { error } = await supabase.rpc("hoan_thanh_cong_viec", { p_don_hang_id: donHangId });
    setBusy(null);
    if (error) {
      window.alert(error.message);
      return;
    }
    setEntries((prev) => prev.map((e) => (e.nhanVienId === currentUserId ? { ...e, trangThai: "Đã hoàn thành" } : e)));
  }

  async function handleTiepNhan(entry: CongViecEntry) {
    setBusy(entry.nhanVienId);
    const { error } = await supabase.rpc("tiep_nhan_ke_toan", { p_don_hang_id: donHangId, p_nhan_vien_id: entry.nhanVienId });
    setBusy(null);
    if (error) {
      window.alert(error.message);
      return;
    }
    setEntries((prev) => prev.map((e) => (e.nhanVienId === entry.nhanVienId ? { ...e, trangThai: "Đã tiếp nhận" } : e)));
  }

  async function handleMoLai(entry: CongViecEntry) {
    const lyDo = window.prompt(`Lý do mở lại phần việc của ${entry.hoTen}?`);
    if (lyDo === null) return;
    if (!lyDo.trim()) {
      window.alert("Phải nhập lý do khi mở lại.");
      return;
    }
    setBusy(entry.nhanVienId);
    const { error } = await supabase.rpc("mo_lai_cong_viec", {
      p_don_hang_id: donHangId,
      p_nhan_vien_id: entry.nhanVienId,
      p_ly_do: lyDo.trim(),
    });
    setBusy(null);
    if (error) {
      window.alert(error.message);
      return;
    }
    setEntries((prev) => prev.map((e) => (e.nhanVienId === entry.nhanVienId ? { ...e, trangThai: "Đã hoàn thành" } : e)));
  }

  return (
    <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 text-sm">
      <p className="mb-2 font-medium text-slate-900">Hoàn thành công việc / Kế toán tiếp nhận</p>
      <div className="flex flex-col gap-2">
        {entries.map((entry) => (
          <div key={entry.nhanVienId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
            <span>
              <span className="text-slate-500">{entry.vaiTro}:</span> <span className="font-medium text-slate-900">{entry.hoTen}</span>
            </span>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${TRANG_THAI_COLOR[entry.trangThai]}`}>{entry.trangThai}</span>
              {currentUserId === entry.nhanVienId && entry.trangThai === "Chưa hoàn thành" && (
                <button
                  disabled={busy === "self"}
                  onClick={handleHoanThanh}
                  className="text-xs font-medium text-blue-600 disabled:opacity-50"
                >
                  Xác nhận hoàn thành
                </button>
              )}
              {isKeToanOrGiamDoc && entry.trangThai === "Đã hoàn thành" && (
                <button
                  disabled={busy === entry.nhanVienId}
                  onClick={() => handleTiepNhan(entry)}
                  className="text-xs font-medium text-green-600 disabled:opacity-50"
                >
                  Tiếp nhận
                </button>
              )}
              {isKeToanOrGiamDoc && entry.trangThai === "Đã tiếp nhận" && (
                <button
                  disabled={busy === entry.nhanVienId}
                  onClick={() => handleMoLai(entry)}
                  className="text-xs font-medium text-red-600 disabled:opacity-50"
                >
                  Mở lại
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
