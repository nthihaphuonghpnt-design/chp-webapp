"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import MarkdownLiteView from "@/components/common/MarkdownLiteView";

export default function NoiQuyView({
  id,
  noiDungBanDau,
  ngayApDung,
  canEdit,
}: {
  id: string | null;
  noiDungBanDau: string;
  ngayApDung: string | null;
  canEdit: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [dangSua, setDangSua] = useState(false);
  const [noiDung, setNoiDung] = useState(noiDungBanDau);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function luu() {
    setSaving(true);
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: nv } = await supabase.from("nhan_vien").select("id").eq("auth_user_id", user?.id).single();

    const { error: err } = id
      ? await supabase.from("noi_quy_cong_ty").update({ noi_dung: noiDung, nguoi_cap_nhat_id: nv?.id }).eq("id", id)
      : await supabase.from("noi_quy_cong_ty").insert({ noi_dung: noiDung, nguoi_cap_nhat_id: nv?.id, ngay_ap_dung: new Date().toISOString().slice(0, 10) });

    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setDangSua(false);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Nội quy công ty</h1>
        {canEdit && !dangSua && (
          <button onClick={() => setDangSua(true)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700">
            Sửa nội dung
          </button>
        )}
      </div>

      {ngayApDung && !dangSua && <p className="mb-4 text-xs text-slate-400">Cập nhật lần gần nhất: {ngayApDung}</p>}

      {dangSua ? (
        <div>
          <textarea
            value={noiDung}
            onChange={(e) => setNoiDung(e.target.value)}
            rows={30}
            className="w-full rounded-lg border border-slate-300 p-3 font-mono text-sm"
          />
          <p className="mt-1 text-xs text-slate-400">
            Định dạng đơn giản: dòng bắt đầu bằng # / ## / ### là tiêu đề, --- là đường kẻ ngang, dòng | cột | cột | là bảng, *chữ* là in nghiêng.
          </p>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <div className="mt-3 flex gap-3">
            <button onClick={luu} disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60">
              {saving ? "Đang lưu..." : "Lưu"}
            </button>
            <button
              onClick={() => {
                setDangSua(false);
                setNoiDung(noiDungBanDau);
                setError(null);
              }}
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm"
            >
              Hủy
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <MarkdownLiteView content={noiDungBanDau} />
        </div>
      )}
    </div>
  );
}
