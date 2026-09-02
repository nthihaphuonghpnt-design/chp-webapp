"use client";

import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { xuatExcelKeO, type ExcelColumn } from "@/lib/excel";
import { createClient } from "@/lib/supabase/client";
import QuickAddDoiTacThueNgoai from "@/components/common/QuickAddDoiTacThueNgoai";
import MoneyInput from "@/components/common/MoneyInput";
import type { DonThueNgoai } from "@/types/database";

interface Option {
  id: string;
  ten: string;
}

const LOAI_DICH_VU = ["Vận tải nội địa thuê ngoài", "Cước đường biển", "Dịch vụ bên thứ 3 khác"];
const TT_THANH_TOAN = ["Chưa thanh toán", "Một phần", "Đã đủ"];

const TRANG_THAI_COLOR: Record<string, string> = {
  "Chờ duyệt": "bg-amber-100 text-amber-700",
  "Đã duyệt": "bg-green-100 text-green-700",
  "Từ chối": "bg-red-100 text-red-700",
};

export default function ThueNgoaiSection({
  donHangId,
  soDonHang,
  initialRows,
  doiTacList: initialDoiTacList,
  phongBan,
}: {
  donHangId: string;
  soDonHang: string;
  initialRows: DonThueNgoai[];
  doiTacList: Option[];
  phongBan: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<DonThueNgoai[]>(initialRows);
  const [doiTacList, setDoiTacList] = useState<Option[]>(initialDoiTacList);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<DonThueNgoai | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  const canInsert = ["Hiện trường", "Điều phối", "Kế toán"].includes(phongBan);
  const canApprove = phongBan === "Kế toán";
  const canEditRow = ["Hiện trường", "Điều phối", "Kế toán"].includes(phongBan);
  const canSeeSell = !["Hiện trường", "Điều phối"].includes(phongBan);

  function doiTacTen(id: string | null) {
    return doiTacList.find((d) => d.id === id)?.ten ?? "—";
  }

  async function handleSave(values: Record<string, string>) {
    const payload: Record<string, unknown> = { don_hang_id: donHangId };
    for (const [k, v] of Object.entries(values)) {
      if (["gia_von_buy", "gia_ban_sell", "so_tien_da_thanh_toan"].includes(k)) {
        payload[k] = v === "" ? null : Number(v);
      } else {
        payload[k] = v === "" ? null : v;
      }
    }

    if (editing) {
      const { data, error } = await supabase.from("don_thue_ngoai").update(payload).eq("id", editing.id).select().single();
      if (!error && data) {
        setRows((prev) => prev.map((r) => (r.id === editing.id ? (data as DonThueNgoai) : r)));
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
        .from("don_thue_ngoai")
        .insert({ ...payload, nguoi_nhap_id: nv?.id })
        .select()
        .single();
      if (!error && data) {
        setRows((prev) => [data as DonThueNgoai, ...prev]);
        setShowForm(false);
      } else if (error) {
        window.alert(error.message);
      }
    }
  }

  async function handleDelete(row: DonThueNgoai) {
    if (!window.confirm("Xóa đơn thuê ngoài này?")) return;
    const { error } = await supabase.from("don_thue_ngoai").delete().eq("id", row.id);
    if (!error) setRows((prev) => prev.filter((r) => r.id !== row.id));
  }

  async function handleApprove(row: DonThueNgoai, trangThai: "Đã duyệt" | "Từ chối") {
    const { data, error } = await supabase
      .from("don_thue_ngoai")
      .update({ trang_thai: trangThai })
      .eq("id", row.id)
      .select()
      .single();
    if (!error && data) {
      setRows((prev) => prev.map((r) => (r.id === row.id ? (data as DonThueNgoai) : r)));
    } else if (error) {
      window.alert(error.message);
    }
  }

  async function handleExportExcel() {
    const columns: ExcelColumn[] = [
      { header: "Loại dịch vụ", key: "loai", width: 18 },
      { header: "Đối tác thuê ngoài", key: "doiTac", width: 20 },
      { header: "Nội dung", key: "noiDung", width: 24 },
      { header: "Giá vốn (buy)", key: "giaVon", width: 14 },
      ...(canSeeSell ? [{ header: "Giá bán (sell)", key: "giaBan", width: 14 }] : []),
      { header: "Tình trạng thanh toán", key: "ttThanhToan", width: 16 },
      { header: "Đã thanh toán", key: "daThanhToan", width: 14 },
      { header: "Còn phải trả", key: "conPhaiTra", width: 14 },
      { header: "Ngày thuê", key: "ngayThue", width: 12 },
      { header: "Trạng thái", key: "trangThai", width: 12 },
    ];
    const rows_ = rows.map((r) => [
      r.loai_dich_vu_thue ?? "",
      doiTacTen(r.doi_tac_thue_ngoai_id),
      r.noi_dung ?? "",
      r.gia_von_buy ?? "",
      ...(canSeeSell ? [r.gia_ban_sell ?? ""] : []),
      r.tinh_trang_thanh_toan,
      r.so_tien_da_thanh_toan ?? "",
      (r.gia_von_buy ?? 0) - (r.so_tien_da_thanh_toan ?? 0),
      r.ngay_thue,
      r.trang_thai,
    ]);
    await xuatExcelKeO(`thue-ngoai-${soDonHang}.xlsx`, {
      sheetName: "Thuê ngoài",
      headerLines: [`THUÊ NGOÀI — Đơn ${soDonHang}`],
      columns,
      rows: rows_,
    });
  }

  function handleDownloadTemplate() {
    const headers = [
      "Loại dịch vụ *",
      "Đối tác thuê ngoài *",
      "Nội dung",
      "Giá vốn (buy) *",
      ...(canSeeSell ? ["Giá bán (sell)"] : []),
      "Ngày thuê (yyyy-mm-dd)",
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mẫu nhập thuê ngoài");
    const guideRows = [
      ["Cột", "Giá trị hợp lệ"],
      ["Loại dịch vụ", LOAI_DICH_VU.join(", ")],
      ["Đối tác thuê ngoài", doiTacList.map((d) => d.ten).join(", ")],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(guideRows), "Hướng dẫn");
    XLSX.writeFile(wb, `mau-nhap-thue-ngoai-${soDonHang}.xlsx`);
  }

  async function handleImportFile(file: File) {
    setImporting(true);
    setImportMsg(null);
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array", cellDates: true });
    const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]], { defval: "" });

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

      const loaiName = get("Loại dịch vụ *") || get("Loại dịch vụ");
      const loai = LOAI_DICH_VU.find((l) => l.toLowerCase() === loaiName.toLowerCase());
      if (!loai) {
        errors.push(`Dòng ${rowNum}: loại dịch vụ "${loaiName}" không hợp lệ.`);
        return;
      }
      const doiTacName = get("Đối tác thuê ngoài *") || get("Đối tác thuê ngoài");
      const doiTac = doiTacList.find((d) => d.ten.toLowerCase() === doiTacName.toLowerCase());
      if (!doiTac) {
        errors.push(`Dòng ${rowNum}: không tìm thấy đối tác "${doiTacName}".`);
        return;
      }
      const giaVon = get("Giá vốn (buy) *") || get("Giá vốn (buy)");
      if (!giaVon) {
        errors.push(`Dòng ${rowNum}: thiếu Giá vốn (buy).`);
        return;
      }

      records.push({
        don_hang_id: donHangId,
        loai_dich_vu_thue: loai,
        doi_tac_thue_ngoai_id: doiTac.id,
        noi_dung: get("Nội dung") || null,
        gia_von_buy: Number(giaVon),
        gia_ban_sell: canSeeSell && get("Giá bán (sell)") ? Number(get("Giá bán (sell)")) : null,
        ngay_thue: get("Ngày thuê (yyyy-mm-dd)") || new Date().toISOString().slice(0, 10),
        nguoi_nhap_id: nv?.id,
      });
    });

    if (records.length === 0) {
      setImportMsg(errors.length ? errors.join(" | ") : "File không có dòng hợp lệ.");
      setImporting(false);
      return;
    }

    const { data, error } = await supabase.from("don_thue_ngoai").insert(records).select();
    setImporting(false);
    if (error) {
      setImportMsg(`Lỗi: ${error.message}`);
      return;
    }
    setRows((prev) => [...((data as DonThueNgoai[]) ?? []), ...prev]);
    setImportMsg(`Đã nhập ${data?.length ?? 0} dòng${errors.length ? `, lỗi: ${errors.join(" | ")}` : "."}`);
  }

  const tongPhaiTra = rows.reduce((s, r) => s + ((r.gia_von_buy ?? 0) - (r.so_tien_da_thanh_toan ?? 0)), 0);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900">Thuê dịch vụ ngoài / mua cước ngoài</h2>
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
                + Thêm
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
              <span className="font-medium text-slate-900">{row.loai_dich_vu_thue}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TRANG_THAI_COLOR[row.trang_thai]}`}>{row.trang_thai}</span>
            </div>
            <p className="text-slate-500">
              {doiTacTen(row.doi_tac_thue_ngoai_id)} · Buy: {(row.gia_von_buy ?? 0).toLocaleString("en-US")}
              {canSeeSell && row.gia_ban_sell ? ` · Sell: ${row.gia_ban_sell.toLocaleString("en-US")}` : ""}
            </p>
            <p className="text-slate-500">
              Thanh toán: {row.tinh_trang_thanh_toan}
              {row.so_tien_da_thanh_toan ? ` (đã trả ${row.so_tien_da_thanh_toan.toLocaleString("en-US")})` : ""}
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
              {canApprove && row.trang_thai === "Chờ duyệt" && (
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
        {rows.length === 0 && <p className="text-sm text-slate-400">Chưa có đơn thuê ngoài nào.</p>}
      </div>

      {rows.length > 0 && (
        <p className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-600">
          Còn phải trả cho đối tác: <strong>{tongPhaiTra.toLocaleString("en-US")}</strong>
        </p>
      )}

      {showForm && (
        <ThueNgoaiForm
          initial={editing}
          doiTacList={doiTacList}
          onDoiTacAdded={(row) => setDoiTacList((prev) => [...prev, row])}
          canSeeSell={canSeeSell}
          onCancel={() => setShowForm(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

function ThueNgoaiForm({
  initial,
  doiTacList,
  onDoiTacAdded,
  canSeeSell,
  onCancel,
  onSave,
}: {
  initial: DonThueNgoai | null;
  doiTacList: Option[];
  onDoiTacAdded: (row: Option) => void;
  canSeeSell: boolean;
  onCancel: () => void;
  onSave: (values: Record<string, string>) => void;
}) {
  const [values, setValues] = useState({
    loai_dich_vu_thue: initial?.loai_dich_vu_thue ?? "",
    doi_tac_thue_ngoai_id: initial?.doi_tac_thue_ngoai_id ?? "",
    noi_dung: initial?.noi_dung ?? "",
    gia_von_buy: initial?.gia_von_buy?.toString() ?? "",
    gia_ban_sell: initial?.gia_ban_sell?.toString() ?? "",
    tinh_trang_thanh_toan: initial?.tinh_trang_thanh_toan ?? "Chưa thanh toán",
    so_tien_da_thanh_toan: initial?.so_tien_da_thanh_toan?.toString() ?? "",
    phuong_thuc_thanh_toan: initial?.phuong_thuc_thanh_toan ?? "",
    ngay_thue: initial?.ngay_thue ?? new Date().toISOString().slice(0, 10),
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
        <h2 className="mb-4 text-lg font-semibold text-slate-900">{initial ? "Sửa đơn thuê ngoài" : "Thêm đơn thuê ngoài"}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Loại dịch vụ</label>
            <select required value={values.loai_dich_vu_thue} onChange={(e) => set("loai_dich_vu_thue", e.target.value)} className={cls}>
              <option value="">-- Chọn --</option>
              {LOAI_DICH_VU.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Đối tác thuê ngoài</label>
            <QuickAddDoiTacThueNgoai
              options={doiTacList}
              value={values.doi_tac_thue_ngoai_id}
              onChange={(v) => set("doi_tac_thue_ngoai_id", v)}
              onAdded={onDoiTacAdded}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Nội dung</label>
            <input value={values.noi_dung} onChange={(e) => set("noi_dung", e.target.value)} className={cls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Giá vốn (buy)</label>
            <MoneyInput required value={values.gia_von_buy} onChange={(v) => set("gia_von_buy", v)} className={cls} />
          </div>
          {canSeeSell && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Giá bán (sell)</label>
              <MoneyInput value={values.gia_ban_sell} onChange={(v) => set("gia_ban_sell", v)} className={cls} />
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Ngày thuê</label>
            <input type="date" value={values.ngay_thue} onChange={(e) => set("ngay_thue", e.target.value)} className={cls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Tình trạng thanh toán</label>
            <select value={values.tinh_trang_thanh_toan} onChange={(e) => set("tinh_trang_thanh_toan", e.target.value)} className={cls}>
              {TT_THANH_TOAN.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Đã thanh toán</label>
            <MoneyInput value={values.so_tien_da_thanh_toan} onChange={(v) => set("so_tien_da_thanh_toan", v)} className={cls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Phương thức thanh toán</label>
            <select value={values.phuong_thuc_thanh_toan} onChange={(e) => set("phuong_thuc_thanh_toan", e.target.value)} className={cls}>
              <option value="">-- Chọn --</option>
              <option value="Tiền mặt">Tiền mặt</option>
              <option value="Tài khoản công ty">Tài khoản công ty</option>
            </select>
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
