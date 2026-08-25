"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DinhKem } from "@/types/database";

export default function FileAttachSection({
  parentField,
  parentId,
  pathPrefix,
  lienKetToi,
  initialRows,
  canUpload,
  currentUserId,
  donHangId,
}: {
  parentField: "hop_dong_id" | "hoa_don_id" | "to_khai_id";
  parentId: string;
  pathPrefix: string;
  lienKetToi: "Hợp đồng" | "Hóa đơn" | "Thông quan";
  initialRows: DinhKem[];
  canUpload: boolean;
  currentUserId?: string;
  /** Neu co, gan them don_hang_id de file nay cung hien trong tap chung tu cua don hang. */
  donHangId?: string;
}) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<DinhKem[]>(initialRows);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);

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
    const path = `${pathPrefix}/${parentId}/${Date.now()}-${file.name}`;
    const { error: uploadErr } = await supabase.storage.from("dinh-kem").upload(path, file);
    if (uploadErr) {
      window.alert(`Tải file thất bại: ${uploadErr.message}`);
      setUploading(false);
      return;
    }

    const { data, error: insertErr } = await supabase
      .from("dinh_kem")
      .insert({
        [parentField]: parentId,
        ...(donHangId ? { don_hang_id: donHangId } : {}),
        lien_ket_toi: lienKetToi,
        loai_dinh_kem: "Khác",
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
    <div className="mt-2 border-t border-slate-100 pt-2">
      <div className="mb-1 flex items-center justify-between">
        <p className="text-xs font-medium text-slate-500">Tài liệu / hình ảnh đính kèm</p>
        {canUpload && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="text-xs font-medium text-blue-600 disabled:opacity-60"
          >
            {uploading ? "Đang tải..." : "+ Đính kèm"}
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
            e.target.value = "";
          }}
        />
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-slate-400">Chưa có file đính kèm.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {rows.map((r) => (
            <a
              key={r.id}
              href={urls[r.id] || "#"}
              target="_blank"
              rel="noreferrer"
              className="block rounded-lg border border-slate-100 p-1.5 text-xs hover:border-blue-300"
            >
              {r.ten_file?.match(/\.(png|jpe?g|gif|webp)$/i) ? (
                <img src={urls[r.id]} alt={r.ten_file ?? ""} className="mb-1 h-14 w-full rounded object-cover" />
              ) : (
                <div className="mb-1 flex h-14 w-full items-center justify-center rounded bg-slate-50 text-xl">📄</div>
              )}
              <p className="truncate text-slate-600">{r.ten_file}</p>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
