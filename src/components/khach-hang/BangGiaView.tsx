"use client";

import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { xuatExcelKeO, CONG_TY_HEADER_LINES, taiLogoCongTy, type ExcelColumn } from "@/lib/excel";
import { createClient } from "@/lib/supabase/client";
import SearchableSelect from "@/components/common/SearchableSelect";
import MoneyInput from "@/components/common/MoneyInput";

interface Option {
  id: string;
  ten: string;
}
interface KhachHang {
  id: string;
  ten_day_du: string;
  ten_viet_tat: string | null;
}

interface Row {
  id: string;
  khach_hang_id: string;
  loai_chi_phi_id: string;
  hang_hoa_id: string | null;
  don_gia: number | null;
  don_vi: string | null;
  ghi_chu: string | null;
  dang_hoat_dong: boolean;
}

function khName(kh: KhachHang | undefined) {
  return kh ? kh.ten_viet_tat || kh.ten_day_du : "—";
}

export default function BangGiaView({
  initialRows,
  khachHangList,
  loaiChiPhiList,
  hangHoaList,
  canEdit,
}: {
  initialRows: Row[];
  khachHangList: KhachHang[];
  loaiChiPhiList: Option[];
  hangHoaList: Option[];
  canEdit: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  function khTen(id: string) {
    return khName(khachHangList.find((k) => k.id === id));
  }
  function loaiTen(id: string) {
    return loaiChiPhiList.find((l) => l.id === id)?.ten ?? "—";
  }
  function hangHoaTen(id: string | null) {
    return id ? hangHoaList.find((h) => h.id === id)?.ten ?? "—" : "(mọi mặt hàng)";
  }

  const filtered = rows.filter((r) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return khTen(r.khach_hang_id).toLowerCase().includes(q) || loaiTen(r.loai_chi_phi_id).toLowerCase().includes(q);
  });

  async function handleSave(values: { khach_hang_id: string; loai_chi_phi_id: string; don_gia: string; don_vi: string; ghi_chu: string }, hangHoaIds: string[]) {
    if (editing) {
      const payload = {
        khach_hang_id: values.khach_hang_id,
        loai_chi_phi_id: values.loai_chi_phi_id,
        hang_hoa_id: hangHoaIds[0] ?? null,
        don_gia: values.don_gia ? Number(values.don_gia) : null,
        don_vi: values.don_vi || null,
        ghi_chu: values.ghi_chu || null,
      };
      const { data, error } = await supabase.from("bang_gia_khach_hang").update(payload).eq("id", editing.id).select().single();
      if (!error && data) {
        setRows((prev) => prev.map((r) => (r.id === editing.id ? (data as Row) : r)));
        setShowForm(false);
      } else if (error) {
        window.alert(error.message);
      }
      return;
    }

    // Them moi: neu chon nhieu mat hang -> tao nhieu dong (1 dong/mat hang), cung don gia
    const targets = hangHoaIds.length > 0 ? hangHoaIds : [null];
    const records = targets.map((hid) => ({
      khach_hang_id: values.khach_hang_id,
      loai_chi_phi_id: values.loai_chi_phi_id,
      hang_hoa_id: hid,
      don_gia: values.don_gia ? Number(values.don_gia) : null,
      don_vi: values.don_vi || null,
      ghi_chu: values.ghi_chu || null,
      dang_hoat_dong: true,
    }));

    const { data, error } = await supabase.from("bang_gia_khach_hang").insert(records).select();
    if (!error && data) {
      setRows((prev) => [...(data as Row[]), ...prev]);
      setShowForm(false);
    } else if (error) {
      window.alert(error.message);
    }
  }

  async function toggleStatus(row: Row) {
    const { data, error } = await supabase
      .from("bang_gia_khach_hang")
      .update({ dang_hoat_dong: !row.dang_hoat_dong })
      .eq("id", row.id)
      .select()
      .single();
    if (!error && data) setRows((prev) => prev.map((r) => (r.id === row.id ? (data as Row) : r)));
  }

  async function handleDelete(row: Row) {
    if (!window.confirm("Xóa dòng giá này?")) return;
    const { error } = await supabase.from("bang_gia_khach_hang").delete().eq("id", row.id);
    if (!error) setRows((prev) => prev.filter((r) => r.id !== row.id));
  }

  async function handleExportExcel() {
    const columns: ExcelColumn[] = [
      { header: "Khách hàng", key: "kh", width: 22 },
      { header: "Loại chi phí", key: "loai", width: 18 },
      { header: "Mặt hàng", key: "hangHoa", width: 16 },
      { header: "Đơn giá", key: "donGia", width: 12 },
      { header: "Đơn vị", key: "donVi", width: 10 },
      { header: "Trạng thái", key: "trangThai", width: 16 },
      { header: "Ghi chú", key: "ghiChu", width: 20 },
    ];
    const rows = filtered.map((r) => [
      khTen(r.khach_hang_id),
      loaiTen(r.loai_chi_phi_id),
      hangHoaTen(r.hang_hoa_id),
      r.don_gia ?? "",
      r.don_vi ?? "",
      r.dang_hoat_dong ? "Đang hoạt động" : "Ngừng hoạt động",
      r.ghi_chu ?? "",
    ]);
    const logo = await taiLogoCongTy();
    await xuatExcelKeO("bang-gia-khach-hang.xlsx", {
      sheetName: "Bảng giá",
      logo: logo ?? undefined,
      headerLines: [...CONG_TY_HEADER_LINES, "", { text: "BẢNG GIÁ KHÁCH HÀNG", bold: true, size: 12 }],
      columns,
      rows,
    });
  }

  function handleDownloadTemplate() {
    const headers = ["Khách hàng *", "Loại chi phí *", "Mặt hàng (để trống = mọi mặt hàng)", "Đơn giá *", "Đơn vị", "Ghi chú"];
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mẫu nhập");
    const guideRows = [
      ["Cột", "Giá trị hợp lệ"],
      ["Khách hàng", khachHangList.map((k) => k.ten_viet_tat || k.ten_day_du).join(", ")],
      ["Loại chi phí", loaiChiPhiList.map((l) => l.ten).join(", ")],
      ["Mặt hàng", hangHoaList.map((h) => h.ten).join(", ")],
      ["Nhiều mặt hàng cùng giá", "Xuống dòng riêng cho từng mặt hàng, giữ nguyên Khách hàng + Loại chi phí + Đơn giá"],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(guideRows), "Hướng dẫn");
    XLSX.writeFile(wb, "mau-nhap-bang-gia.xlsx");
  }

  async function handleImportFile(file: File) {
    setImporting(true);
    setImportMsg(null);
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]], { defval: "" });

    const records: Record<string, unknown>[] = [];
    const errors: string[] = [];

    raw.forEach((rawRow, idx) => {
      const rowNum = idx + 2;
      const norm: Record<string, unknown> = {};
      for (const key of Object.keys(rawRow)) norm[key.trim().toLowerCase()] = rawRow[key];
      const get = (h: string) => String(norm[h.toLowerCase()] ?? "").trim();

      const khN = get("Khách hàng *") || get("Khách hàng");
      const kh = khachHangList.find((k) => (k.ten_viet_tat || k.ten_day_du).toLowerCase() === khN.toLowerCase() || k.ten_day_du.toLowerCase() === khN.toLowerCase());
      if (!kh) {
        errors.push(`Dòng ${rowNum}: không tìm thấy khách hàng "${khN}".`);
        return;
      }
      const loaiN = get("Loại chi phí *") || get("Loại chi phí");
      const loai = loaiChiPhiList.find((l) => l.ten.toLowerCase() === loaiN.toLowerCase());
      if (!loai) {
        errors.push(`Dòng ${rowNum}: không tìm thấy loại chi phí "${loaiN}".`);
        return;
      }
      const hangHoaN = get("Mặt hàng (để trống = mọi mặt hàng)");
      const hh = hangHoaN ? hangHoaList.find((h) => h.ten.toLowerCase() === hangHoaN.toLowerCase()) : null;
      if (hangHoaN && !hh) {
        errors.push(`Dòng ${rowNum}: không tìm thấy mặt hàng "${hangHoaN}".`);
        return;
      }
      const donGia = get("Đơn giá *") || get("Đơn giá");
      if (!donGia) {
        errors.push(`Dòng ${rowNum}: thiếu Đơn giá.`);
        return;
      }

      records.push({
        khach_hang_id: kh.id,
        loai_chi_phi_id: loai.id,
        hang_hoa_id: hh?.id ?? null,
        don_gia: Number(donGia),
        don_vi: get("Đơn vị") || null,
        ghi_chu: get("Ghi chú") || null,
        dang_hoat_dong: true,
      });
    });

    if (records.length === 0) {
      setImportMsg(errors.length ? errors.join(" | ") : "File không có dòng hợp lệ.");
      setImporting(false);
      return;
    }

    const { data, error } = await supabase.from("bang_gia_khach_hang").insert(records).select();
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
        <h1 className="text-xl font-semibold text-slate-900">Bảng giá khách hàng</h1>
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
                + Thêm giá
              </button>
            </>
          )}
        </div>
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Tìm theo khách hàng, loại chi phí..."
        className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
      />

      {importMsg && <p className="mb-4 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">{importMsg}</p>}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              {["Khách hàng", "Loại chi phí", "Mặt hàng", "Đơn giá", "Đơn vị", "Trạng thái"].map((h) => (
                <th key={h} className="px-3 py-2 font-medium">
                  {h}
                </th>
              ))}
              {canEdit && <th className="px-3 py-2"></th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="px-3 py-2">{khTen(row.khach_hang_id)}</td>
                <td className="px-3 py-2">{loaiTen(row.loai_chi_phi_id)}</td>
                <td className="px-3 py-2">{hangHoaTen(row.hang_hoa_id)}</td>
                <td className="px-3 py-2">{(row.don_gia ?? 0).toLocaleString("en-US")}</td>
                <td className="px-3 py-2">{row.don_vi ?? "—"}</td>
                <td className="px-3 py-2">
                  <button
                    disabled={!canEdit}
                    onClick={() => toggleStatus(row)}
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${row.dang_hoat_dong ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"}`}
                  >
                    {row.dang_hoat_dong ? "Đang hoạt động" : "Ngừng hoạt động"}
                  </button>
                </td>
                {canEdit && (
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-3">
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
                  </td>
                )}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-slate-400">
                  Chưa có dữ liệu.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mx-auto mt-3 text-xs text-slate-400">
        Đơn giá đã thỏa thuận sẵn với từng khách hàng, có thể khác nhau theo từng mặt hàng — có thể
        chọn nhiều mặt hàng cùng lúc nếu chúng dùng chung 1 mức giá. Khi nhập &quot;Chi phí phát
        sinh&quot; cho đơn hàng, hệ thống sẽ tự gợi ý giá bán theo đúng khách hàng + mặt hàng của đơn
        đó.
      </p>

      {showForm && (
        <BangGiaForm
          initial={editing}
          khachHangList={khachHangList}
          loaiChiPhiList={loaiChiPhiList}
          hangHoaList={hangHoaList}
          onCancel={() => setShowForm(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

function BangGiaForm({
  initial,
  khachHangList,
  loaiChiPhiList,
  hangHoaList,
  onCancel,
  onSave,
}: {
  initial: Row | null;
  khachHangList: KhachHang[];
  loaiChiPhiList: Option[];
  hangHoaList: Option[];
  onCancel: () => void;
  onSave: (
    values: { khach_hang_id: string; loai_chi_phi_id: string; don_gia: string; don_vi: string; ghi_chu: string },
    hangHoaIds: string[]
  ) => void;
}) {
  const [khachHangId, setKhachHangId] = useState(initial?.khach_hang_id ?? "");
  const [loaiChiPhiId, setLoaiChiPhiId] = useState(initial?.loai_chi_phi_id ?? "");
  const [hangHoaIds, setHangHoaIds] = useState<string[]>(initial?.hang_hoa_id ? [initial.hang_hoa_id] : []);
  const [donGia, setDonGia] = useState(initial?.don_gia?.toString() ?? "");
  const [donVi, setDonVi] = useState(initial?.don_vi ?? "");
  const [ghiChu, setGhiChu] = useState(initial?.ghi_chu ?? "");

  function toggleHangHoa(id: string) {
    setHangHoaIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const khOptions = khachHangList.map((k) => ({ value: k.id, label: k.ten_viet_tat || k.ten_day_du }));
  const loaiOptions = loaiChiPhiList.map((l) => ({ value: l.id, label: l.ten }));
  const cls = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave({ khach_hang_id: khachHangId, loai_chi_phi_id: loaiChiPhiId, don_gia: donGia, don_vi: donVi, ghi_chu: ghiChu }, hangHoaIds);
        }}
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-lg sm:rounded-2xl"
      >
        <h2 className="mb-4 text-lg font-semibold text-slate-900">{initial ? "Sửa giá" : "Thêm giá"}</h2>
        <div className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Khách hàng</label>
            <SearchableSelect options={khOptions} value={khachHangId} onChange={setKhachHangId} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Loại chi phí</label>
            <SearchableSelect options={loaiOptions} value={loaiChiPhiId} onChange={setLoaiChiPhiId} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Mặt hàng {!initial && <span className="text-xs font-normal text-slate-400">(có thể chọn nhiều, để trống = mọi mặt hàng)</span>}
            </label>
            <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 p-2">
              {hangHoaList.length === 0 && <p className="text-xs text-slate-400">Chưa có mặt hàng nào trong danh mục.</p>}
              {hangHoaList.map((h) => (
                <label key={h.id} className="flex items-center gap-2 py-1 text-sm">
                  <input
                    type="checkbox"
                    disabled={!!initial}
                    checked={hangHoaIds.includes(h.id)}
                    onChange={() => toggleHangHoa(h.id)}
                  />
                  {h.ten}
                </label>
              ))}
            </div>
            {initial && <p className="mt-1 text-xs text-slate-400">Khi sửa, chỉ áp dụng cho 1 dòng hiện tại — thêm mặt hàng khác bằng cách tạo giá mới.</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Đơn giá</label>
            <MoneyInput required value={donGia} onChange={setDonGia} className={cls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Đơn vị</label>
            <input value={donVi} onChange={(e) => setDonVi(e.target.value)} placeholder="VD: /cont 20', /cont 40', /lô, /kg..." className={cls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Ghi chú</label>
            <textarea rows={2} value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} className={cls} />
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
