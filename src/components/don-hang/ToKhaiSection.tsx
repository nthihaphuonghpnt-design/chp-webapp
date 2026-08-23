"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ToKhaiHaiQuan } from "@/types/database";

const LOAI_HINH = ["Nhập kinh doanh", "Nhập ủy thác", "Xuất kinh doanh", "Xuất ủy thác", "Tạm nhập tái xuất", "Khác"];
const LUONG = ["Xanh", "Vàng", "Đỏ"];
const TRANG_THAI = ["Đang mở tờ khai", "Chờ kiểm hóa", "Đã thông quan", "Giải phóng hàng"];

const LUONG_COLOR: Record<string, string> = {
  Xanh: "bg-green-100 text-green-700",
  Vàng: "bg-amber-100 text-amber-700",
  Đỏ: "bg-red-100 text-red-700",
};

export default function ToKhaiSection({
  donHangId,
  initialRows,
  canEdit,
}: {
  donHangId: string;
  initialRows: ToKhaiHaiQuan[];
  canEdit: boolean;
}) {
  const supabase = createClient();
  const [rows, setRows] = useState<ToKhaiHaiQuan[]>(initialRows);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ToKhaiHaiQuan | null>(null);

  async function handleSave(values: Record<string, string>) {
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
    };

    if (editing) {
      const { data, error } = await supabase
        .from("to_khai_hai_quan")
        .update(payload)
        .eq("id", editing.id)
        .select()
        .single();
      if (!error && data) {
        setRows((prev) => prev.map((r) => (r.id === editing.id ? (data as ToKhaiHaiQuan) : r)));
        setShowForm(false);
      }
    } else {
      const { data, error } = await supabase.from("to_khai_hai_quan").insert(payload).select().single();
      if (!error && data) {
        setRows((prev) => [...prev, data as ToKhaiHaiQuan]);
        setShowForm(false);
      }
    }
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
              </p>
            )}
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

      {showForm && <ToKhaiForm initial={editing} onCancel={() => setShowForm(false)} onSave={handleSave} />}
    </div>
  );
}

function ToKhaiForm({
  initial,
  onCancel,
  onSave,
}: {
  initial: ToKhaiHaiQuan | null;
  onCancel: () => void;
  onSave: (values: Record<string, string>) => void;
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
  });

  function set(key: keyof typeof values, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  const cls = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(values);
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
            <input type="number" step="any" value={values.thue_nhap_khau} onChange={(e) => set("thue_nhap_khau", e.target.value)} className={cls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Thuế VAT NK</label>
            <input type="number" step="any" value={values.thue_vat_nk} onChange={(e) => set("thue_vat_nk", e.target.value)} className={cls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Thuế khác</label>
            <input type="number" step="any" value={values.thue_khac} onChange={(e) => set("thue_khac", e.target.value)} className={cls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Ngày thông quan</label>
            <input type="date" value={values.ngay_thong_quan} onChange={(e) => set("ngay_thong_quan", e.target.value)} className={cls} />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button type="button" onClick={onCancel} className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700">
            Hủy
          </button>
          <button type="submit" className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white">
            Lưu
          </button>
        </div>
      </form>
    </div>
  );
}
