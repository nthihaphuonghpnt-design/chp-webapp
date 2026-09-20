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
  parentField: "hop_dong_id" | "hoa_don_id" | "to_khai_id" | "hop_dong_nhan_vien_id";
  parentId: string;
  pathPrefix: string;
  lienKetToi: "Hợp đồng" | "Hóa đơn" | "Thông quan" | "Hợp đồng nhân viên";
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
      // 1 request createSignedUrls (batch) thay vi N request rieng le —
      // xem DinhKemSection.tsx, cung 1 nguyen nhan gay cham khi mo trang.
      const { data } = await supabase.storage
        .from("dinh-kem")
        .createSignedUrls(rows.map((r) => r.duong_dan_file), 3600);
      const entries = rows.map((r, i) => [r.id, data?.[i]?.signedUrl ?? ""] as const);
      setUrls(Object.fromEntries(entries));
    }
    if (rows.length > 0) loadUrls();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.length]);

  async function handleUpload(files: FileList) {
    setUploading(true);
    for (const file of Array.from(files)) {
      const path = `${pathPrefix}/${parentId}/${Date.now()}-${file.name}`;
      const { error: uploadErr } = await supabase.storage.from("dinh-kem").upload(path, file);
      if (uploadErr) {
        window.alert(`Tải file "${file.name}" thất bại: ${uploadErr.message}`);
        continue;
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

      if (insertErr) {
        window.alert(`Lưu thông tin file "${file.name}" thất bại: ${insertErr.message}`);
        continue;
      }
      setRows((prev) => [data as DinhKem, ...prev]);
    }
    setUploading(false);
  }

  async function handleDelete(row: DinhKem) {
    if (!window.confirm(`Xóa file "${row.ten_file}"?`)) return;
    const { error: delErr } = await supabase.from("dinh_kem").delete().eq("id", row.id);
    if (delErr) {
      window.alert(`Xóa thất bại: ${delErr.message}`);
      return;
    }
    await supabase.storage.from("dinh-kem").remove([row.duong_dan_file]);
    setRows((prev) => prev.filter((r) => r.id !== row.id));
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
          accept="image/*,.pdf,.xls,.xlsx,.doc,.docx"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = e.target.files;
            if (files && files.length > 0) handleUpload(files);
            e.target.value = "";
          }}
        />
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-slate-400">Chưa có file đính kèm.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {rows.map((r) => (
            <div key={r.id} className="relative">
              <a
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
              {canUpload && (
                <button
                  type="button"
                  onClick={() => handleDelete(r)}
                  title="Xóa file"
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-red-600 shadow"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
