"use client";

import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/client";
import SearchableSelect from "@/components/common/SearchableSelect";
import type { BangGiaKhachHang, PhatSinhChiPhi } from "@/types/database";

interface Option {
  id: string;
  ten: string;
  ma?: string | null;
}

const TRANG_THAI_COLOR: Record<string, string> = {
  "Nháp": "bg-slate-200 text-slate-600",
  "Chờ duyệt": "bg-amber-100 text-amber-700",
  "Đã duyệt": "bg-green-100 text-green-700",
  "Từ chối": "bg-red-100 text-red-700",
};

export default function ChiPhiSection({
  donHangId,
  soDonHang,
  initialRows,
  loaiChiPhiList,
  nhaCungCapList,
  bangGiaList,
  phongBan,
}: {
  donHangId: string;
  soDonHang: string;
  initialRows: PhatSinhChiPhi[];
  loaiChiPhiList: Option[];
  nhaCungCapList: Option[];
  bangGiaList: BangGiaKhachHang[];
  phongBan: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<PhatSinhChiPhi[]>(initialRows);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PhatSinhChiPhi | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  const canInsert = ["Hiện trường", "Điều phối", "Chứng từ", "Kế toán"].includes(phongBan);
  const canApprove = phongBan === "Kế toán";
  const canEditRow = ["Hiện trường", "Điều phối", "Chứng từ", "Kế toán", "Sale"].includes(phongBan);
  const canSeeSell = !["Hiện trường", "Điều phối"].includes(phongBan);

  function loaiTen(id: string | null) {
    return loaiChiPhiList.find((l) => l.id === id)?.ten ?? "—";
  }
  function nccTen(id: string | null) {
    return nhaCungCapList.find((n) => n.id === id)?.ten ?? "—";
  }

  async function handleSave(values: Record<string, string | boolean>) {
    const payload: Record<string, unknown> = { don_hang_id: donHangId };
    for (const [k, v] of Object.entries(values)) {
      if (typeof v === "boolean") {
        payload[k] = v;
      } else if (["so_luong", "don_gia", "gia_von_buy", "gia_ban_sell", "vat_percent"].includes(k)) {
        payload[k] = v === "" ? null : Number(v);
      } else {
        payload[k] = v === "" ? null : v;
      }
    }

    if (editing) {
      const { data, error } = await supabase
        .from("phat_sinh_chi_phi")
        .update(payload)
        .eq("id", editing.id)
        .select()
        .single();
      if (!error && data) {
        setRows((prev) => prev.map((r) => (r.id === editing.id ? (data as PhatSinhChiPhi) : r)));
        setShowForm(false);
      } else if (error) {
        window.alert(error.message);
      }
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data: nv } = await supabase.from("nhan_vien").select("id").eq("auth_user_id", user?.id).single();

      const { data, error } = await supabase
        .from("phat_sinh_chi_phi")
        .insert({ ...payload, nguoi_nhap_id: nv?.id, trang_thai: "Chờ duyệt" })
        .select()
        .single();
      if (!error && data) {
        setRows((prev) => [data as PhatSinhChiPhi, ...prev]);
        setShowForm(false);
      } else if (error) {
        window.alert(error.message);
      }
    }
  }

  async function handleDelete(row: PhatSinhChiPhi) {
    if (!window.confirm("Xóa dòng chi phí này?")) return;
    const { error } = await supabase.from("phat_sinh_chi_phi").delete().eq("id", row.id);
    if (!error) setRows((prev) => prev.filter((r) => r.id !== row.id));
  }

  async function handleApprove(row: PhatSinhChiPhi, trangThai: "Đã duyệt" | "Từ chối") {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: nv } = await supabase.from("nhan_vien").select("id").eq("auth_user_id", user?.id).single();

    const { data, error } = await supabase
      .from("phat_sinh_chi_phi")
      .update({ trang_thai: trangThai, nguoi_duyet_id: nv?.id })
      .eq("id", row.id)
      .select()
      .single();
    if (!error && data) {
      setRows((prev) => prev.map((r) => (r.id === row.id ? (data as PhatSinhChiPhi) : r)));
    } else if (error) {
      window.alert(error.message);
    }
  }

  function handleExportExcel() {
    const data = rows.map((r) => {
      const obj: Record<string, unknown> = {
        "Loại chi phí": loaiTen(r.loai_chi_phi_id),
        "Nhà cung cấp": nccTen(r.nha_cung_cap_id),
        "Số lượng": r.so_luong ?? "",
        "Đơn giá": r.don_gia ?? "",
        "Giá vốn (buy)": r.gia_von_buy ?? "",
      };
      if (canSeeSell) obj["Giá bán (sell)"] = r.gia_ban_sell ?? "";
      obj["VAT %"] = r.vat_percent ?? "";
      obj["Tiền thuế"] = r.tien_thue;
      obj["Tổng tiền"] = r.tong_tien;
      obj["Nội bộ"] = r.noi_bo ? "Có" : "Không";
      obj["Chi hộ"] = r.chi_ho ? "Có" : "Không";
      obj["Có hóa đơn thuế"] = r.tt_thue ? "Có" : "Không";
      obj["Ngày phát sinh"] = r.ngay_phat_sinh;
      obj["Trạng thái"] = r.trang_thai;
      obj["Ghi chú"] = r.ghi_chu ?? "";
      return obj;
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Chi phí");
    XLSX.writeFile(wb, `chi-phi-${soDonHang}.xlsx`);
  }

  function handleDownloadTemplate() {
    const headers = [
      "Loại chi phí *",
      "Nhà cung cấp",
      "Số lượng",
      "Đơn giá",
      "Giá vốn (buy) *",
      ...(canSeeSell ? ["Giá bán (sell)"] : []),
      "VAT %",
      "Nội bộ (Có/Không)",
      "Chi hộ (Có/Không)",
      "Có hóa đơn thuế (Có/Không)",
      "Ngày phát sinh (yyyy-mm-dd)",
      "Ghi chú",
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mẫu nhập chi phí");
    const guideRows = [
      ["Cột", "Giá trị hợp lệ"],
      ["Loại chi phí", loaiChiPhiList.map((l) => l.ten).join(", ")],
      ["Nhà cung cấp", nhaCungCapList.map((n) => n.ten).join(", ")],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(guideRows), "Hướng dẫn");
    XLSX.writeFile(wb, `mau-nhap-chi-phi-${soDonHang}.xlsx`);
  }

  async function handleImportFile(file: File) {
    setImporting(true);
    setImportMsg(null);
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array", cellDates: true });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: nv } = await supabase.from("nhan_vien").select("id").eq("auth_user_id", user?.id).single();

    const records: Record<string, unknown>[] = [];
    const errors: string[] = [];

    raw.forEach((rawRow, idx) => {
      const rowNum = idx + 2;
      const norm: Record<string, unknown> = {};
      for (const key of Object.keys(rawRow)) norm[key.trim().toLowerCase()] = rawRow[key];

      const get = (h: string) => String(norm[h.toLowerCase()] ?? "").trim();

      const loaiName = get("Loại chi phí *") || get("Loại chi phí");
      const loai = loaiChiPhiList.find((l) => l.ten.toLowerCase() === loaiName.toLowerCase());
      if (!loai) {
        errors.push(`Dòng ${rowNum}: không tìm thấy loại chi phí "${loaiName}".`);
        return;
      }
      const nccName = get("Nhà cung cấp");
      const ncc = nccName ? nhaCungCapList.find((n) => n.ten.toLowerCase() === nccName.toLowerCase()) : null;

      const giaVon = get("Giá vốn (buy) *") || get("Giá vốn (buy)");
      if (!giaVon) {
        errors.push(`Dòng ${rowNum}: thiếu Giá vốn (buy).`);
        return;
      }

      records.push({
        don_hang_id: donHangId,
        loai_chi_phi_id: loai.id,
        nha_cung_cap_id: ncc?.id ?? null,
        so_luong: get("Số lượng") ? Number(get("Số lượng")) : null,
        don_gia: get("Đơn giá") ? Number(get("Đơn giá")) : null,
        gia_von_buy: Number(giaVon),
        gia_ban_sell: canSeeSell && get("Giá bán (sell)") ? Number(get("Giá bán (sell)")) : null,
        vat_percent: get("VAT %") ? Number(get("VAT %")) : null,
        noi_bo: get("Nội bộ (Có/Không)").toLowerCase() !== "không",
        chi_ho: get("Chi hộ (Có/Không)").toLowerCase() === "có",
        tt_thue: get("Có hóa đơn thuế (Có/Không)").toLowerCase() === "có",
        ngay_phat_sinh: get("Ngày phát sinh (yyyy-mm-dd)") || new Date().toISOString().slice(0, 10),
        ghi_chu: get("Ghi chú") || null,
        nguoi_nhap_id: nv?.id,
        trang_thai: "Chờ duyệt",
      });
    });

    if (records.length === 0) {
      setImportMsg(errors.length ? errors.join(" | ") : "File không có dòng hợp lệ.");
      setImporting(false);
      return;
    }

    const { data, error } = await supabase.from("phat_sinh_chi_phi").insert(records).select();
    setImporting(false);
    if (error) {
      setImportMsg(`Lỗi: ${error.message}`);
      return;
    }
    setRows((prev) => [...((data as PhatSinhChiPhi[]) ?? []), ...prev]);
    setImportMsg(`Đã nhập ${data?.length ?? 0} dòng${errors.length ? `, ${errors.length} dòng lỗi: ${errors.join(" | ")}` : "."}`);
  }

  const tongBuy = rows.filter((r) => r.noi_bo).reduce((s, r) => s + (r.gia_von_buy ?? 0), 0);
  const tongSell = rows.reduce((s, r) => s + (r.gia_ban_sell ?? 0), 0);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900">Chi phí phát sinh</h2>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleExportExcel} className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700">
            Xuất Excel
          </button>
          {canInsert && (
            <>
              <button onClick={handleDownloadTemplate} className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700">
                Tải mẫu
              </button>
              <label className="cursor-pointer rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700">
                {importing ? "Đang nhập..." : "Nhập Excel"}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  disabled={importing}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImportFile(file);
                    e.target.value = "";
                  }}
                />
              </label>
              <button
                onClick={() => {
                  setEditing(null);
                  setShowForm(true);
                }}
                className="rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white"
              >
                + Thêm chi phí
              </button>
            </>
          )}
        </div>
      </div>

      {importMsg && <p className="mb-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">{importMsg}</p>}

      <div className="flex flex-col gap-2">
        {rows.map((row) => (
          <div key={row.id} className="rounded-lg border border-slate-100 p-3 text-sm">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-slate-900">{loaiTen(row.loai_chi_phi_id)}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TRANG_THAI_COLOR[row.trang_thai]}`}>
                {row.trang_thai}
              </span>
            </div>
            <p className="text-slate-500">
              {nccTen(row.nha_cung_cap_id)} · Buy: {(row.gia_von_buy ?? 0).toLocaleString("vi-VN")}
              {canSeeSell && ` · Sell: ${(row.gia_ban_sell ?? 0).toLocaleString("vi-VN")}`}
              {" · "}
              {row.noi_bo ? "Nội bộ" : row.chi_ho ? "Chi hộ" : "—"}
            </p>
            <div className="mt-2 flex flex-wrap gap-3">
              {canEditRow && (
                <button
                  onClick={() => {
                    setEditing(row);
                    setShowForm(true);
                  }}
                  className="text-xs font-medium text-blue-600"
                >
                  Sửa
                </button>
              )}
              {canApprove && ["Nháp", "Chờ duyệt"].includes(row.trang_thai) && (
                <>
                  <button onClick={() => handleApprove(row, "Đã duyệt")} className="text-xs font-medium text-green-600">
                    Duyệt
                  </button>
                  <button onClick={() => handleApprove(row, "Từ chối")} className="text-xs font-medium text-red-600">
                    Từ chối
                  </button>
                </>
              )}
              {canApprove && (
                <button onClick={() => handleDelete(row)} className="text-xs font-medium text-red-600">
                  Xóa
                </button>
              )}
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm text-slate-400">Chưa có chi phí nào.</p>}
      </div>

      {rows.length > 0 && (
        <div className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-600">
          Tổng Buy (nội bộ): <strong>{tongBuy.toLocaleString("vi-VN")}</strong>
          {canSeeSell && (
            <>
              {" · "}Tổng Sell: <strong>{tongSell.toLocaleString("vi-VN")}</strong>
            </>
          )}
        </div>
      )}

      {showForm && (
        <ChiPhiForm
          initial={editing}
          loaiChiPhiList={loaiChiPhiList}
          nhaCungCapList={nhaCungCapList}
          bangGiaList={bangGiaList}
          phongBan={phongBan}
          canSeeSell={canSeeSell}
          onCancel={() => setShowForm(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

function ChiPhiForm({
  initial,
  loaiChiPhiList,
  nhaCungCapList,
  bangGiaList,
  phongBan,
  canSeeSell,
  onCancel,
  onSave,
}: {
  initial: PhatSinhChiPhi | null;
  loaiChiPhiList: Option[];
  nhaCungCapList: Option[];
  bangGiaList: BangGiaKhachHang[];
  phongBan: string;
  canSeeSell: boolean;
  onCancel: () => void;
  onSave: (values: Record<string, string | boolean>) => void;
}) {
  const isSaleOnly = phongBan === "Sale";
  const [giaGoiY, setGiaGoiY] = useState<BangGiaKhachHang | null>(
    () => bangGiaList.find((b) => b.loai_chi_phi_id === initial?.loai_chi_phi_id) ?? null
  );

  const [values, setValues] = useState({
    loai_chi_phi_id: initial?.loai_chi_phi_id ?? "",
    nha_cung_cap_id: initial?.nha_cung_cap_id ?? "",
    so_luong: initial?.so_luong?.toString() ?? "",
    don_gia: initial?.don_gia?.toString() ?? "",
    gia_von_buy: initial?.gia_von_buy?.toString() ?? "",
    gia_ban_sell: initial?.gia_ban_sell?.toString() ?? "",
    vat_percent: initial?.vat_percent?.toString() ?? "",
    ngay_phat_sinh: initial?.ngay_phat_sinh ?? new Date().toISOString().slice(0, 10),
    ghi_chu: initial?.ghi_chu ?? "",
    noi_bo: initial?.noi_bo ?? true,
    chi_ho: initial?.chi_ho ?? false,
    tt_thue: initial?.tt_thue ?? false,
  });

  function set<K extends keyof typeof values>(key: K, value: (typeof values)[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleLoaiChiPhiChange(loaiChiPhiId: string) {
    set("loai_chi_phi_id", loaiChiPhiId);
    const match = bangGiaList.find((b) => b.loai_chi_phi_id === loaiChiPhiId);
    setGiaGoiY(match ?? null);
    if (match?.don_gia && !values.gia_ban_sell) {
      set("gia_ban_sell", String(match.don_gia));
    }
  }

  function handleNoiBoChange(checked: boolean) {
    setValues((prev) => ({ ...prev, noi_bo: checked, chi_ho: checked ? false : prev.chi_ho }));
  }

  function handleChiHoChange(checked: boolean) {
    setValues((prev) => ({ ...prev, chi_ho: checked, noi_bo: checked ? false : prev.noi_bo }));
  }

  const loaiChiPhiOptions = loaiChiPhiList.map((o) => ({ value: o.id, label: o.ten, code: o.ma }));
  const nhaCungCapOptions = nhaCungCapList.map((o) => ({ value: o.id, label: o.ten, code: o.ma }));

  const cls = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(values);
        }}
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-lg sm:rounded-2xl"
      >
        <h2 className="mb-4 text-lg font-semibold text-slate-900">{initial ? "Sửa chi phí" : "Thêm chi phí"}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Loại chi phí</label>
            <SearchableSelect
              disabled={isSaleOnly}
              options={loaiChiPhiOptions}
              value={values.loai_chi_phi_id}
              onChange={handleLoaiChiPhiChange}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Nhà cung cấp</label>
            <SearchableSelect
              disabled={isSaleOnly}
              options={nhaCungCapOptions}
              value={values.nha_cung_cap_id}
              onChange={(v) => set("nha_cung_cap_id", v)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Số lượng</label>
            <input disabled={isSaleOnly} type="number" step="any" value={values.so_luong} onChange={(e) => set("so_luong", e.target.value)} className={cls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Đơn giá</label>
            <input disabled={isSaleOnly} type="number" step="any" value={values.don_gia} onChange={(e) => set("don_gia", e.target.value)} className={cls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Giá vốn (buy)</label>
            <input disabled={isSaleOnly} type="number" step="any" value={values.gia_von_buy} onChange={(e) => set("gia_von_buy", e.target.value)} className={cls} />
          </div>
          {canSeeSell && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Giá bán (sell)</label>
              <input type="number" step="any" value={values.gia_ban_sell} onChange={(e) => set("gia_ban_sell", e.target.value)} className={cls} />
              {giaGoiY && (
                <p className="mt-1 text-xs text-blue-600">
                  Giá theo bảng giá khách hàng: {(giaGoiY.don_gia ?? 0).toLocaleString("vi-VN")}
                  {giaGoiY.don_vi ?? ""}
                  {values.gia_ban_sell !== String(giaGoiY.don_gia ?? "") && (
                    <button
                      type="button"
                      onClick={() => set("gia_ban_sell", String(giaGoiY.don_gia ?? ""))}
                      className="ml-2 underline"
                    >
                      Dùng giá này
                    </button>
                  )}
                </p>
              )}
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">VAT %</label>
            <input disabled={isSaleOnly} type="number" step="any" value={values.vat_percent} onChange={(e) => set("vat_percent", e.target.value)} className={cls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Ngày phát sinh</label>
            <input disabled={isSaleOnly} type="date" value={values.ngay_phat_sinh} onChange={(e) => set("ngay_phat_sinh", e.target.value)} className={cls} />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-1.5">
            <input
              disabled={isSaleOnly || values.chi_ho}
              type="checkbox"
              checked={values.noi_bo}
              onChange={(e) => handleNoiBoChange(e.target.checked)}
            />
            Nội bộ (tính lãi/lỗ)
          </label>
          <label className="flex items-center gap-1.5">
            <input
              disabled={isSaleOnly || values.noi_bo}
              type="checkbox"
              checked={values.chi_ho}
              onChange={(e) => handleChiHoChange(e.target.checked)}
            />
            Chi hộ khách hàng
          </label>
          <label className="flex items-center gap-1.5">
            <input disabled={isSaleOnly} type="checkbox" checked={values.tt_thue} onChange={(e) => set("tt_thue", e.target.checked)} />
            Có hóa đơn thuế
          </label>
        </div>

        <div className="mt-3">
          <label className="mb-1 block text-sm font-medium text-slate-700">Ghi chú</label>
          <textarea disabled={isSaleOnly} rows={2} value={values.ghi_chu} onChange={(e) => set("ghi_chu", e.target.value)} className={cls} />
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
