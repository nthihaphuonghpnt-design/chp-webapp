"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DonHangContainer } from "@/types/database";

interface Option {
  id: string;
  ten: string;
}

export default function ContainerSection({
  donHangId,
  initialRows,
  loaiContainerList,
  canEdit,
}: {
  donHangId: string;
  initialRows: DonHangContainer[];
  loaiContainerList: Option[];
  canEdit: boolean;
}) {
  const supabase = createClient();
  const [rows, setRows] = useState<DonHangContainer[]>(initialRows);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<DonHangContainer | null>(null);

  function loaiTen(id: string | null) {
    return loaiContainerList.find((l) => l.id === id)?.ten ?? "—";
  }

  async function handleSave(values: Record<string, string>) {
    const payload: Record<string, unknown> = {
      don_hang_id: donHangId,
      so_cont: values.so_cont || null,
      so_seal: values.so_seal || null,
      loai_cont_hang_id: values.loai_cont_hang_id || null,
      khoi_luong: values.khoi_luong ? Number(values.khoi_luong) : null,
      ghi_chu: values.ghi_chu || null,
    };

    if (editing) {
      const { data, error } = await supabase
        .from("don_hang_container")
        .update(payload)
        .eq("id", editing.id)
        .select()
        .single();
      if (!error && data) {
        setRows((prev) => prev.map((r) => (r.id === editing.id ? (data as DonHangContainer) : r)));
        setShowForm(false);
      }
    } else {
      const { data, error } = await supabase.from("don_hang_container").insert(payload).select().single();
      if (!error && data) {
        setRows((prev) => [...prev, data as DonHangContainer]);
        setShowForm(false);
      }
    }
  }

  async function handleDelete(row: DonHangContainer) {
    if (!window.confirm("Xóa container này?")) return;
    const { error } = await supabase.from("don_hang_container").delete().eq("id", row.id);
    if (!error) setRows((prev) => prev.filter((r) => r.id !== row.id));
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Container / số ký</h2>
        {canEdit && (
          <button
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
            className="text-sm font-medium text-blue-600"
          >
            + Thêm container
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {rows.map((row) => (
          <div key={row.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-3 text-sm">
            <div>
              <p className="font-medium text-slate-900">
                {row.so_cont || "Chưa có số cont"} {row.so_seal ? `· Seal: ${row.so_seal}` : ""}
              </p>
              <p className="text-slate-500">
                {loaiTen(row.loai_cont_hang_id)}
                {row.khoi_luong ? ` · ${row.khoi_luong} kg` : ""}
                {row.ghi_chu ? ` · ${row.ghi_chu}` : ""}
              </p>
            </div>
            {canEdit && (
              <div className="flex gap-3">
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
        {rows.length === 0 && <p className="text-sm text-slate-400">Chưa có container nào.</p>}
      </div>

      {showForm && (
        <ContainerForm
          initial={editing}
          loaiContainerList={loaiContainerList}
          onCancel={() => setShowForm(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

function ContainerForm({
  initial,
  loaiContainerList,
  onCancel,
  onSave,
}: {
  initial: DonHangContainer | null;
  loaiContainerList: Option[];
  onCancel: () => void;
  onSave: (values: Record<string, string>) => void;
}) {
  const [values, setValues] = useState({
    so_cont: initial?.so_cont ?? "",
    so_seal: initial?.so_seal ?? "",
    loai_cont_hang_id: initial?.loai_cont_hang_id ?? "",
    khoi_luong: initial?.khoi_luong?.toString() ?? "",
    ghi_chu: initial?.ghi_chu ?? "",
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
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-md sm:rounded-2xl"
      >
        <h2 className="mb-4 text-lg font-semibold text-slate-900">{initial ? "Sửa container" : "Thêm container"}</h2>
        <div className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Số container</label>
            <input value={values.so_cont} onChange={(e) => set("so_cont", e.target.value)} className={cls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Số seal</label>
            <input value={values.so_seal} onChange={(e) => set("so_seal", e.target.value)} className={cls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Loại container</label>
            <select value={values.loai_cont_hang_id} onChange={(e) => set("loai_cont_hang_id", e.target.value)} className={cls}>
              <option value="">-- Chọn --</option>
              {loaiContainerList.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.ten}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Khối lượng / số ký (kg)</label>
            <input type="number" step="any" value={values.khoi_luong} onChange={(e) => set("khoi_luong", e.target.value)} className={cls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Ghi chú</label>
            <input value={values.ghi_chu} onChange={(e) => set("ghi_chu", e.target.value)} className={cls} />
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
