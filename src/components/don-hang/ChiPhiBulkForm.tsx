"use client";

import { useState } from "react";
import SearchableSelect, { type SearchableOption } from "@/components/common/SearchableSelect";
import MoneyInput from "@/components/common/MoneyInput";
import type { ChiTietVanChuyen } from "@/types/database";

interface Option {
  id: string;
  ten: string;
  ma?: string | null;
}

export interface BulkRowValues {
  loai_chi_phi_id: string;
  nha_cung_cap_id: string | null;
  doi_tac_thue_ngoai_id: string | null;
  chi_tiet_van_chuyen_id: string | null;
  gia_von_buy: string;
  gia_ban_sell: string;
  noi_bo: boolean;
  chi_ho: boolean;
}

let nextRowId = 1;

function blankRow(): { key: number } & BulkRowValues {
  return {
    key: nextRowId++,
    loai_chi_phi_id: "",
    nha_cung_cap_id: null,
    doi_tac_thue_ngoai_id: null,
    chi_tiet_van_chuyen_id: null,
    gia_von_buy: "",
    gia_ban_sell: "",
    noi_bo: true,
    chi_ho: false,
  };
}

export default function ChiPhiBulkForm({
  loaiChiPhiList,
  nhaCungCapList,
  doiTacThueNgoaiList,
  chiTietVanChuyenList,
  canSeeSell,
  onCancel,
  onSave,
}: {
  loaiChiPhiList: Option[];
  nhaCungCapList: Option[];
  doiTacThueNgoaiList: Option[];
  chiTietVanChuyenList: ChiTietVanChuyen[];
  canSeeSell: boolean;
  onCancel: () => void;
  onSave: (rows: BulkRowValues[]) => Promise<void>;
}) {
  const [rows, setRows] = useState(() => Array.from({ length: 6 }, blankRow));
  const [saving, setSaving] = useState(false);

  const loaiOptions: SearchableOption[] = loaiChiPhiList.map((o) => ({ value: o.id, label: o.ten, code: o.ma }));
  const doiTacOptions: SearchableOption[] = [
    ...nhaCungCapList.map((o) => ({ value: `ncc:${o.id}`, label: o.ten, sublabel: "Nhà cung cấp" })),
    ...doiTacThueNgoaiList.map((o) => ({ value: `doitac:${o.id}`, label: o.ten, sublabel: "Đối tác thuê ngoài" })),
  ];
  const changOptions: SearchableOption[] = chiTietVanChuyenList.map((c) => ({
    value: c.id,
    label: c.ngay_vc ? `${c.ngay_vc} · ${c.so_xe || c.tai_xe_cty_thue || "chặng"}` : c.so_xe || c.tai_xe_cty_thue || "Chặng chưa có ngày",
  }));

  function update(key: number, patch: Partial<BulkRowValues>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function doiTacValue(r: (typeof rows)[number]) {
    if (r.nha_cung_cap_id) return `ncc:${r.nha_cung_cap_id}`;
    if (r.doi_tac_thue_ngoai_id) return `doitac:${r.doi_tac_thue_ngoai_id}`;
    return "";
  }

  function setDoiTac(key: number, value: string) {
    if (value.startsWith("ncc:")) {
      update(key, { nha_cung_cap_id: value.slice(4), doi_tac_thue_ngoai_id: null });
    } else if (value.startsWith("doitac:")) {
      update(key, { doi_tac_thue_ngoai_id: value.slice(7), nha_cung_cap_id: null });
    } else {
      update(key, { nha_cung_cap_id: null, doi_tac_thue_ngoai_id: null });
    }
  }

  function addRow() {
    setRows((prev) => [...prev, blankRow()]);
  }

  function removeRow(key: number) {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const filled = rows.filter((r) => r.loai_chi_phi_id && r.gia_von_buy);
    if (filled.length === 0) {
      window.alert("Chưa có dòng nào điền đủ Loại chi phí + Giá vốn.");
      return;
    }
    setSaving(true);
    await onSave(filled);
    setSaving(false);
  }

  const cls = "w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2 sm:p-6">
      <form
        onSubmit={handleSubmit}
        className="flex max-h-[95vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
      >
        <div className="border-b border-slate-100 p-4">
          <h2 className="text-lg font-semibold text-slate-900">Nhập nhanh nhiều chi phí</h2>
          <p className="text-xs text-slate-400">
            Điền các dòng cần thiết (bỏ trống dòng không dùng), bấm Lưu tất cả — chỉ dòng có Loại
            chi phí + Giá vốn mới được lưu.
          </p>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <div className="min-w-[900px]">
            <div className="grid grid-cols-12 gap-2 border-b border-slate-200 pb-2 text-xs font-medium text-slate-500">
              <div className="col-span-3">Loại chi phí</div>
              <div className="col-span-2">Nhà cung cấp / Đối tác</div>
              <div className="col-span-2">Gắn chặng</div>
              <div className="col-span-1">Giá vốn</div>
              {canSeeSell && <div className="col-span-1">Giá bán</div>}
              <div className={canSeeSell ? "col-span-2" : "col-span-3"}>Nội bộ / Chi hộ</div>
              <div className="col-span-1"></div>
            </div>

            {rows.map((r) => (
              <div key={r.key} className="grid grid-cols-12 items-center gap-2 border-b border-slate-100 py-2">
                <div className="col-span-3">
                  <SearchableSelect options={loaiOptions} value={r.loai_chi_phi_id} onChange={(v) => update(r.key, { loai_chi_phi_id: v })} />
                </div>
                <div className="col-span-2">
                  <SearchableSelect options={doiTacOptions} value={doiTacValue(r)} onChange={(v) => setDoiTac(r.key, v)} />
                </div>
                <div className="col-span-2">
                  <SearchableSelect
                    options={changOptions}
                    value={r.chi_tiet_van_chuyen_id ?? ""}
                    onChange={(v) => update(r.key, { chi_tiet_van_chuyen_id: v || null })}
                    placeholder="-- Không gắn --"
                  />
                </div>
                <div className="col-span-1">
                  <MoneyInput value={r.gia_von_buy} onChange={(v) => update(r.key, { gia_von_buy: v })} className={cls} />
                </div>
                {canSeeSell && (
                  <div className="col-span-1">
                    <MoneyInput value={r.gia_ban_sell} onChange={(v) => update(r.key, { gia_ban_sell: v })} className={cls} />
                  </div>
                )}
                <div className={`flex items-center gap-3 text-xs ${canSeeSell ? "col-span-2" : "col-span-3"}`}>
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={r.noi_bo}
                      onChange={(e) => update(r.key, { noi_bo: e.target.checked, chi_ho: e.target.checked ? false : r.chi_ho })}
                    />
                    Nội bộ
                  </label>
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={r.chi_ho}
                      onChange={(e) => update(r.key, { chi_ho: e.target.checked, noi_bo: e.target.checked ? false : r.noi_bo })}
                    />
                    Chi hộ
                  </label>
                </div>
                <div className="col-span-1 text-right">
                  <button type="button" onClick={() => removeRow(r.key)} className="text-xs font-medium text-red-500">
                    Xóa dòng
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button type="button" onClick={addRow} className="mt-3 text-sm font-medium text-blue-600">
            + Thêm dòng
          </button>
        </div>

        <div className="flex gap-3 border-t border-slate-100 p-4">
          <button type="button" onClick={onCancel} className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700">
            Hủy
          </button>
          <button type="submit" disabled={saving} className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60">
            {saving ? "Đang lưu..." : "Lưu tất cả"}
          </button>
        </div>
      </form>
    </div>
  );
}
