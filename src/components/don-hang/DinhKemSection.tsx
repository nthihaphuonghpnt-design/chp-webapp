"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DinhKem } from "@/types/database";

const LIEN_KET_TOI = [
  "Tiếp nhận",
  "Làm thủ tục",
  "Thông quan",
  "Giao hàng",
  "Hoàn tất",
  "Chi phí phát sinh",
  "Chi tiết vận chuyển",
  "Thuê ngoài",
];

const LOAI_DINH_KEM = [
  "Ảnh hàng hóa tại cảng",
  "Ảnh container/seal",
  "Chứng từ thông quan",
  "Hóa đơn/chứng từ chi phí",
  "Khác",
];

export default function DinhKemSection({
  donHangId,
  initialRows,
  currentUserId,
}: {
  donHangId: string;
  initialRows: DinhKem[];
  currentUserId?: string;
}) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<DinhKem[]>(initialRows);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [lienKetToi, setLienKetToi] = useState("Tiếp nhận");
  const [loaiDinhKem, setLoaiDinhKem] = useState("Khác");

  useEffect(() => {
    async function loadUrls() {
      const entries = await Promise.all(
        rows.map(async (r) => {
          const { data } = await supabase.storage.from("dinh-kem").createSignedUrl(r.duong_dan_file, 3600);
          return [r.id, data?.signedUrl ?? ""] as const;
        })
      );
      setUrls(Object.fromEntries(entries));
    }
    if (rows.length > 0) loadUrls();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.length]);

  async function handleUpload(file: File) {
    setUploading(true);
    const path = `${donHangId}/${Date.now()}-${file.name}`;
    const { error: uploadErr } = await supabase.storage.from("dinh-kem").upload(path, file);
    if (uploadErr) {
      window.alert(`Tải file thất bại: ${uploadErr.message}`);
      setUploading(false);
      return;
    }

    const { data, error: insertErr } = await supabase
      .from("dinh_kem")
      .insert({
        don_hang_id: donHangId,
        lien_ket_toi: lienKetToi,
        loai_dinh_kem: loaiDinhKem,
        duong_dan_file: path,
        ten_file: file.name,
        nguoi_upload_id: currentUserId ?? null,
      })
      .select()
      .single();

    setUploading(false);
    if (insertErr) {
      window.alert(`Lưu thông tin file thất bại: ${insertErr.message}`);
      return;
    }
    setRows((prev) => [data as DinhKem, ...prev]);
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-slate-900">Đính kèm ảnh / chứng từ</h2>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <select value={lienKetToi} onChange={(e) => setLienKetToi(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs">
          {LIEN_KET_TOI.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
        <select value={loaiDinhKem} onChange={(e) => setLoaiDinhKem(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs">
          {LOAI_DINH_KEM.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-60"
        >
          {uploading ? "Đang tải lên..." : "📎 Chụp ảnh / Đính kèm"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
            e.target.value = "";
          }}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {rows.map((r) => (
          <a
            key={r.id}
            href={urls[r.id] || "#"}
            target="_blank"
            rel="noreferrer"
            className="block rounded-lg border border-slate-100 p-2 text-xs hover:border-blue-300"
          >
            {r.ten_file?.match(/\.(png|jpe?g|gif|webp)$/i) ? (
              <img src={urls[r.id]} alt={r.ten_file ?? ""} className="mb-1 h-20 w-full rounded object-cover" />
            ) : (
              <div className="mb-1 flex h-20 w-full items-center justify-center rounded bg-slate-50 text-2xl">📄</div>
            )}
            <p className="truncate text-slate-700">{r.ten_file}</p>
            <p className="truncate text-slate-400">{r.loai_dinh_kem}</p>
          </a>
        ))}
        {rows.length === 0 && <p className="col-span-full text-sm text-slate-400">Chưa có file đính kèm.</p>}
      </div>
    </div>
  );
}
