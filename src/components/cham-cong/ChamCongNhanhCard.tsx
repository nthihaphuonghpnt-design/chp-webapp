"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { homNayVN } from "@/lib/chamCong";

export default function ChamCongNhanhCard({ nhanVienId }: { nhanVienId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [daCham, setDaCham] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (daCham) return null;

  async function handleChamCong() {
    setSaving(true);
    setError(null);
    const { error: err } = await supabase
      .from("cham_cong")
      .insert({ nhan_vien_id: nhanVienId, ngay: homNayVN(), trang_thai: "Đi làm" });
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setDaCham(true);
  }

  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm font-medium text-amber-800 shadow-sm">
      <span>⏰ Bạn chưa chấm công hôm nay{error ? ` — ${error}` : " — bấm để chấm công ngay."}</span>
      <button
        onClick={handleChamCong}
        disabled={saving}
        className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
      >
        {saving ? "Đang lưu..." : "Chấm công"}
      </button>
    </div>
  );
}
