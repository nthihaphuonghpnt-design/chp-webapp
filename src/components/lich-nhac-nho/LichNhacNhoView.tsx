"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { xuatExcelKeO, type ExcelColumn } from "@/lib/excel";
import { createClient } from "@/lib/supabase/client";
import SearchableSelect from "@/components/common/SearchableSelect";

interface PhongBan {
  id: string;
  ten: string;
}
interface NhanVien {
  id: string;
  ho_ten: string;
}
interface DonHangOpt {
  id: string;
  so_don_hang: string;
}

interface Row {
  id: string;
  phong_ban_id: string;
  don_hang_id: string | null;
  noi_dung: string;
  nguoi_phu_trach_id: string | null;
  nguoi_tao_id: string | null;
  ngay_du_kien: string;
  trang_thai: "Chưa thực hiện" | "Đã thực hiện";
  don_hang: { so_don_hang: string } | { so_don_hang: string }[] | null;
  nguoi_phu_trach: { ho_ten: string } | { ho_ten: string }[] | null;
  phong_ban: { ten: string } | { ten: string }[] | null;
}

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? v[0] ?? null : v;
}

function daysUntil(dateStr: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function statusColor(row: Row) {
  if (row.trang_thai === "Đã thực hiện") return "bg-green-100 text-green-700";
  const d = daysUntil(row.ngay_du_kien);
  if (d < 0) return "bg-red-100 text-red-700";
  if (d <= 3) return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

export default function LichNhacNhoView({
  thangNam,
  phongBanFilter,
  initialRows,
  phongBanList,
  nhanVienList,
  donHangList,
  currentUserId,
  currentPhongBan,
}: {
  thangNam: string;
  phongBanFilter: string;
  initialRows: Row[];
  phongBanList: PhongBan[];
  nhanVienList: NhanVien[];
  donHangList: DonHangOpt[];
  currentUserId?: string;
  currentPhongBan?: string;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  const [year, month] = thangNam.split("-").map(Number);

  function goToMonth(newThang: string) {
    const params = new URLSearchParams();
    params.set("thang", newThang);
    if (phongBanFilter) params.set("phong_ban", phongBanFilter);
    router.push(`/lich-nhac-nho?${params.toString()}`);
  }

  function changePhongBan(pb: string) {
    const params = new URLSearchParams();
    params.set("thang", thangNam);
    if (pb) params.set("phong_ban", pb);
    router.push(`/lich-nhac-nho?${params.toString()}`);
  }

  function shiftMonth(delta: number) {
    const d = new Date(Date.UTC(year, month - 1 + delta, 1));
    goToMonth(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }

  function canEditRow(row: Row) {
    if (row.nguoi_phu_trach_id === currentUserId || row.nguoi_tao_id === currentUserId) return true;
    if (currentPhongBan === "Kế toán") return true;
    const pb = one(row.phong_ban)?.ten ?? phongBanTen(row.phong_ban_id);
    return pb === currentPhongBan;
  }

  function phongBanTen(id: string) {
    return phongBanList.find((p) => p.id === id)?.ten ?? "—";
  }
  function nhanVienTen(id: string | null) {
    return nhanVienList.find((n) => n.id === id)?.ho_ten ?? "—";
  }

  async function handleSave(values: Record<string, string>) {
    const payload: Record<string, unknown> = {
      phong_ban_id: values.phong_ban_id || null,
      don_hang_id: values.don_hang_id || null,
      noi_dung: values.noi_dung,
      nguoi_phu_trach_id: values.nguoi_phu_trach_id || null,
      ngay_du_kien: values.ngay_du_kien,
    };

    if (editing) {
      const { data, error } = await supabase
        .from("lich_nhac_nho")
        .update(payload)
        .eq("id", editing.id)
        .select("*, don_hang:don_hang_id(so_don_hang), nguoi_phu_trach:nguoi_phu_trach_id(ho_ten), phong_ban:phong_ban_id(ten)")
        .single();
      if (!error && data) {
        setRows((prev) => prev.map((r) => (r.id === editing.id ? (data as Row) : r)));
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
        .from("lich_nhac_nho")
        .insert({ ...payload, nguoi_tao_id: nv?.id })
        .select("*, don_hang:don_hang_id(so_don_hang), nguoi_phu_trach:nguoi_phu_trach_id(ho_ten), phong_ban:phong_ban_id(ten)")
        .single();
      if (!error && data) {
        setRows((prev) => [...prev, data as Row]);
        setShowForm(false);
      } else if (error) {
        window.alert(error.message);
      }
    }
  }

  async function toggleDone(row: Row) {
    const newStatus = row.trang_thai === "Đã thực hiện" ? "Chưa thực hiện" : "Đã thực hiện";
    const { data, error } = await supabase
      .from("lich_nhac_nho")
      .update({ trang_thai: newStatus })
      .eq("id", row.id)
      .select("*, don_hang:don_hang_id(so_don_hang), nguoi_phu_trach:nguoi_phu_trach_id(ho_ten), phong_ban:phong_ban_id(ten)")
      .single();
    if (!error && data) setRows((prev) => prev.map((r) => (r.id === row.id ? (data as Row) : r)));
  }

  async function handleDelete(row: Row) {
    if (!window.confirm("Xóa nhắc nhở này?")) return;
    const { error } = await supabase.from("lich_nhac_nho").delete().eq("id", row.id);
    if (!error) setRows((prev) => prev.filter((r) => r.id !== row.id));
  }

  async function handleExportExcel() {
    const columns: ExcelColumn[] = [
      { header: "Phòng ban", key: "phongBan", width: 14 },
      { header: "Nội dung", key: "noiDung", width: 32 },
      { header: "Đơn hàng liên quan", key: "donHang", width: 16 },
      { header: "Người phụ trách", key: "nguoiPhuTrach", width: 18 },
      { header: "Ngày dự kiến", key: "ngay", width: 12 },
      { header: "Còn lại (ngày)", key: "conLai", width: 12 },
      { header: "Trạng thái", key: "trangThai", width: 14 },
    ];
    const rows_ = rows.map((r) => [
      one(r.phong_ban)?.ten ?? phongBanTen(r.phong_ban_id),
      r.noi_dung,
      one(r.don_hang)?.so_don_hang ?? "",
      one(r.nguoi_phu_trach)?.ho_ten ?? nhanVienTen(r.nguoi_phu_trach_id),
      r.ngay_du_kien,
      daysUntil(r.ngay_du_kien),
      r.trang_thai,
    ]);
    await xuatExcelKeO(`lich-nhac-nho-${thangNam}.xlsx`, {
      sheetName: "Lịch nhắc nhở",
      headerLines: [`LỊCH NHẮC NHỞ — ${thangNam}`],
      columns,
      rows: rows_,
    });
  }

  function handleDownloadTemplate() {
    const headers = ["Phòng ban *", "Nội dung *", "Đơn hàng liên quan (số đơn)", "Người phụ trách", "Ngày dự kiến (yyyy-mm-dd) *"];
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mẫu nhập");
    const guideRows = [
      ["Cột", "Giá trị hợp lệ"],
      ["Phòng ban", phongBanList.map((p) => p.ten).join(", ")],
      ["Người phụ trách", nhanVienList.map((n) => n.ho_ten).join(", ")],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(guideRows), "Hướng dẫn");
    XLSX.writeFile(wb, "mau-nhap-lich-nhac-nho.xlsx");
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

      const pbName = get("Phòng ban *") || get("Phòng ban");
      const pb = phongBanList.find((p) => p.ten.toLowerCase() === pbName.toLowerCase());
      if (!pb) {
        errors.push(`Dòng ${rowNum}: không tìm thấy phòng ban "${pbName}".`);
        return;
      }
      const noiDung = get("Nội dung *") || get("Nội dung");
      if (!noiDung) {
        errors.push(`Dòng ${rowNum}: thiếu Nội dung.`);
        return;
      }
      const ngay = get("Ngày dự kiến (yyyy-mm-dd) *") || get("Ngày dự kiến (yyyy-mm-dd)");
      if (!ngay) {
        errors.push(`Dòng ${rowNum}: thiếu Ngày dự kiến.`);
        return;
      }
      const donHangSo = get("Đơn hàng liên quan (số đơn)");
      const donHang = donHangSo ? donHangList.find((d) => d.so_don_hang.toLowerCase() === donHangSo.toLowerCase()) : null;
      const nvName = get("Người phụ trách");
      const nvMatch = nvName ? nhanVienList.find((n) => n.ho_ten.toLowerCase() === nvName.toLowerCase()) : null;

      records.push({
        phong_ban_id: pb.id,
        noi_dung: noiDung,
        don_hang_id: donHang?.id ?? null,
        nguoi_phu_trach_id: nvMatch?.id ?? null,
        ngay_du_kien: ngay,
        nguoi_tao_id: nv?.id,
      });
    });

    if (records.length === 0) {
      setImportMsg(errors.length ? errors.join(" | ") : "File không có dòng hợp lệ.");
      setImporting(false);
      return;
    }

    const { data, error } = await supabase
      .from("lich_nhac_nho")
      .insert(records)
      .select("*, don_hang:don_hang_id(so_don_hang), nguoi_phu_trach:nguoi_phu_trach_id(ho_ten), phong_ban:phong_ban_id(ten)");
    setImporting(false);
    if (error) {
      setImportMsg(`Lỗi: ${error.message}`);
      return;
    }
    setRows((prev) => [...prev, ...((data as Row[]) ?? [])]);
    setImportMsg(`Đã nhập ${data?.length ?? 0} dòng${errors.length ? `, lỗi: ${errors.join(" | ")}` : "."}`);
    router.refresh();
  }

  const displayRows = selectedDay ? rows.filter((r) => r.ngay_du_kien === selectedDay) : rows;

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const cells: (number | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const rowsByDay = new Map<number, Row[]>();
  rows.forEach((r) => {
    const day = Number(r.ngay_du_kien.slice(8, 10));
    rowsByDay.set(day, [...(rowsByDay.get(day) ?? []), r]);
  });

  const donHangOptions = donHangList.map((d) => ({ value: d.id, label: d.so_don_hang }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Lịch nhắc nhở</h1>
        <button
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm"
        >
          + Thêm nhắc nhở
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button onClick={() => shiftMonth(-1)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          ← Tháng trước
        </button>
        <span className="text-sm font-medium text-slate-700">
          Tháng {month}/{year}
        </span>
        <button onClick={() => shiftMonth(1)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          Tháng sau →
        </button>
        <select
          value={phongBanFilter}
          onChange={(e) => changePhongBan(e.target.value)}
          className="ml-auto rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">Tất cả phòng ban</option>
          {phongBanList.map((p) => (
            <option key={p.id} value={p.id}>
              {p.ten}
            </option>
          ))}
        </select>
        <button onClick={handleExportExcel} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          Xuất Excel
        </button>
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
      </div>

      {importMsg && <p className="mb-4 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">{importMsg}</p>}

      {/* Calendar grid */}
      <div className="mb-6 grid grid-cols-7 gap-1 rounded-xl border border-slate-200 bg-white p-2 text-center text-xs">
        {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map((d) => (
          <div key={d} className="py-1 font-medium text-slate-400">
            {d}
          </div>
        ))}
        {cells.map((day, i) => {
          const dayRows = day ? rowsByDay.get(day) ?? [] : [];
          const hasOverdue = dayRows.some((r) => r.trang_thai !== "Đã thực hiện" && daysUntil(r.ngay_du_kien) < 0);
          const dateStr = day ? `${thangNam}-${String(day).padStart(2, "0")}` : "";
          return (
            <button
              type="button"
              key={i}
              disabled={!day}
              onClick={() => setSelectedDay(selectedDay === dateStr ? null : dateStr)}
              className={`flex h-14 flex-col items-center justify-center rounded-lg border text-xs ${
                !day
                  ? "border-transparent"
                  : selectedDay === dateStr
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-100 hover:bg-slate-50"
              }`}
            >
              {day && (
                <>
                  <span className="text-slate-700">{day}</span>
                  {dayRows.length > 0 && (
                    <span className={`mt-0.5 rounded-full px-1.5 text-[10px] ${hasOverdue ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"}`}>
                      {dayRows.length}
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </div>

      {selectedDay && (
        <button onClick={() => setSelectedDay(null)} className="mb-3 text-xs font-medium text-blue-600">
          ✕ Bỏ lọc ngày {selectedDay}
        </button>
      )}

      {/* List */}
      <div className="flex flex-col gap-2">
        {displayRows.map((row, idx) => {
          const d = daysUntil(row.ngay_du_kien);
          return (
            <div key={row.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-slate-900">
                  #{idx + 1} {row.noi_dung}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(row)}`}>
                  {row.trang_thai === "Đã thực hiện" ? "Đã thực hiện" : d < 0 ? `Quá hạn ${-d} ngày` : d === 0 ? "Hôm nay" : `Còn ${d} ngày`}
                </span>
              </div>
              <p className="text-slate-500">
                {one(row.phong_ban)?.ten ?? phongBanTen(row.phong_ban_id)}
                {" · "}
                {one(row.nguoi_phu_trach)?.ho_ten ?? nhanVienTen(row.nguoi_phu_trach_id)}
                {one(row.don_hang)?.so_don_hang ? ` · Đơn: ${one(row.don_hang)?.so_don_hang}` : ""}
                {" · "}
                Ngày dự kiến: {row.ngay_du_kien}
              </p>
              {canEditRow(row) && (
                <div className="mt-2 flex gap-3">
                  <button onClick={() => toggleDone(row)} className="text-xs font-medium text-green-600">
                    {row.trang_thai === "Đã thực hiện" ? "Bỏ đánh dấu" : "Đánh dấu xong"}
                  </button>
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
          );
        })}
        {displayRows.length === 0 && <p className="py-8 text-center text-sm text-slate-400">Không có nhắc nhở nào.</p>}
      </div>

      {showForm && (
        <NhacNhoForm
          initial={editing}
          phongBanList={phongBanList}
          nhanVienList={nhanVienList}
          donHangOptions={donHangOptions}
          onCancel={() => setShowForm(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

function NhacNhoForm({
  initial,
  phongBanList,
  nhanVienList,
  donHangOptions,
  onCancel,
  onSave,
}: {
  initial: Row | null;
  phongBanList: PhongBan[];
  nhanVienList: NhanVien[];
  donHangOptions: { value: string; label: string }[];
  onCancel: () => void;
  onSave: (values: Record<string, string>) => void;
}) {
  const [values, setValues] = useState({
    phong_ban_id: initial?.phong_ban_id ?? "",
    don_hang_id: initial?.don_hang_id ?? "",
    noi_dung: initial?.noi_dung ?? "",
    nguoi_phu_trach_id: initial?.nguoi_phu_trach_id ?? "",
    ngay_du_kien: initial?.ngay_du_kien ?? new Date().toISOString().slice(0, 10),
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
        <h2 className="mb-4 text-lg font-semibold text-slate-900">{initial ? "Sửa nhắc nhở" : "Thêm nhắc nhở"}</h2>
        <div className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Phòng ban</label>
            <select required value={values.phong_ban_id} onChange={(e) => set("phong_ban_id", e.target.value)} className={cls}>
              <option value="">-- Chọn --</option>
              {phongBanList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.ten}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Nội dung</label>
            <textarea required rows={2} value={values.noi_dung} onChange={(e) => set("noi_dung", e.target.value)} className={cls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Người phụ trách</label>
            <select value={values.nguoi_phu_trach_id} onChange={(e) => set("nguoi_phu_trach_id", e.target.value)} className={cls}>
              <option value="">-- Chọn --</option>
              {nhanVienList.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.ho_ten}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Đơn hàng liên quan (tùy chọn)</label>
            <SearchableSelect options={donHangOptions} value={values.don_hang_id} onChange={(v) => set("don_hang_id", v)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Ngày dự kiến</label>
            <input required type="date" value={values.ngay_du_kien} onChange={(e) => set("ngay_du_kien", e.target.value)} className={cls} />
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
