"use client";

import { useEffect, useRef, useState } from "react";
import JSZip from "jszip";
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
  soDonHang,
  initialRows,
  currentUserId,
  canUpload,
}: {
  donHangId: string;
  soDonHang?: string;
  initialRows: DinhKem[];
  currentUserId?: string;
  canUpload: boolean;
}) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<DinhKem[]>(initialRows);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [lienKetToi, setLienKetToi] = useState("Tiếp nhận");
  const [loaiDinhKem, setLoaiDinhKem] = useState("Khác");
  // Mac dinh chon het moi file de "Tai xuong" la bam duoc ngay, khong bat
  // phai tu chon tung file — bo chon rieng file nao khong muon gom vao zip.
  // Cap nhat truc tiep tai noi rows thay doi (handleUpload/handleDelete) thay
  // vi dung useEffect rieng dong bo theo rows.length — tranh setState long
  // trong effect (cascading render) va giu duoc lua chon thu cong cua nguoi
  // dung khi chi co 1 file duoc them/xoa, khong reset sach het moi lan.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(initialRows.map((r) => r.id)));
  const [zipping, setZipping] = useState(false);

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleChonHet() {
    setSelectedIds((prev) => (prev.size === rows.length ? new Set() : new Set(rows.map((r) => r.id))));
  }

  async function handleDownloadZip() {
    const chon = rows.filter((r) => selectedIds.has(r.id));
    if (chon.length === 0) {
      window.alert("Chưa chọn file nào để tải.");
      return;
    }
    setZipping(true);
    try {
      const zip = new JSZip();
      const tenDaDung = new Set<string>();
      const loi: string[] = [];
      for (const r of chon) {
        const url = urls[r.id];
        if (!url) {
          loi.push(r.ten_file ?? r.id);
          continue;
        }
        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const blob = await res.blob();
          // Trung ten file (vd nhieu lan chup "IMG_0001.jpg") thi them hau to
          // de khong ghi de nhau trong zip.
          let ten = r.ten_file || r.id;
          let dem = 2;
          while (tenDaDung.has(ten)) {
            const cham = (r.ten_file ?? r.id).lastIndexOf(".");
            ten = cham > 0 ? `${(r.ten_file ?? r.id).slice(0, cham)} (${dem})${(r.ten_file ?? r.id).slice(cham)}` : `${r.ten_file ?? r.id} (${dem})`;
            dem++;
          }
          tenDaDung.add(ten);
          zip.file(ten, blob);
        } catch {
          loi.push(r.ten_file ?? r.id);
        }
      }
      if (Object.keys(zip.files).length === 0) {
        window.alert("Không tải được file nào — thử lại sau.");
        return;
      }
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      const objectUrl = URL.createObjectURL(zipBlob);
      a.href = objectUrl;
      a.download = `dinh-kem-${soDonHang || donHangId}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
      if (loi.length > 0) {
        window.alert(`Không tải được ${loi.length} file: ${loi.join(", ")}. Các file còn lại đã gộp vào file zip.`);
      }
    } finally {
      setZipping(false);
    }
  }

  useEffect(() => {
    async function loadUrls() {
      // 1 request createSignedUrls (batch) thay vi N request createSignedUrl
      // rieng le cho tung file dinh kem — don hang cang nhieu anh/chung tu
      // dinh kem thi cang cham khi mo trang chi tiet, day la nguyen nhan
      // chinh gay cam giac "chon don hang de nhap thong tin cham".
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
    // Upload tung file 1 (khong Promise.all song song) — tranh dung 1 luc
    // nhieu ket noi Storage tren mang di dong yeu, va giu dung thu tu hien
    // len danh sach.
    for (const file of Array.from(files)) {
      const path = `${donHangId}/${Date.now()}-${file.name}`;
      const { error: uploadErr } = await supabase.storage.from("dinh-kem").upload(path, file);
      if (uploadErr) {
        window.alert(`Tải file "${file.name}" thất bại: ${uploadErr.message}`);
        continue;
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

      if (insertErr) {
        window.alert(`Lưu thông tin file "${file.name}" thất bại: ${insertErr.message}`);
        continue;
      }
      setRows((prev) => [data as DinhKem, ...prev]);
      setSelectedIds((prev) => new Set(prev).add((data as DinhKem).id));
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
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(row.id);
      return next;
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-slate-900">Đính kèm ảnh / chứng từ</h2>

      {canUpload && (
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
      )}

      {rows.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-3 text-xs">
          <label className="flex items-center gap-1 text-slate-600">
            <input type="checkbox" checked={selectedIds.size === rows.length} onChange={toggleChonHet} />
            Chọn tất cả ({selectedIds.size}/{rows.length})
          </label>
          <button
            type="button"
            onClick={handleDownloadZip}
            disabled={zipping || selectedIds.size === 0}
            className="rounded-lg border border-blue-300 px-2.5 py-1.5 font-medium text-blue-700 disabled:opacity-60"
          >
            {zipping ? "Đang nén..." : `⬇ Tải xuống (.zip) — ${selectedIds.size} file`}
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {rows.map((r) => (
          <div key={r.id} className="relative">
            <input
              type="checkbox"
              checked={selectedIds.has(r.id)}
              onChange={() => toggleSelected(r.id)}
              className="absolute left-1 top-1 z-10 h-4 w-4"
              title="Chọn để tải hàng loạt"
            />
            <a
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
        {rows.length === 0 && <p className="col-span-full text-sm text-slate-400">Chưa có file đính kèm.</p>}
      </div>
    </div>
  );
}
