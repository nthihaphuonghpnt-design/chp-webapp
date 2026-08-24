"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import SearchableSelect from "@/components/common/SearchableSelect";
import type { ChiTietVanChuyen } from "@/types/database";

interface DiaDiemOption {
  id: string;
  ten: string;
  ma_dia_diem?: string | null;
  dia_chi?: string | null;
  khu_vuc?: string | null;
}

const DIEU_DONG = ["Công ty (tự thực hiện)", "Thuê ngoài"];
const TRANG_THAI = ["Đã duyệt lệnh", "Đã xuất phát", "Đã điều động", "Đã xác nhận", "Đã hoàn thành"];

function diaDiemName(list: DiaDiemOption[], id: string | null) {
  return list.find((d) => d.id === id)?.ten ?? "—";
}

export default function ChiTietVanChuyenSection({
  donHangId,
  initialRows,
  diaDiemList,
  canEdit,
  goiYDiem,
}: {
  donHangId: string;
  initialRows: ChiTietVanChuyen[];
  diaDiemList: DiaDiemOption[];
  canEdit: boolean;
  goiYDiem?: { diem_1_id: string | null; diem_2_id: string | null; diem_3_id: string | null };
}) {
  const supabase = createClient();
  const [rows, setRows] = useState<ChiTietVanChuyen[]>(initialRows);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ChiTietVanChuyen | null>(null);

  function openNew() {
    setEditing(null);
    setShowForm(true);
  }

  function openEdit(row: ChiTietVanChuyen) {
    setEditing(row);
    setShowForm(true);
  }

  async function handleSave(values: Record<string, string>) {
    const payload: Record<string, unknown> = { don_hang_id: donHangId };
    for (const [k, v] of Object.entries(values)) {
      payload[k] = v === "" ? null : v;
    }

    if (editing) {
      const { data, error } = await supabase
        .from("chi_tiet_van_chuyen")
        .update(payload)
        .eq("id", editing.id)
        .select()
        .single();
      if (!error && data) {
        setRows((prev) => prev.map((r) => (r.id === editing.id ? (data as ChiTietVanChuyen) : r)));
        setShowForm(false);
      }
    } else {
      const { data, error } = await supabase.from("chi_tiet_van_chuyen").insert(payload).select().single();
      if (!error && data) {
        setRows((prev) => [...prev, data as ChiTietVanChuyen]);
        setShowForm(false);
      }
    }
  }

  async function handleDelete(row: ChiTietVanChuyen) {
    if (!window.confirm("Xóa chặng vận chuyển này?")) return;
    const { error } = await supabase.from("chi_tiet_van_chuyen").delete().eq("id", row.id);
    if (!error) setRows((prev) => prev.filter((r) => r.id !== row.id));
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Chi tiết vận chuyển</h2>
        {canEdit && (
          <button onClick={openNew} className="text-sm font-medium text-blue-600">
            + Thêm chặng
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {rows.map((row) => (
          <div key={row.id} className="rounded-lg border border-slate-100 p-3 text-sm">
            <div className="mb-1 flex items-center justify-between">
              <span className="font-medium text-slate-900">{row.ngay_vc ?? "Chưa có ngày"}</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{row.trang_thai}</span>
            </div>
            <p className="text-slate-600">
              {row.dieu_dong_xe ?? "—"}
              {row.so_xe ? ` · Xe: ${row.so_xe}` : ""}
              {row.tai_xe_cty_thue ? ` · ${row.tai_xe_cty_thue}` : ""}
            </p>
            <p className="text-slate-500">
              {diaDiemName(diaDiemList, row.diem_1_id)} → {diaDiemName(diaDiemList, row.diem_2_id)} → {diaDiemName(diaDiemList, row.diem_3_id)}
            </p>
            {canEdit && (
              <div className="mt-2 flex gap-3">
                <button onClick={() => openEdit(row)} className="text-xs font-medium text-blue-600">
                  Sửa
                </button>
                <button onClick={() => handleDelete(row)} className="text-xs font-medium text-red-600">
                  Xóa
                </button>
              </div>
            )}
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm text-slate-400">Chưa có chặng vận chuyển nào.</p>}
      </div>

      {showForm && (
        <ChiTietForm
          initial={editing}
          diaDiemList={diaDiemList}
          goiYDiem={goiYDiem}
          onCancel={() => setShowForm(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

function ChiTietForm({
  initial,
  diaDiemList,
  goiYDiem,
  onCancel,
  onSave,
}: {
  initial: ChiTietVanChuyen | null;
  diaDiemList: DiaDiemOption[];
  goiYDiem?: { diem_1_id: string | null; diem_2_id: string | null; diem_3_id: string | null };
  onCancel: () => void;
  onSave: (values: Record<string, string>) => void;
}) {
  const [values, setValues] = useState({
    ngay_vc: initial?.ngay_vc ?? "",
    dieu_dong_xe: initial?.dieu_dong_xe ?? "",
    so_xe: initial?.so_xe ?? "",
    tai_xe_cty_thue: initial?.tai_xe_cty_thue ?? "",
    diem_1_id: initial?.diem_1_id ?? goiYDiem?.diem_1_id ?? "",
    diem_2_id: initial?.diem_2_id ?? goiYDiem?.diem_2_id ?? "",
    diem_3_id: initial?.diem_3_id ?? goiYDiem?.diem_3_id ?? "",
    trang_thai: initial?.trang_thai ?? "Đã duyệt lệnh",
  });

  const diaDiemOptions = diaDiemList.map((d) => ({
    value: d.id,
    label: d.ten,
    code: d.ma_dia_diem,
    sublabel: [d.khu_vuc, d.dia_chi].filter(Boolean).join(" · "),
  }));

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
        <h2 className="mb-4 text-lg font-semibold text-slate-900">{initial ? "Sửa chặng vận chuyển" : "Thêm chặng vận chuyển"}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Ngày vận chuyển</label>
            <input type="date" value={values.ngay_vc} onChange={(e) => set("ngay_vc", e.target.value)} className={cls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Điều động xe</label>
            <select value={values.dieu_dong_xe} onChange={(e) => set("dieu_dong_xe", e.target.value)} className={cls}>
              <option value="">-- Chọn --</option>
              {DIEU_DONG.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Số xe</label>
            <input value={values.so_xe} onChange={(e) => set("so_xe", e.target.value)} className={cls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Tài xế / Công ty thuê</label>
            <input value={values.tai_xe_cty_thue} onChange={(e) => set("tai_xe_cty_thue", e.target.value)} className={cls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Điểm 1 (lấy)</label>
            <SearchableSelect
              options={diaDiemOptions}
              value={values.diem_1_id}
              onChange={(v) => set("diem_1_id", v)}
              placeholder="Gõ tên hoặc mã địa điểm..."
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Điểm 2 (đóng/giao)</label>
            <SearchableSelect
              options={diaDiemOptions}
              value={values.diem_2_id}
              onChange={(v) => set("diem_2_id", v)}
              placeholder="Gõ tên hoặc mã địa điểm..."
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Điểm 3 (hạ/trả)</label>
            <SearchableSelect
              options={diaDiemOptions}
              value={values.diem_3_id}
              onChange={(v) => set("diem_3_id", v)}
              placeholder="Gõ tên hoặc mã địa điểm..."
            />
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
        </div>

        <p className="mt-3 text-xs text-slate-400">
          Tiền cước/phí của chặng này (nội bộ hoặc thuê ngoài) nhập ở mục &quot;Chi phí phát
          sinh&quot; bên dưới — chọn &quot;Gắn với chặng vận chuyển&quot; đúng chặng vừa lưu.
        </p>

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
