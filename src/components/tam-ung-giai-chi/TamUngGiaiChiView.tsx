"use client";

import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/client";
import MoneyInput from "@/components/common/MoneyInput";
import SearchableSelect from "@/components/common/SearchableSelect";

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
  loai: "Tạm ứng" | "Giải chi";
  ngay_thuc_hien: string;
  doi_tuong: "Nhân viên" | "Tài xế";
  nhan_vien_id: string | null;
  ten_tai_xe: string | null;
  lan: number | null;
  so_tien: number;
  muc_tam_ung_toi_da: number | null;
  so_phieu: string | null;
  ghi_chu: string | null;
  trang_thai: "Đề nghị" | "Đã duyệt" | "Từ chối";
  nguoi_de_nghi_id: string | null;
  don_hang_id: string | null;
  nhan_vien: { ho_ten: string } | { ho_ten: string }[] | null;
  nguoi_de_nghi: { ho_ten: string } | { ho_ten: string }[] | null;
  don_hang: { so_don_hang: string } | { so_don_hang: string }[] | null;
}

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? v[0] ?? null : v;
}

function doiTuongTen(row: Row) {
  if (row.doi_tuong === "Tài xế") return row.ten_tai_xe ?? "—";
  return one(row.nhan_vien)?.ho_ten ?? "—";
}

const TRANG_THAI_COLOR: Record<string, string> = {
  "Đề nghị": "bg-amber-100 text-amber-700",
  "Đã duyệt": "bg-green-100 text-green-700",
  "Từ chối": "bg-red-100 text-red-700",
};

function monthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  return { start, end };
}

export default function TamUngGiaiChiView({
  initialRows,
  nhanVienList,
  donHangList,
  daChiTheoNguoiVaLo,
  currentUserId,
  currentPhongBan,
}: {
  initialRows: Row[];
  nhanVienList: NhanVien[];
  donHangList: DonHangOpt[];
  daChiTheoNguoiVaLo: Record<string, number>;
  currentUserId?: string;
  currentPhongBan: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [proposing, setProposing] = useState(false);
  const [giaiChiPrefill, setGiaiChiPrefill] = useState<{
    nhan_vien_id: string;
    don_hang_id: string;
    so_tien: string;
    ghi_chu: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  const defaultRange = monthRange();
  const [tuNgay, setTuNgay] = useState(defaultRange.start);
  const [denNgay, setDenNgay] = useState(defaultRange.end);
  const [nhanVienFilter, setNhanVienFilter] = useState("");
  const [donHangFilter, setDonHangFilter] = useState("");

  const isKeToan = currentPhongBan === "Kế toán";
  const isGiamDoc = currentPhongBan === "Giám đốc";
  const canSeeSummary = isKeToan || isGiamDoc;

  function personKey(row: Row) {
    return row.doi_tuong === "Tài xế" ? `tx:${row.ten_tai_xe}` : `nv:${row.nhan_vien_id}`;
  }

  function daChiChoLo(row: Row): number | null {
    if (!row.nhan_vien_id || !row.don_hang_id) return null;
    return daChiTheoNguoiVaLo[`${row.nhan_vien_id}:${row.don_hang_id}`] ?? 0;
  }

  function openGiaiChiNhanh(row: Row) {
    const daChi = daChiChoLo(row) ?? 0;
    setEditing(null);
    setProposing(false);
    setGiaiChiPrefill({
      nhan_vien_id: row.nhan_vien_id ?? "",
      don_hang_id: row.don_hang_id ?? "",
      so_tien: daChi.toString(),
      ghi_chu: `Quyết toán tạm ứng lô ${one(row.don_hang)?.so_don_hang ?? ""} (đã tạm ứng ${row.so_tien.toLocaleString("en-US")}, đã chi ${daChi.toLocaleString("en-US")})`,
    });
    setShowForm(true);
  }

  const filteredByPerson = rows
    .filter((r) => !nhanVienFilter || r.nhan_vien_id === nhanVienFilter)
    .filter((r) => !donHangFilter || r.don_hang_id === donHangFilter);

  const detailRows = filteredByPerson.filter((r) => r.ngay_thuc_hien >= tuNgay && r.ngay_thuc_hien <= denNgay);

  const byOrderSummary = useMemo(() => {
    const map = new Map<string, { ten: string; tamUng: number; giaiChi: number }>();
    for (const r of detailRows) {
      if (r.trang_thai !== "Đã duyệt" || !r.don_hang_id) continue;
      const ten = one(r.don_hang)?.so_don_hang ?? donHangList.find((d) => d.id === r.don_hang_id)?.so_don_hang ?? "—";
      if (!map.has(r.don_hang_id)) map.set(r.don_hang_id, { ten, tamUng: 0, giaiChi: 0 });
      const s = map.get(r.don_hang_id)!;
      if (r.loai === "Tạm ứng") s.tamUng += r.so_tien;
      else s.giaiChi += r.so_tien;
    }
    return Array.from(map.values());
  }, [detailRows, donHangList]);

  const summary = useMemo(() => {
    const map = new Map<string, { ten: string; dauKy: number; tamUng: number; giaiChi: number }>();
    for (const r of filteredByPerson) {
      if (r.trang_thai !== "Đã duyệt") continue;
      const key = personKey(r);
      if (!map.has(key)) map.set(key, { ten: doiTuongTen(r), dauKy: 0, tamUng: 0, giaiChi: 0 });
      const s = map.get(key)!;
      const amount = r.loai === "Tạm ứng" ? r.so_tien : -r.so_tien;
      if (r.ngay_thuc_hien < tuNgay) {
        s.dauKy += amount;
      } else if (r.ngay_thuc_hien <= denNgay) {
        if (r.loai === "Tạm ứng") s.tamUng += r.so_tien;
        else s.giaiChi += r.so_tien;
      }
    }
    return Array.from(map.values()).map((s) => ({ ...s, conLai: s.dauKy + s.tamUng - s.giaiChi }));
  }, [filteredByPerson, tuNgay, denNgay]);

  async function handleSave(values: Record<string, string>) {
    const payload: Record<string, unknown> = {
      loai: values.loai,
      ngay_thuc_hien: values.ngay_thuc_hien,
      doi_tuong: values.doi_tuong,
      nhan_vien_id: values.doi_tuong === "Nhân viên" ? values.nhan_vien_id || null : null,
      ten_tai_xe: values.doi_tuong === "Tài xế" ? values.ten_tai_xe || null : null,
      lan: values.lan ? Number(values.lan) : null,
      so_tien: Number(values.so_tien),
      muc_tam_ung_toi_da: values.muc_tam_ung_toi_da ? Number(values.muc_tam_ung_toi_da) : null,
      so_phieu: values.so_phieu || null,
      ghi_chu: values.ghi_chu || null,
      trang_thai: values.trang_thai || "Đề nghị",
      don_hang_id: values.don_hang_id || null,
    };

    if (editing) {
      const { data, error } = await supabase
        .from("tam_ung_giai_chi")
        .update(payload)
        .eq("id", editing.id)
        .select("*, nhan_vien:nhan_vien_id(ho_ten), nguoi_de_nghi:nguoi_de_nghi_id(ho_ten), don_hang:don_hang_id(so_don_hang)")
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
        .from("tam_ung_giai_chi")
        .insert({ ...payload, nguoi_de_nghi_id: nv?.id })
        .select("*, nhan_vien:nhan_vien_id(ho_ten), nguoi_de_nghi:nguoi_de_nghi_id(ho_ten), don_hang:don_hang_id(so_don_hang)")
        .single();
      if (!error && data) {
        setRows((prev) => [data as Row, ...prev]);
        setShowForm(false);
        setProposing(false);
      } else if (error) {
        window.alert(error.message);
      }
    }
  }

  async function handleApprove(row: Row, trangThai: "Đã duyệt" | "Từ chối") {
    const { data, error } = await supabase
      .from("tam_ung_giai_chi")
      .update({ trang_thai: trangThai })
      .eq("id", row.id)
      .select("*, nhan_vien:nhan_vien_id(ho_ten), nguoi_de_nghi:nguoi_de_nghi_id(ho_ten), don_hang:don_hang_id(so_don_hang)")
      .single();
    if (!error && data) setRows((prev) => prev.map((r) => (r.id === row.id ? (data as Row) : r)));
    else if (error) window.alert(error.message);
  }

  async function handleDelete(row: Row) {
    if (!window.confirm("Xóa dòng này?")) return;
    const { error } = await supabase.from("tam_ung_giai_chi").delete().eq("id", row.id);
    if (!error) setRows((prev) => prev.filter((r) => r.id !== row.id));
  }

  function handleExportExcel() {
    const data = detailRows.map((r) => ({
      "Loại": r.loai,
      "Ngày thực hiện": r.ngay_thuc_hien,
      "Đối tượng": r.doi_tuong,
      "Tên": doiTuongTen(r),
      "Lần": r.lan ?? "",
      "Số tiền": r.so_tien,
      "Mức tạm ứng tối đa": r.muc_tam_ung_toi_da ?? "",
      "Số phiếu": r.so_phieu ?? "",
      "Đơn hàng liên quan": one(r.don_hang)?.so_don_hang ?? "",
      "Trạng thái": r.trang_thai,
      "Ghi chú": r.ghi_chu ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Chi tiết");

    if (canSeeSummary) {
      const sumData = summary.map((s) => ({
        "Nhân viên/Tài xế": s.ten,
        "Tiền đầu kỳ": s.dauKy,
        "Tạm ứng trong kỳ": s.tamUng,
        "Giải chi trong kỳ": s.giaiChi,
        "Tiền còn lại": s.conLai,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sumData), "Tổng hợp");
    }
    XLSX.writeFile(wb, `tam-ung-giai-chi-${tuNgay}_${denNgay}.xlsx`);
  }

  function handleDownloadTemplate() {
    const headers = [
      "Loại * (Tạm ứng/Giải chi)",
      "Ngày thực hiện (yyyy-mm-dd) *",
      "Đối tượng * (Nhân viên/Tài xế)",
      "Tên *",
      "Lần",
      "Số tiền *",
      "Số phiếu",
      "Đơn hàng liên quan (số đơn)",
      "Ghi chú",
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mẫu nhập");
    const guideRows = [
      ["Cột", "Giá trị hợp lệ"],
      ["Loại", "Tạm ứng, Giải chi"],
      ["Đối tượng", "Nhân viên, Tài xế"],
      ["Tên", "Nếu Đối tượng = Nhân viên: gõ đúng tên trong danh sách (" + nhanVienList.map((n) => n.ho_ten).join(", ") + "). Nếu = Tài xế: gõ tên tự do."],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(guideRows), "Hướng dẫn");
    XLSX.writeFile(wb, "mau-nhap-tam-ung-giai-chi.xlsx");
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

      const loai = get("Loại * (Tạm ứng/Giải chi)") || get("Loại");
      if (!["Tạm ứng", "Giải chi"].includes(loai)) {
        errors.push(`Dòng ${rowNum}: Loại "${loai}" không hợp lệ.`);
        return;
      }
      const ngay = get("Ngày thực hiện (yyyy-mm-dd) *") || get("Ngày thực hiện (yyyy-mm-dd)");
      if (!ngay) {
        errors.push(`Dòng ${rowNum}: thiếu Ngày thực hiện.`);
        return;
      }
      const doiTuong = get("Đối tượng * (Nhân viên/Tài xế)") || get("Đối tượng");
      if (!["Nhân viên", "Tài xế"].includes(doiTuong)) {
        errors.push(`Dòng ${rowNum}: Đối tượng "${doiTuong}" không hợp lệ.`);
        return;
      }
      const ten = get("Tên *") || get("Tên");
      if (!ten) {
        errors.push(`Dòng ${rowNum}: thiếu Tên.`);
        return;
      }
      const soTien = get("Số tiền *") || get("Số tiền");
      if (!soTien) {
        errors.push(`Dòng ${rowNum}: thiếu Số tiền.`);
        return;
      }

      let nhanVienId: string | null = null;
      if (doiTuong === "Nhân viên") {
        const match = nhanVienList.find((n) => n.ho_ten.toLowerCase() === ten.toLowerCase());
        if (!match) {
          errors.push(`Dòng ${rowNum}: không tìm thấy nhân viên "${ten}".`);
          return;
        }
        nhanVienId = match.id;
      }

      const donHangSo = get("Đơn hàng liên quan (số đơn)");
      const donHang = donHangSo ? donHangList.find((d) => d.so_don_hang.toLowerCase() === donHangSo.toLowerCase()) : null;

      records.push({
        loai,
        ngay_thuc_hien: ngay,
        doi_tuong: doiTuong,
        nhan_vien_id: nhanVienId,
        ten_tai_xe: doiTuong === "Tài xế" ? ten : null,
        lan: get("Lần") ? Number(get("Lần")) : null,
        so_tien: Number(soTien),
        don_hang_id: donHang?.id ?? null,
        so_phieu: get("Số phiếu") || null,
        ghi_chu: get("Ghi chú") || null,
        nguoi_de_nghi_id: nv?.id,
        trang_thai: "Đề nghị",
      });
    });

    if (records.length === 0) {
      setImportMsg(errors.length ? errors.join(" | ") : "File không có dòng hợp lệ.");
      setImporting(false);
      return;
    }

    const { data, error } = await supabase
      .from("tam_ung_giai_chi")
      .insert(records)
      .select("*, nhan_vien:nhan_vien_id(ho_ten), nguoi_de_nghi:nguoi_de_nghi_id(ho_ten), don_hang:don_hang_id(so_don_hang)");
    setImporting(false);
    if (error) {
      setImportMsg(`Lỗi: ${error.message}`);
      return;
    }
    setRows((prev) => [...((data as Row[]) ?? []), ...prev]);
    setImportMsg(`Đã nhập ${data?.length ?? 0} dòng${errors.length ? `, lỗi: ${errors.join(" | ")}` : "."}`);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Tạm ứng & Giải chi</h1>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setEditing(null);
              setProposing(true);
              setGiaiChiPrefill(null);
              setShowForm(true);
            }}
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm"
          >
            + Đề nghị tạm ứng
          </button>
          {isKeToan && (
            <button
              onClick={() => {
                setEditing(null);
                setProposing(false);
                setGiaiChiPrefill(null);
                setShowForm(true);
              }}
              className="rounded-lg border border-blue-300 px-4 py-2.5 text-sm font-medium text-blue-700"
            >
              + Thêm (Kế toán)
            </button>
          )}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-xs text-slate-500">Từ ngày</label>
          <input type="date" value={tuNgay} onChange={(e) => setTuNgay(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">Đến ngày</label>
          <input type="date" value={denNgay} onChange={(e) => setDenNgay(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
        </div>
        {canSeeSummary && (
          <div>
            <label className="mb-1 block text-xs text-slate-500">Nhân viên</label>
            <select value={nhanVienFilter} onChange={(e) => setNhanVienFilter(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm">
              <option value="">Tất cả</option>
              {nhanVienList.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.ho_ten}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="w-48">
          <label className="mb-1 block text-xs text-slate-500">Đơn hàng</label>
          <SearchableSelect
            options={donHangList.map((d) => ({ value: d.id, label: d.so_don_hang }))}
            value={donHangFilter}
            onChange={setDonHangFilter}
            placeholder="Tất cả"
          />
        </div>
        <button onClick={handleExportExcel} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
          Xuất Excel
        </button>
        {isKeToan && (
          <>
            <button onClick={handleDownloadTemplate} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
              Tải mẫu
            </button>
            <label className="cursor-pointer rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
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
          </>
        )}
      </div>

      {importMsg && <p className="mb-4 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">{importMsg}</p>}

      {canSeeSummary && summary.length > 0 && (
        <div className="mb-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Nhân viên/Tài xế</th>
                <th className="px-4 py-3 font-medium">Tiền đầu kỳ</th>
                <th className="px-4 py-3 font-medium">Tạm ứng trong kỳ</th>
                <th className="px-4 py-3 font-medium">Giải chi trong kỳ</th>
                <th className="px-4 py-3 font-medium">Tiền còn lại</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((s, i) => (
                <tr key={s.ten} className="border-t border-slate-100">
                  <td className="px-4 py-2">{i + 1}</td>
                  <td className="px-4 py-2">{s.ten}</td>
                  <td className="px-4 py-2">{s.dauKy.toLocaleString("en-US")}</td>
                  <td className="px-4 py-2">{s.tamUng.toLocaleString("en-US")}</td>
                  <td className="px-4 py-2">{s.giaiChi.toLocaleString("en-US")}</td>
                  <td className="px-4 py-2 font-medium">{s.conLai.toLocaleString("en-US")}</td>
                </tr>
              ))}
              <tr className="border-t border-slate-200 bg-slate-50 font-semibold">
                <td className="px-4 py-2" colSpan={2}>
                  TỔNG
                </td>
                <td className="px-4 py-2">{summary.reduce((s, r) => s + r.dauKy, 0).toLocaleString("en-US")}</td>
                <td className="px-4 py-2">{summary.reduce((s, r) => s + r.tamUng, 0).toLocaleString("en-US")}</td>
                <td className="px-4 py-2">{summary.reduce((s, r) => s + r.giaiChi, 0).toLocaleString("en-US")}</td>
                <td className="px-4 py-2">{summary.reduce((s, r) => s + r.conLai, 0).toLocaleString("en-US")}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {canSeeSummary && byOrderSummary.length > 0 && (
        <div className="mb-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <p className="px-4 pt-3 text-xs font-medium text-slate-500">Theo đơn hàng (trong khoảng ngày đang lọc)</p>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Đơn hàng</th>
                <th className="px-4 py-3 font-medium">Tạm ứng</th>
                <th className="px-4 py-3 font-medium">Giải chi</th>
              </tr>
            </thead>
            <tbody>
              {byOrderSummary.map((s) => (
                <tr key={s.ten} className="border-t border-slate-100">
                  <td className="px-4 py-2">{s.ten}</td>
                  <td className="px-4 py-2">{s.tamUng.toLocaleString("en-US")}</td>
                  <td className="px-4 py-2">{s.giaiChi.toLocaleString("en-US")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {detailRows.map((row) => (
          <div key={row.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-slate-900">
                {row.loai} · {doiTuongTen(row)}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TRANG_THAI_COLOR[row.trang_thai]}`}>{row.trang_thai}</span>
            </div>
            <p className="text-slate-500">
              {row.ngay_thuc_hien}
              {row.lan ? ` · Lần ${row.lan}` : ""} · {row.so_tien.toLocaleString("en-US")}
              {row.so_phieu ? ` · Phiếu: ${row.so_phieu}` : ""}
              {one(row.don_hang)?.so_don_hang ? ` · Đơn: ${one(row.don_hang)?.so_don_hang}` : ""}
            </p>
            {row.ghi_chu && <p className="text-slate-500">{row.ghi_chu}</p>}
            {row.loai === "Tạm ứng" && row.don_hang_id && daChiChoLo(row) !== null && (
              <p className="mt-1 text-slate-600">
                Đã chi cho lô này: <strong>{daChiChoLo(row)!.toLocaleString("en-US")}</strong> ·{" "}
                {row.so_tien - daChiChoLo(row)! >= 0 ? (
                  <span className="text-green-700">Còn dư: {(row.so_tien - daChiChoLo(row)!).toLocaleString("en-US")}</span>
                ) : (
                  <span className="text-red-700">Còn thiếu: {(daChiChoLo(row)! - row.so_tien).toLocaleString("en-US")}</span>
                )}
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-3">
              {isKeToan && (
                <>
                  <button
                    onClick={() => {
                      setEditing(row);
                      setProposing(false);
                      setGiaiChiPrefill(null);
                      setShowForm(true);
                    }}
                    className="text-xs font-medium text-blue-600"
                  >
                    Sửa
                  </button>
                  {row.trang_thai === "Đề nghị" && (
                    <>
                      <button onClick={() => handleApprove(row, "Đã duyệt")} className="text-xs font-medium text-green-600">
                        Duyệt
                      </button>
                      <button onClick={() => handleApprove(row, "Từ chối")} className="text-xs font-medium text-red-600">
                        Từ chối
                      </button>
                    </>
                  )}
                  {row.loai === "Tạm ứng" && row.don_hang_id && row.trang_thai === "Đã duyệt" && (
                    <button onClick={() => openGiaiChiNhanh(row)} className="text-xs font-medium text-purple-700">
                      Giải chi nhanh
                    </button>
                  )}
                  <button onClick={() => handleDelete(row)} className="text-xs font-medium text-red-600">
                    Xóa
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
        {detailRows.length === 0 && <p className="py-8 text-center text-sm text-slate-400">Không có dữ liệu trong khoảng thời gian này.</p>}
      </div>

      {showForm && (
        <TamUngForm
          initial={editing}
          proposing={proposing}
          giaiChiPrefill={giaiChiPrefill}
          nhanVienList={nhanVienList}
          donHangList={donHangList}
          currentUserId={currentUserId}
          onCancel={() => setShowForm(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

function TamUngForm({
  initial,
  proposing,
  giaiChiPrefill,
  nhanVienList,
  donHangList,
  currentUserId,
  onCancel,
  onSave,
}: {
  initial: Row | null;
  proposing: boolean;
  giaiChiPrefill: { nhan_vien_id: string; don_hang_id: string; so_tien: string; ghi_chu: string } | null;
  nhanVienList: NhanVien[];
  donHangList: DonHangOpt[];
  currentUserId?: string;
  onCancel: () => void;
  onSave: (values: Record<string, string>) => void;
}) {
  const [values, setValues] = useState({
    loai: initial?.loai ?? (giaiChiPrefill ? "Giải chi" : "Tạm ứng"),
    ngay_thuc_hien: initial?.ngay_thuc_hien ?? new Date().toISOString().slice(0, 10),
    doi_tuong: initial?.doi_tuong ?? "Nhân viên",
    nhan_vien_id: initial?.nhan_vien_id ?? giaiChiPrefill?.nhan_vien_id ?? (proposing ? currentUserId ?? "" : ""),
    ten_tai_xe: initial?.ten_tai_xe ?? "",
    lan: initial?.lan?.toString() ?? "",
    so_tien: initial?.so_tien?.toString() ?? giaiChiPrefill?.so_tien ?? "",
    muc_tam_ung_toi_da: initial?.muc_tam_ung_toi_da?.toString() ?? "",
    so_phieu: initial?.so_phieu ?? "",
    don_hang_id: initial?.don_hang_id ?? giaiChiPrefill?.don_hang_id ?? "",
    ghi_chu: initial?.ghi_chu ?? giaiChiPrefill?.ghi_chu ?? "",
    trang_thai: initial?.trang_thai ?? "Đề nghị",
  });

  function set(key: keyof typeof values, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

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
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          {initial ? "Sửa" : proposing ? "Đề nghị tạm ứng" : "Thêm tạm ứng/giải chi"}
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Loại</label>
            <select disabled={proposing} value={values.loai} onChange={(e) => set("loai", e.target.value)} className={cls}>
              <option value="Tạm ứng">Tạm ứng</option>
              <option value="Giải chi">Giải chi</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Ngày thực hiện</label>
            <input required type="date" value={values.ngay_thuc_hien} onChange={(e) => set("ngay_thuc_hien", e.target.value)} className={cls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Đối tượng</label>
            <select disabled={proposing} value={values.doi_tuong} onChange={(e) => set("doi_tuong", e.target.value)} className={cls}>
              <option value="Nhân viên">Nhân viên</option>
              <option value="Tài xế">Tài xế</option>
            </select>
          </div>
          {values.doi_tuong === "Nhân viên" ? (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Nhân viên</label>
              <select disabled={proposing} required value={values.nhan_vien_id} onChange={(e) => set("nhan_vien_id", e.target.value)} className={cls}>
                <option value="">-- Chọn --</option>
                {nhanVienList.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.ho_ten}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Tên tài xế</label>
              <input required value={values.ten_tai_xe} onChange={(e) => set("ten_tai_xe", e.target.value)} className={cls} />
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Lần</label>
            <input type="number" value={values.lan} onChange={(e) => set("lan", e.target.value)} className={cls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Số tiền</label>
            <MoneyInput required value={values.so_tien} onChange={(v) => set("so_tien", v)} className={cls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Mức tạm ứng tối đa</label>
            <MoneyInput value={values.muc_tam_ung_toi_da} onChange={(v) => set("muc_tam_ung_toi_da", v)} className={cls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Số phiếu</label>
            <input value={values.so_phieu} onChange={(e) => set("so_phieu", e.target.value)} className={cls} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Đơn hàng liên quan (tùy chọn)</label>
            <SearchableSelect
              options={donHangList.map((d) => ({ value: d.id, label: d.so_don_hang }))}
              value={values.don_hang_id}
              onChange={(v) => set("don_hang_id", v)}
            />
          </div>
          {!proposing && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Trạng thái</label>
              <select value={values.trang_thai} onChange={(e) => set("trang_thai", e.target.value)} className={cls}>
                <option value="Đề nghị">Đề nghị</option>
                <option value="Đã duyệt">Đã duyệt</option>
                <option value="Từ chối">Từ chối</option>
              </select>
            </div>
          )}
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
