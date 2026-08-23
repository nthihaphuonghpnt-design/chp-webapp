"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ConfirmButtons({
  donHangId,
  opsXacNhan,
  csXacNhan,
  phongBan,
}: {
  donHangId: string;
  opsXacNhan: boolean;
  csXacNhan: boolean;
  phongBan: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle(field: "ops_xac_nhan" | "cs_xac_nhan", current: boolean) {
    setSaving(true);
    setError(null);
    const { error: err } = await supabase
      .from("don_hang")
      .update({ [field]: !current })
      .eq("id", donHangId);
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.refresh();
  }

  const canOps = phongBan === "Hiện trường";
  const canCs = phongBan === "Chứng từ";

  if (!canOps && !canCs) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
      {canOps && (
        <button
          disabled={saving}
          onClick={() => toggle("ops_xac_nhan", opsXacNhan)}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            opsXacNhan ? "bg-green-100 text-green-700" : "bg-blue-600 text-white"
          }`}
        >
          {opsXacNhan ? "✓ Hiện trường đã xác nhận hoàn thành" : "Xác nhận hoàn thành (Hiện trường)"}
        </button>
      )}
      {canCs && (
        <button
          disabled={saving}
          onClick={() => toggle("cs_xac_nhan", csXacNhan)}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            csXacNhan ? "bg-green-100 text-green-700" : "bg-blue-600 text-white"
          }`}
        >
          {csXacNhan ? "✓ Chứng từ đã xác nhận hoàn thành" : "Xác nhận hoàn thành (Chứng từ)"}
        </button>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
