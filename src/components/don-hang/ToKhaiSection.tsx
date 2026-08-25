"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import MoneyInput from "@/components/common/MoneyInput";
import FileAttachSection from "@/components/common/FileAttachSection";
import type { DinhKem, ToKhaiHaiQuan } from "@/types/database";

const LOAI_HINH = ["Nhập kinh doanh", "Nhập ủy thác", "Xuất kinh doanh", "Xuất ủy thác", "Tạm nhập tái xuất", "Khác"];
const LUONG = ["Xanh", "Vàng", "Đỏ"];
const TRANG_THAI = ["Đang mở tờ khai", "Chờ kiểm hóa", "Đã thông quan", "Giải phóng hàng"];
const AI_DONG_THUE = ["Khách hàng tự đóng", "CHP đóng hộ"];

const LUONG_COLOR: Record<string, string> = {
  Xanh: "bg-green-100 text-green-700",
  Vàng: "bg-amber-100 text-amber-700",
  Đỏ: "bg-red-100 text-red-700",
};

function makeUploadPath(toKhaiId: string, index: number, fileName: string) {
  return `to-khai/${toKhaiId}/${Date.now()}-${index}-${fileName}`;
}

export default function ToKhaiSection({
  donHangId,
  initialRows,
  dinhKemRows,
  canEdit,
  currentUserId,
}: {
  donHangId: string;
  initialRows: ToKhaiHaiQuan[];
  dinhKemRows: DinhKem[];
  canEdit: boolean;
  currentUserId?: string;
}) {
  const supabase = createClient();
  const [rows, setRows] = useState<ToKhaiHaiQuan[]>(initialRows);
  const [dinhKem, setDinhKem] = useState<DinhKem[]>(dinhKemRows);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ToKhaiHaiQuan | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave(values: Record<string, string>, pendingFiles: File[]) {
    setSaving(true);
    const payload: Record<string, unknown> = {
      don_hang_id: donHangId,
      so_to_khai: values.so_to_khai || null,
      ngay_mo_to_khai: values.ngay_mo_to_khai || null,
      loai_hinh_xnk: values.loai_hinh_xnk || null,
      chi_cuc_hai_quan: values.chi_cuc_hai_quan || null,
      luong_to_khai: values.luong_to_khai || null,
      thue_nhap_khau: values.thue_nhap_khau ? Number(values.thue_nhap_khau) : null,
      thue_vat_nk: values.thue_vat_nk ? Number(values.thue_vat_nk) : null,
      thue_khac: values.thue_khac ? Number(values.thue_khac) : null,
      ngay_thong_quan: values.ngay_thong_quan || null,
      trang_thai: values.trang_thai || "Đang mở tờ khai",
      ai_dong_thue: values.ai_dong_thue || "Khách hàng tự đóng",
    };

    let toKhaiId = editing?.id;

    if (editing) {
      const { data, error } = await supabase.from("to_khai_hai_quan").update(payload).eq("id", editing.id).select().single();
      if (error) {
        window.alert(error.message);
        setSaving(false);
        return;
      }
      setRows((prev) => prev.map((r) => (r.id === editing.id ? (data as ToKhaiHaiQuan) : r)));
    } else {
      const { data, error } = await supabase.from("to_khai_hai_quan").insert(payload).select().single();
      if (error) {
        window.alert(error.message);
        setSaving(false);
        return;
      }
      toKhaiId = data.id;
      setRows((prev) => [...prev, data as ToKhaiHaiQuan]);
    }

    if (toKhaiId && pendingFiles.length > 0) {
      for (let i = 0; i < pendingFiles.length; i++) {
        const file = pendingFiles[i];
        const path = makeUploadPath(toKhaiId, i, file.name);
        const { error: uploadErr } = await supabase.storage.from("dinh-kem").upload(path, file);
        if (uploadErr) {
          window.alert(`Tải file "${file.name}" thất bại: ${uploadErr.message}`);
          continue;
        }
        const { data: dk } = await supabase
          .from("dinh_kem")
          .insert({
            to_khai_id: toKhaiId,
            don_hang_id: donHangId,
            lien_ket_toi: "Thông quan",
            loai_dinh_kem: "Khác",
            duong_dan_file: path,
            ten_file: file.name,
            nguoi_upload_id: currentUserId ?? null,
          })
          .select()
          .single();
        if (dk) setDinhKem((prev) => [dk as DinhKem, ...prev]);
      }
    }

    setSaving(false);
    setShowForm(false);
  }

  async function handleDelete(row: ToKhaiHaiQuan) {
    if (!window.confirm("Xóa tờ khai này?")) return;
    const { error } = await supabase.from("to_khai_hai_quan").delete().eq("id", row.id);
    if (!error) setRows((prev) => prev.filter((r) => r.id !== row.id));
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Tờ khai hải quan</h2>
        {canEdit && (
          <button
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
            className="text-sm font-medium text-blue-600"
          >
            + Thêm tờ khai
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {rows.map((row) => (
          <div key={row.id} className="rounded-lg border border-slate-100 p-3 text-sm">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-slate-900">{row.so_to_khai || "Chưa có số tờ khai"}</span>
              <div className="flex gap-2">
                {row.luong_to_khai && (
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${LUONG_COLOR[row.luong_to_khai]}`}>
                    Luồng {row.luong_to_khai}
                  </span>
                )}
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">{row.trang_thai}</span>
              </div>
            </div>
            <p className="text-slate-600">
              {row.loai_hinh_xnk ?? "—"} {row.chi_cuc_hai_quan ? `· ${row.chi_cuc_hai_quan}` : ""}
            </p>
            <p className="text-slate-500">
              Mở: {row.ngay_mo_to_khai ?? "—"} · Thông quan: {row.ngay_thong_quan ?? "—"}
            </p>
            {(row.thue_nhap_khau || row.thue_vat_nk || row.thue_khac) && (
              <p className="text-slate-500">
                Thuế NK: {row.thue_nhap_khau ?? 0} · VAT NK: {row.thue_vat_nk ?? 0} · Thuế khác: {row.thue_khac ?? 0}
                {" · "}
                <span className={row.ai_dong_thue === "CHP đóng hộ" ? "font-medium text-amber-600" : ""}>{row.ai_dong_thue}</span>
              </p>
            )}
            <FileAttachSection
              parentField="to_khai_id"
              parentId={row.id}
              pathPrefix="to-khai"
              lienKetToi="Thông quan"
              initialRows={dinhKem.filter((d) => d.to_khai_id === row.id)}
              canUpload={canEdit}
              currentUserId={currentUserId}
              donHangId={donHangId}
            />
            {canEdit && (
              <div className="mt-2 flex gap-3">
                <button
                  onClick={() => {
                    setEditing(row);
                    setShowForm(true);
                  }}
                  className="text-xs font-medium text-blue-600"
                >
                  Sửa
                </button>
                <button onClick={() => handleDelete(row)} className="text-xs font-medium text-red-600">
                  Xóa
                </button>
              </div>
            )}
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm text-slate-400">Chưa có tờ khai nào.</p>}
      </div>

      {showForm && <ToKhaiForm initial={editing} saving={saving} onCancel={() => setShowForm(false)} onSave={handleSave} />}
    </div>
  );
}

function ToKhaiForm({
  initial,
  saving,
  onCancel,
  onSave,
}: {
  initial: ToKhaiHaiQuan | null;
  saving: boolean;
  onCancel: () => void;
  onSave: (values: Record<string, string>, pendingFiles: File[]) => void;
}) {
  const [values, setValues] = useState({
    so_to_khai: initial?.so_to_khai ?? "",
    ngay_mo_to_khai: initial?.ngay_mo_to_khai ?? "",
    loai_hinh_xnk: initial?.loai_hinh_xnk ?? "",
    chi_cuc_hai_quan: initial?.chi_cuc_hai_quan ?? "",
    luong_to_khai: initial?.luong_to_khai ?? "",
    thue_nhap_khau: initial?.thue_nhap_khau?.toString() ?? "",
    thue_vat_nk: initial?.thue_vat_nk?.toString() ?? "",
    thue_khac: initial?.thue_khac?.toString() ?? "",
    ngay_thong_quan: initial?.ngay_thong_quan ?? "",
    trang_thai: initial?.trang_thai ?? "Đang mở tờ khai",
    ai_dong_thue: initial?.ai_dong_thue ?? "Khách hàng tự đóng",
  });
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  function set(key: keyof typeof values, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function addFiles(files: FileList | null) {
    if (!files) return;
    setPendingFiles((prev) => [...prev, ...Array.from(files)]);
  }

  function removePendingFile(idx: number) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  const cls = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(values, pendingFiles);
        }}
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-lg sm:rounded-2xl"
      >
        <h2 className="mb-4 text-lg font-semibold text-slate-900">{initial ? "Sửa tờ khai" : "Thêm tờ khai"}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Số tờ khai</label>
            <input value={values.so_to_khai} onChange={(e) => set("so_to_khai", e.target.value)} className={cls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Ngày mở tờ khai</label>
            <input type="date" value={values.ngay_mo_to_khai} onChange={(e) => set("ngay_mo_to_khai", e.target.value)} className={cls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Loại hình XNK</label>
            <select value={values.loai_hinh_xnk} onChange={(e) => set("loai_hinh_xnk", e.target.value)} className={cls}>
              <option value="">-- Chọn --</option>
              {LOAI_HINH.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Chi cục hải quan</label>
            <input value={values.chi_cuc_hai_quan} onChange={(e) => set("chi_cuc_hai_quan", e.target.value)} className={cls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Luồng tờ khai</label>
            <select value={values.luong_to_khai} onChange={(e) => set("luong_to_khai", e.target.value)} className={cls}>
              <option value="">-- Chọn --</option>
              {LUONG.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Trạng thái</label>
            <select value={values.trang_thai} onChange={(e) => set("trang_thai", e.target.value)} className={cls}>
              {TRANG_THAI.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Thuế nhập khẩu</label>
            <MoneyInput value={values.thue_nhap_khau} onChange={(v) => set("thue_nhap_khau", v)} className={cls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Thuế VAT NK</label>
            <MoneyInput value={values.thue_vat_nk} onChange={(v) => set("thue_vat_nk", v)} className={cls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Thuế khác</label>
            <MoneyInput value={values.thue_khac} onChange={(v) => set("thue_khac", v)} className={cls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Ngày thông quan</label>
            <input type="date" value={values.ngay_thong_quan} onChange={(e) => set("ngay_thong_quan", e.target.value)} className={cls} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Ai đóng thuế NK/VAT/khác?</label>
            <select value={values.ai_dong_thue} onChange={(e) => set("ai_dong_thue", e.target.value)} className={cls}>
              {AI_DONG_THUE.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-400">
              Nếu chọn &quot;CHP đóng hộ&quot;, hệ thống tự tạo dòng Chi hộ tương ứng trong Chi phí phát
              sinh để tính đúng công nợ phải thu (gồm cả VAT).
            </p>
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-sm font-medium text-slate-700">Đính kèm chứng từ / hình ảnh</label>
          <label className="inline-block cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700">
            + Chọn file
            <input type="file" accept="image/*,.pdf" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
          </label>
          {pendingFiles.length > 0 && (
            <ul className="mt-2 flex flex-col gap-1">
              {pendingFiles.map((f, i) => (
                <li key={i} className="flex items-center justify-between rounded-lg bg-slate-50 px-2 py-1 text-xs text-slate-600">
                  <span className="truncate">{f.name}</span>
                  <button type="button" onClick={() => removePendingFile(i)} className="ml-2 text-red-500">
                    Xóa
                  </button>
                </li>
              ))}
            </ul>
          )}
          {initial && (
            <p className="mt-1 text-xs text-slate-400">File đã đính kèm trước đó xem/thêm ở ngoài thẻ tờ khai sau khi lưu.</p>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <button type="button" onClick={onCancel} className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700">
            Hủy
          </button>
          <button type="submit" disabled={saving} className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60">
            {saving ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </form>
    </div>
  );
}
