"use client";

import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { xuatExcelKeO, CONG_TY_HEADER_LINES, taiLogoCongTy, type ExcelColumn } from "@/lib/excel";
import { createClient } from "@/lib/supabase/client";
import SearchableSelect from "@/components/common/SearchableSelect";
import FileAttachSection from "@/components/common/FileAttachSection";
import QuickAddKhachHang from "@/components/common/QuickAddKhachHang";
import QuickAddNhaCungCap from "@/components/common/QuickAddNhaCungCap";
import type { DinhKem } from "@/types/database";

interface DoiTac {
  id: string;
  ten_day_du?: string;
  ten_viet_tat?: string | null;
  ten?: string;
  nhom_khach_hang_ten?: string | null;
}

/** Kem ten nhom (vd Apple Trans) de chon dung phap nhan, tranh nham giua cac cong ty con cung nhom. */
function khOptionLabel(k: DoiTac) {
  const ten = k.ten_viet_tat || k.ten_day_du || k.ten || "";
  return k.nhom_khach_hang_ten ? `${ten} — (${k.nhom_khach_hang_ten})` : ten;
}

interface Row {
  id: string;
  khach_hang_id: string | null;
  nha_cung_cap_id: string | null;
  so_hop_dong: string | null;
  loai_hop_dong: string | null;
  ngay_hieu_luc: string | null;
  ngay_het_han: string | null;
  trang_thai_hop_dong: "Chưa có hợp đồng" | "Đã có hợp đồng" | "Không cần hợp đồng";
  ghi_chu: string | null;
  khach_hang: DoiTac | DoiTac[] | null;
  nha_cung_cap: DoiTac | DoiTac[] | null;
}

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? v[0] ?? null : v;
}

function doiTuongTen(row: Row) {
  const kh = one(row.khach_hang);
  if (kh) return { ten: kh.ten_viet_tat || kh.ten_day_du || "—", loai: "Khách hàng" };
  const ncc = one(row.nha_cung_cap);
  if (ncc) return { ten: ncc.ten || "—", loai: "Nhà cung cấp" };
  return { ten: "—", loai: "" };
}

const LOAI_HOP_DONG = ["Dịch vụ logistics", "Ủy thác XNK", "Khác"];

function trangThaiHieuLuc(row: Row) {
  const today = new Date().toISOString().slice(0, 10);
  if (row.ngay_het_han && row.ngay_het_han < today) return { label: "Hết hạn", color: "bg-red-100 text-red-700" };
  if (row.ngay_hieu_luc && row.ngay_hieu_luc > today) return { label: "Chưa hiệu lực", color: "bg-slate-100 text-slate-600" };
  return { label: "Còn hiệu lực", color: "bg-green-100 text-green-700" };
}

const HOP_DONG_COLOR: Record<string, string> = {
  "Chưa có hợp đồng": "bg-red-100 text-red-700",
  "Đã có hợp đồng": "bg-green-100 text-green-700",
  "Không cần hợp đồng": "bg-slate-100 text-slate-500",
};

export default function HopDongView({
  initialRows,
  khachHangList: initialKhachHangList,
  nhaCungCapList: initialNhaCungCapList,
  nhomKhachHangList,
  dinhKemRows,
  canEdit,
  canDelete,
  currentUserId,
}: {
  initialRows: Row[];
  khachHangList: DoiTac[];
  nhaCungCapList: DoiTac[];
  nhomKhachHangList: { id: string; ten: string }[];
  dinhKemRows: DinhKem[];
  canEdit: boolean;
  canDelete: boolean;
  currentUserId?: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [khachHangList, setKhachHangList] = useState<DoiTac[]>(initialKhachHangList);
  const [nhaCungCapList, setNhaCungCapList] = useState<DoiTac[]>(initialNhaCungCapList);
  const [query, setQuery] = useState("");
  const [khFilter, setKhFilter] = useState("");
  const [nccFilter, setNccFilter] = useState("");
  const [chuaCoHopDongOnly, setChuaCoHopDongOnly] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  const khOptions = khachHangList.map((k) => ({ value: k.id, label: khOptionLabel(k) }));
  const nccOptions = nhaCungCapList.map((n) => ({ value: n.id, label: n.ten ?? "" }));

  const filtered = rows
    .filter((r) => !chuaCoHopDongOnly || r.trang_thai_hop_dong === "Chưa có hợp đồng")
    .filter((r) => !khFilter || r.khach_hang_id === khFilter)
    .filter((r) => !nccFilter || r.nha_cung_cap_id === nccFilter)
    .filter((r) => {
      if (!query) return true;
      const q = query.toLowerCase();
      return (r.so_hop_dong ?? "").toLowerCase().includes(q) || doiTuongTen(r).ten.toLowerCase().includes(q);
    });

  async function refetchRow(id: string) {
    const { data } = await supabase
      .from("hop_dong_khach_hang")
      .select("*, khach_hang:khach_hang_id(ten_day_du, ten_viet_tat), nha_cung_cap:nha_cung_cap_id(ten)")
      .eq("id", id)
      .single();
    if (data) setRows((prev) => prev.map((r) => (r.id === id ? (data as Row) : r)));
  }

  async function handleSave(values: Record<string, string>) {
    const payload: Record<string, unknown> = {
      khach_hang_id: values.doi_tuong === "khach_hang" ? values.doi_tuong_id || null : null,
      nha_cung_cap_id: values.doi_tuong === "nha_cung_cap" ? values.doi_tuong_id || null : null,
      so_hop_dong: values.so_hop_dong || null,
      loai_hop_dong: values.loai_hop_dong || null,
      ngay_hieu_luc: values.ngay_hieu_luc || null,
      ngay_het_han: values.ngay_het_han || null,
      ghi_chu: values.ghi_chu || null,
    };

    if (editing) {
      const { error } = await supabase.from("hop_dong_khach_hang").update(payload).eq("id", editing.id);
      if (error) {
        window.alert(error.message);
        return;
      }
      await refetchRow(editing.id);
      setShowForm(false);
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data: nv } = await supabase.from("nhan_vien").select("id").eq("auth_user_id", user?.id).single();

      const { data, error } = await supabase
        .from("hop_dong_khach_hang")
        .insert({ ...payload, nguoi_tao_id: nv?.id })
        .select("*, khach_hang:khach_hang_id(ten_day_du, ten_viet_tat), nha_cung_cap:nha_cung_cap_id(ten)")
        .single();
      if (!error && data) {
        setRows((prev) => [data as Row, ...prev]);
        setShowForm(false);
      } else if (error) {
        window.alert(error.message);
      }
    }
  }

  async function handleDelete(row: Row) {
    if (!window.confirm(`Xóa hợp đồng "${row.so_hop_dong ?? ""}"?`)) return;
    const { error } = await supabase.from("hop_dong_khach_hang").delete().eq("id", row.id);
    if (!error) setRows((prev) => prev.filter((r) => r.id !== row.id));
  }

  async function handleSetTrangThaiHopDong(row: Row, trangThai: Row["trang_thai_hop_dong"]) {
    const { error } = await supabase.from("hop_dong_khach_hang").update({ trang_thai_hop_dong: trangThai }).eq("id", row.id);
    if (!error) {
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, trang_thai_hop_dong: trangThai } : r)));
    } else {
      window.alert(error.message);
    }
  }

  async function handleExportExcel() {
    const columns: ExcelColumn[] = [
      { header: "Đối tượng", key: "doiTuong", width: 12 },
      { header: "Tên", key: "ten", width: 22 },
      { header: "Số hợp đồng", key: "soHopDong", width: 16 },
      { header: "Loại hợp đồng", key: "loaiHopDong", width: 16 },
      { header: "Ngày hiệu lực", key: "hieuLuc", width: 12 },
      { header: "Ngày hết hạn", key: "hetHan", width: 12 },
      { header: "Trạng thái hợp đồng", key: "trangThaiHd", width: 16 },
      { header: "Trạng thái hiệu lực", key: "trangThaiHl", width: 16 },
      { header: "Ghi chú", key: "ghiChu", width: 20 },
    ];
    const rows = filtered.map((r) => [
      doiTuongTen(r).loai,
      doiTuongTen(r).ten,
      r.so_hop_dong ?? "",
      r.loai_hop_dong ?? "",
      r.ngay_hieu_luc ?? "",
      r.ngay_het_han ?? "",
      r.trang_thai_hop_dong,
      trangThaiHieuLuc(r).label,
      r.ghi_chu ?? "",
    ]);
    const logo = await taiLogoCongTy();
    await xuatExcelKeO("hop-dong.xlsx", {
      sheetName: "Hợp đồng",
      logo: logo ?? undefined,
      headerLines: [...CONG_TY_HEADER_LINES, "", { text: "DANH SÁCH HỢP ĐỒNG", bold: true, size: 12 }],
      columns,
      rows,
    });
  }

  function handleDownloadTemplate() {
    const headers = [
      "Đối tượng * (Khách hàng/Nhà cung cấp)",
      "Tên *",
      "Số hợp đồng",
      "Loại hợp đồng",
      "Ngày hiệu lực (yyyy-mm-dd)",
      "Ngày hết hạn (yyyy-mm-dd)",
      "Ghi chú",
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mẫu nhập");
    const guideRows = [
      ["Cột", "Giá trị hợp lệ"],
      ["Đối tượng", "Khách hàng, Nhà cung cấp"],
      ["Tên (nếu Khách hàng)", khachHangList.map((k) => k.ten_viet_tat || k.ten_day_du).join(", ")],
      ["Tên (nếu Nhà cung cấp)", nhaCungCapList.map((n) => n.ten).join(", ")],
      ["Loại hợp đồng", LOAI_HOP_DONG.join(", ")],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(guideRows), "Hướng dẫn");
    XLSX.writeFile(wb, "mau-nhap-hop-dong.xlsx");
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
      const get = (h: string) => {
        const v = norm[h.toLowerCase()];
        return v instanceof Date ? v.toISOString().slice(0, 10) : String(v ?? "").trim();
      };

      const doiTuong = get("Đối tượng * (Khách hàng/Nhà cung cấp)") || get("Đối tượng");
      const ten = get("Tên *") || get("Tên");
      let khId: string | null = null;
      let nccId: string | null = null;
      if (doiTuong === "Khách hàng") {
        const kh = khachHangList.find((k) => (k.ten_viet_tat || k.ten_day_du || "").toLowerCase() === ten.toLowerCase());
        if (!kh) {
          errors.push(`Dòng ${rowNum}: không tìm thấy khách hàng "${ten}".`);
          return;
        }
        khId = kh.id;
      } else if (doiTuong === "Nhà cung cấp") {
        const ncc = nhaCungCapList.find((n) => (n.ten ?? "").toLowerCase() === ten.toLowerCase());
        if (!ncc) {
          errors.push(`Dòng ${rowNum}: không tìm thấy nhà cung cấp "${ten}".`);
          return;
        }
        nccId = ncc.id;
      } else {
        errors.push(`Dòng ${rowNum}: Đối tượng "${doiTuong}" không hợp lệ.`);
        return;
      }

      records.push({
        khach_hang_id: khId,
        nha_cung_cap_id: nccId,
        so_hop_dong: get("Số hợp đồng") || null,
        loai_hop_dong: LOAI_HOP_DONG.includes(get("Loại hợp đồng")) ? get("Loại hợp đồng") : null,
        ngay_hieu_luc: get("Ngày hiệu lực (yyyy-mm-dd)") || null,
        ngay_het_han: get("Ngày hết hạn (yyyy-mm-dd)") || null,
        ghi_chu: get("Ghi chú") || null,
        nguoi_tao_id: nv?.id,
      });
    });

    if (records.length === 0) {
      setImportMsg(errors.length ? errors.join(" | ") : "File không có dòng hợp lệ.");
      setImporting(false);
      return;
    }

    const { data, error } = await supabase
      .from("hop_dong_khach_hang")
      .insert(records)
      .select("*, khach_hang:khach_hang_id(ten_day_du, ten_viet_tat), nha_cung_cap:nha_cung_cap_id(ten)");
    setImporting(false);
    if (error) {
      setImportMsg(`Lỗi: ${error.message}`);
      return;
    }
    setRows((prev) => [...((data as Row[]) ?? []), ...prev]);
    setImportMsg(`Đã nhập ${data?.length ?? 0} dòng${errors.length ? `, lỗi: ${errors.join(" | ")}` : "."}`);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Hợp đồng (Khách hàng &amp; Nhà cung cấp)</h1>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleExportExcel} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            Xuất Excel
          </button>
          {canEdit && (
            <>
              <button onClick={handleDownloadTemplate} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
                Tải mẫu
              </button>
              <label className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-sm">
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
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm"
              >
                + Thêm hợp đồng
              </button>
            </>
          )}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm theo số hợp đồng, tên..."
          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
        />
        <div className="w-full sm:w-56">
          <SearchableSelect
            options={khOptions}
            value={khFilter}
            onChange={(v) => {
              setKhFilter(v);
              if (v) setNccFilter("");
            }}
            placeholder="Lọc theo khách hàng"
          />
        </div>
        <div className="w-full sm:w-56">
          <SearchableSelect
            options={nccOptions}
            value={nccFilter}
            onChange={(v) => {
              setNccFilter(v);
              if (v) setKhFilter("");
            }}
            placeholder="Lọc theo nhà cung cấp"
          />
        </div>
        <label className="flex items-center gap-1.5 text-sm text-slate-600">
          <input type="checkbox" checked={chuaCoHopDongOnly} onChange={(e) => setChuaCoHopDongOnly(e.target.checked)} />
          Chỉ hiện chưa có hợp đồng
        </label>
      </div>

      {importMsg && <p className="mb-4 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">{importMsg}</p>}

      <div className="flex flex-col gap-2">
        {filtered.map((row) => {
          const status = trangThaiHieuLuc(row);
          const dt = doiTuongTen(row);
          return (
            <div key={row.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-slate-900">
                  [{dt.loai}] {dt.ten} {row.so_hop_dong ? `· ${row.so_hop_dong}` : ""}
                </span>
                <div className="flex gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${HOP_DONG_COLOR[row.trang_thai_hop_dong]}`}>
                    {row.trang_thai_hop_dong}
                  </span>
                  {row.trang_thai_hop_dong === "Đã có hợp đồng" && (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}>{status.label}</span>
                  )}
                </div>
              </div>
              <p className="text-slate-500">
                {row.loai_hop_dong ?? "—"} · Hiệu lực: {row.ngay_hieu_luc ?? "—"} → {row.ngay_het_han ?? "—"}
              </p>
              {row.ghi_chu && <p className="text-slate-500">{row.ghi_chu}</p>}
              <FileAttachSection
                parentField="hop_dong_id"
                parentId={row.id}
                pathPrefix="hop-dong"
                lienKetToi="Hợp đồng"
                initialRows={dinhKemRows.filter((d) => d.hop_dong_id === row.id)}
                canUpload={canEdit}
                currentUserId={currentUserId}
              />
              {canEdit && row.trang_thai_hop_dong !== "Đã có hợp đồng" && (
                <label className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                  <input
                    type="checkbox"
                    checked={row.trang_thai_hop_dong === "Không cần hợp đồng"}
                    onChange={(e) =>
                      handleSetTrangThaiHopDong(row, e.target.checked ? "Không cần hợp đồng" : "Chưa có hợp đồng")
                    }
                  />
                  Không cần hợp đồng (VD: công ty con chỉ đứng tờ khai, không ký hợp đồng riêng) — bỏ khỏi nhắc nhở
                </label>
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
                  {canDelete && (
                    <button onClick={() => handleDelete(row)} className="text-xs font-medium text-red-600">
                      Xóa
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && <p className="py-8 text-center text-sm text-slate-400">Không có hợp đồng nào.</p>}
      </div>

      {showForm && (
        <HopDongForm
          initial={editing}
          khachHangList={khachHangList}
          nhaCungCapList={nhaCungCapList}
          nhomKhachHangList={nhomKhachHangList}
          onKhachHangAdded={(row) => setKhachHangList((prev) => [...prev, row])}
          onNhaCungCapAdded={(row) => setNhaCungCapList((prev) => [...prev, row])}
          onCancel={() => setShowForm(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

function HopDongForm({
  initial,
  khachHangList,
  nhaCungCapList,
  nhomKhachHangList,
  onKhachHangAdded,
  onNhaCungCapAdded,
  onCancel,
  onSave,
}: {
  initial: Row | null;
  khachHangList: DoiTac[];
  nhaCungCapList: DoiTac[];
  nhomKhachHangList: { id: string; ten: string }[];
  onKhachHangAdded: (row: DoiTac) => void;
  onNhaCungCapAdded: (row: DoiTac) => void;
  onCancel: () => void;
  onSave: (values: Record<string, string>) => void;
}) {
  const initialDoiTuong = initial?.nha_cung_cap_id ? "nha_cung_cap" : "khach_hang";
  const [values, setValues] = useState({
    doi_tuong: initialDoiTuong,
    doi_tuong_id: initial?.khach_hang_id ?? initial?.nha_cung_cap_id ?? "",
    so_hop_dong: initial?.so_hop_dong ?? "",
    loai_hop_dong: initial?.loai_hop_dong ?? "",
    ngay_hieu_luc: initial?.ngay_hieu_luc ?? "",
    ngay_het_han: initial?.ngay_het_han ?? "",
    ghi_chu: initial?.ghi_chu ?? "",
  });

  function set(key: keyof typeof values, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  const daCoDoiTuong = !!initial;
  const khOptions = khachHangList.map((k) => ({ value: k.id, label: khOptionLabel(k) }));
  const nccOptions = nhaCungCapList.map((n) => ({ value: n.id, label: n.ten ?? "" }));
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
        <h2 className="mb-4 text-lg font-semibold text-slate-900">{initial ? "Sửa hợp đồng" : "Thêm hợp đồng"}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Đối tượng</label>
            <select
              disabled={daCoDoiTuong}
              value={values.doi_tuong}
              onChange={(e) => set("doi_tuong", e.target.value)}
              className={cls}
            >
              <option value="khach_hang">Khách hàng</option>
              <option value="nha_cung_cap">Nhà cung cấp</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{values.doi_tuong === "khach_hang" ? "Khách hàng" : "Nhà cung cấp"}</label>
            {daCoDoiTuong ? (
              <input
                disabled
                value={(values.doi_tuong === "khach_hang" ? khOptions : nccOptions).find((o) => o.value === values.doi_tuong_id)?.label ?? ""}
                className={cls}
              />
            ) : values.doi_tuong === "khach_hang" ? (
              <QuickAddKhachHang
                options={khachHangList}
                value={values.doi_tuong_id}
                onChange={(v) => set("doi_tuong_id", v)}
                onAdded={onKhachHangAdded}
                nhomKhachHangList={nhomKhachHangList}
              />
            ) : (
              <QuickAddNhaCungCap
                options={nhaCungCapList}
                value={values.doi_tuong_id}
                onChange={(v) => set("doi_tuong_id", v)}
                onAdded={onNhaCungCapAdded}
              />
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Số hợp đồng</label>
            <input value={values.so_hop_dong} onChange={(e) => set("so_hop_dong", e.target.value)} className={cls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Loại hợp đồng</label>
            <select value={values.loai_hop_dong} onChange={(e) => set("loai_hop_dong", e.target.value)} className={cls}>
              <option value="">-- Chọn --</option>
              {LOAI_HOP_DONG.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Ngày hiệu lực</label>
            <input type="date" value={values.ngay_hieu_luc} onChange={(e) => set("ngay_hieu_luc", e.target.value)} className={cls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Ngày hết hạn</label>
            <input type="date" value={values.ngay_het_han} onChange={(e) => set("ngay_het_han", e.target.value)} className={cls} />
          </div>
        </div>
        <div className="mt-3">
          <label className="mb-1 block text-sm font-medium text-slate-700">Ghi chú</label>
          <textarea rows={2} value={values.ghi_chu} onChange={(e) => set("ghi_chu", e.target.value)} className={cls} />
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
