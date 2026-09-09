"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { xuatExcelKeO, type ExcelColumn } from "@/lib/excel";
import { createClient } from "@/lib/supabase/client";
import SearchableSelect from "@/components/common/SearchableSelect";
import QuickAddNhaCungCap from "@/components/common/QuickAddNhaCungCap";
import QuickAddDoiTacThueNgoai from "@/components/common/QuickAddDoiTacThueNgoai";
import MoneyInput from "@/components/common/MoneyInput";
import ChiPhiBulkForm, { type BulkRowValues } from "@/components/don-hang/ChiPhiBulkForm";
import type { BangGiaKhachHang, ChiTietVanChuyen, PhatSinhChiPhi } from "@/types/database";
import { PHAT_SINH_CHI_PHI_SAFE_COLS } from "@/lib/giaBan";

interface Option {
  id: string;
  ten: string;
  ma?: string | null;
}

const TT_THANH_TOAN = ["Chưa thanh toán", "Một phần", "Đã đủ"];

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
  nhaCungCapList: initialNhaCungCapList,
  doiTacThueNgoaiList: initialDoiTacThueNgoaiList,
  chiTietVanChuyenList,
  bangGiaList,
  khachHangId,
  hangHoaId,
  phongBan,
  currentNhanVienId,
  nhanVienTamUngOptions,
  congViecMap,
}: {
  donHangId: string;
  soDonHang: string;
  initialRows: PhatSinhChiPhi[];
  loaiChiPhiList: Option[];
  nhaCungCapList: Option[];
  doiTacThueNgoaiList: Option[];
  chiTietVanChuyenList: ChiTietVanChuyen[];
  bangGiaList: BangGiaKhachHang[];
  khachHangId: string | null;
  hangHoaId: string | null;
  phongBan: string;
  currentNhanVienId: string | null;
  nhanVienTamUngOptions: Option[];
  congViecMap: Record<string, string>;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<PhatSinhChiPhi[]>(initialRows);
  const [nhaCungCapList, setNhaCungCapList] = useState<Option[]>(initialNhaCungCapList);
  const [doiTacThueNgoaiList, setDoiTacThueNgoaiList] = useState<Option[]>(initialDoiTacThueNgoaiList);
  const [showForm, setShowForm] = useState(false);
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [editing, setEditing] = useState<PhatSinhChiPhi | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  const canInsert = ["Hiện trường", "Điều phối", "Chứng từ", "Kế toán"].includes(phongBan);
  const canApprove = phongBan === "Kế toán";
  const canEditRow = ["Hiện trường", "Điều phối", "Chứng từ", "Kế toán", "Sale"].includes(phongBan);
  const canSeeSell = !["Hiện trường", "Điều phối"].includes(phongBan);
  const canChonNguonThanhToan = ["Điều phối", "Kế toán"].includes(phongBan);

  // Phan anh dung dieu kien khoa da enforce o DB (enforce_phat_sinh_chi_phi_update,
  // 0064): "Da duyet" khoa Hien truong/Dieu phoi/Chung tu; "Ke toan da tiep nhan"
  // CHI khoa Hien truong/Chung tu (Dieu phoi khong tham gia chu trinh nay). Ke
  // toan va Sale khong bao gio bi khoa boi dieu kien nay.
  function traLoiKhoa(row: PhatSinhChiPhi): string | null {
    if (!["Hiện trường", "Điều phối", "Chứng từ"].includes(phongBan)) return null;
    if (row.trang_thai === "Đã duyệt") return "Chi phí đã được duyệt, không thể sửa.";
    if (
      phongBan !== "Điều phối" &&
      row.nguoi_nhap_id &&
      congViecMap[row.nguoi_nhap_id] === "Đã tiếp nhận"
    ) {
      return "Kế toán đã tiếp nhận phần việc này — liên hệ Kế toán để sửa.";
    }
    return null;
  }

  function loaiTen(id: string | null) {
    return loaiChiPhiList.find((l) => l.id === id)?.ten ?? "—";
  }
  function nccTen(id: string | null) {
    return nhaCungCapList.find((n) => n.id === id)?.ten ?? "—";
  }
  function doiTacTen(id: string | null) {
    return doiTacThueNgoaiList.find((d) => d.id === id)?.ten ?? "—";
  }
  function changTen(id: string | null) {
    const c = chiTietVanChuyenList.find((c) => c.id === id);
    return c ? `${c.ngay_vc ?? "?"} · ${c.so_xe || c.tai_xe_cty_thue || "chặng"}` : null;
  }

  async function handleSave(values: Record<string, string | boolean>, luuGiaMoi?: boolean) {
    const payload: Record<string, unknown> = { don_hang_id: donHangId };
    for (const [k, v] of Object.entries(values)) {
      // nhan_vien_tam_ung_id chi la field UI de Ke toan chon "nhap ho ai" —
      // khong phai cot trong bang, khong duoc gui thang len DB.
      if (k === "nhan_vien_tam_ung_id") continue;
      // Hien truong/Chung tu khong tu chon nguon thanh toan — de trong de
      // trigger tu_dong_nguon_thanh_toan_hien_truong (0062/0066) tu gan, tranh
      // gui gia tri rong de "" len cot co CHECK constraint.
      if (["nguon_thanh_toan", "tam_ung_id"].includes(k) && !canChonNguonThanhToan) continue;
      if (typeof v === "boolean") {
        payload[k] = v;
      } else if (["so_luong", "don_gia", "so_tien_da_chi", "gia_ban_sell", "vat_percent", "so_tien_da_thanh_toan"].includes(k)) {
        payload[k] = v === "" ? null : Number(v);
      } else {
        payload[k] = v === "" ? null : v;
      }
    }

    if (luuGiaMoi && khachHangId && typeof values.loai_chi_phi_id === "string" && payload.gia_ban_sell) {
      const existing = bangGiaList.find(
        (b) => b.loai_chi_phi_id === values.loai_chi_phi_id && b.hang_hoa_id === (hangHoaId ?? null)
      );
      if (existing) {
        await supabase.from("bang_gia_khach_hang").update({ don_gia: payload.gia_ban_sell }).eq("id", existing.id);
      } else {
        await supabase.from("bang_gia_khach_hang").insert({
          khach_hang_id: khachHangId,
          loai_chi_phi_id: values.loai_chi_phi_id,
          hang_hoa_id: hangHoaId ?? null,
          don_gia: payload.gia_ban_sell,
        });
      }
    }

    // gia_ban_sell khong con doc lai truc tiep duoc tu 0061 — select() chi lay
    // cac cot an toan, roi ghep lai gia_ban_sell tu chinh payload vua gui (biet
    // truoc gia tri, khong can goi RPC round-trip cho dong minh vua ghi).
    if (editing) {
      const { data, error } = await supabase
        .from("phat_sinh_chi_phi")
        .update(payload)
        .eq("id", editing.id)
        .select(PHAT_SINH_CHI_PHI_SAFE_COLS)
        .single();
      if (!error && data) {
        const rowDayDu = { ...data, gia_ban_sell: (payload.gia_ban_sell as number | null) ?? null } as PhatSinhChiPhi;
        setRows((prev) => prev.map((r) => (r.id === editing.id ? rowDayDu : r)));
        setShowForm(false);
      } else if (error) {
        window.alert(error.message);
      }
    } else {
      // Ke toan nhap ho: khi chon "Tam ung nhan vien" + chon dung nhan vien o
      // ChiPhiForm, cot nguoi_nhap_id phai la NHAN VIEN DO (khong phai Ke
      // toan dang dang nhap) de khop dieu kien tam_ung.nhan_vien_id =
      // nguoi_nhap_id ma kiem_tra_tam_ung_id_hop_le (0066) bat buoc.
      const nhanVienGhiDe = values.nhan_vien_tam_ung_id as string | undefined;
      let nguoiNhapId = nhanVienGhiDe || undefined;
      if (!nguoiNhapId) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const { data: nv } = await supabase.from("nhan_vien").select("id").eq("auth_user_id", user?.id).single();
        nguoiNhapId = nv?.id;
      }

      const { data, error } = await supabase
        .from("phat_sinh_chi_phi")
        .insert({ ...payload, nguoi_nhap_id: nguoiNhapId, trang_thai: "Chờ duyệt" })
        .select(PHAT_SINH_CHI_PHI_SAFE_COLS)
        .single();
      if (!error && data) {
        const rowDayDu = { ...data, gia_ban_sell: (payload.gia_ban_sell as number | null) ?? null } as PhatSinhChiPhi;
        setRows((prev) => [rowDayDu, ...prev]);
        setShowForm(false);
      } else if (error) {
        window.alert(error.message);
      }
    }
  }

  async function handleBulkSave(bulkRows: BulkRowValues[]) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: nv } = await supabase.from("nhan_vien").select("id").eq("auth_user_id", user?.id).single();

    const records = bulkRows.map((r) => ({
      don_hang_id: donHangId,
      loai_chi_phi_id: r.loai_chi_phi_id,
      nha_cung_cap_id: r.nha_cung_cap_id,
      doi_tac_thue_ngoai_id: r.doi_tac_thue_ngoai_id,
      chi_tiet_van_chuyen_id: r.chi_tiet_van_chuyen_id,
      so_tien_da_chi: Number(r.so_tien_da_chi),
      gia_ban_sell: r.gia_ban_sell ? Number(r.gia_ban_sell) : null,
      noi_bo: r.noi_bo,
      chi_ho: r.chi_ho,
      nguoi_nhap_id: nv?.id,
      trang_thai: "Chờ duyệt",
    }));

    const { data, error } = await supabase.from("phat_sinh_chi_phi").insert(records).select(PHAT_SINH_CHI_PHI_SAFE_COLS);
    if (error) {
      window.alert(error.message);
      return;
    }
    // Insert nhieu dong giu dung thu tu voi records (Postgres RETURNING theo
    // thu tu VALUES) — ghep lai gia_ban_sell tung dong tu chinh records da gui.
    const rowsDayDu = ((data ?? []) as PhatSinhChiPhi[]).map((row, i) => ({
      ...row,
      gia_ban_sell: records[i]?.gia_ban_sell ?? null,
    }));
    setRows((prev) => [...rowsDayDu, ...prev]);
    setShowBulkForm(false);
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
      .select(PHAT_SINH_CHI_PHI_SAFE_COLS)
      .single();
    if (!error && data) {
      // gia_ban_sell khong doi trong thao tac duyet — giu nguyen tu row cu.
      const rowDayDu = { ...data, gia_ban_sell: row.gia_ban_sell } as PhatSinhChiPhi;
      setRows((prev) => prev.map((r) => (r.id === row.id ? rowDayDu : r)));
    } else if (error) {
      window.alert(error.message);
    }
  }

  async function handleExportExcel() {
    const columns: ExcelColumn[] = [
      { header: "Loại chi phí", key: "loai", width: 18 },
      { header: "Nhà cung cấp", key: "ncc", width: 18 },
      { header: "Đối tác thuê ngoài", key: "doiTac", width: 18 },
      { header: "Chặng vận chuyển", key: "chang", width: 16 },
      { header: "Số lượng", key: "soLuong", width: 10 },
      { header: "Đơn giá", key: "donGia", width: 12 },
      { header: "Giá vốn (buy)", key: "giaVon", width: 14 },
      ...(canSeeSell ? [{ header: "Giá bán (sell)", key: "giaBan", width: 14 }] : []),
      { header: "VAT %", key: "vat", width: 8 },
      { header: "Tiền thuế", key: "tienThue", width: 12 },
      { header: "Tổng tiền", key: "tongTien", width: 14 },
      { header: "Nội bộ", key: "noiBo", width: 8 },
      { header: "Chi hộ", key: "chiHo", width: 8 },
      { header: "Có hóa đơn thuế", key: "ttThue", width: 14 },
      { header: "Ngày phát sinh", key: "ngay", width: 12 },
      { header: "Trạng thái", key: "trangThai", width: 12 },
      { header: "Tình trạng thanh toán", key: "ttThanhToan", width: 16 },
      { header: "Đã thanh toán", key: "daThanhToan", width: 14 },
      { header: "Ghi chú", key: "ghiChu", width: 20 },
    ];
    const exportRows = rows.map((r) => [
      loaiTen(r.loai_chi_phi_id),
      r.nha_cung_cap_id ? nccTen(r.nha_cung_cap_id) : "",
      r.doi_tac_thue_ngoai_id ? doiTacTen(r.doi_tac_thue_ngoai_id) : "",
      changTen(r.chi_tiet_van_chuyen_id) ?? "",
      r.so_luong ?? "",
      r.don_gia ?? "",
      r.so_tien_da_chi ?? "",
      ...(canSeeSell ? [r.gia_ban_sell ?? ""] : []),
      r.vat_percent ?? "",
      r.tien_thue,
      r.tong_tien,
      r.noi_bo ? "Có" : "Không",
      r.chi_ho ? "Có" : "Không",
      r.tt_thue ? "Có" : "Không",
      r.ngay_phat_sinh,
      r.trang_thai,
      r.tinh_trang_thanh_toan,
      r.so_tien_da_thanh_toan ?? "",
      r.ghi_chu ?? "",
    ]);
    await xuatExcelKeO(`chi-phi-${soDonHang}.xlsx`, {
      sheetName: "Chi phí",
      headerLines: [`CHI PHÍ PHÁT SINH — Đơn ${soDonHang}`],
      columns,
      rows: exportRows,
    });
  }

  function handleDownloadTemplate() {
    const headers = [
      "Loại chi phí *",
      "Nhà cung cấp",
      "Đối tác thuê ngoài",
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
      ["Đối tác thuê ngoài", doiTacThueNgoaiList.map((d) => d.ten).join(", ")],
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
      const doiTacName = get("Đối tác thuê ngoài");
      const doiTac = doiTacName ? doiTacThueNgoaiList.find((d) => d.ten.toLowerCase() === doiTacName.toLowerCase()) : null;

      const giaVon = get("Giá vốn (buy) *") || get("Giá vốn (buy)");
      if (!giaVon) {
        errors.push(`Dòng ${rowNum}: thiếu Giá vốn (buy).`);
        return;
      }

      records.push({
        don_hang_id: donHangId,
        loai_chi_phi_id: loai.id,
        nha_cung_cap_id: ncc?.id ?? null,
        doi_tac_thue_ngoai_id: doiTac?.id ?? null,
        so_luong: get("Số lượng") ? Number(get("Số lượng")) : null,
        don_gia: get("Đơn giá") ? Number(get("Đơn giá")) : null,
        so_tien_da_chi: Number(giaVon),
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

    const { data, error } = await supabase.from("phat_sinh_chi_phi").insert(records).select(PHAT_SINH_CHI_PHI_SAFE_COLS);
    setImporting(false);
    if (error) {
      setImportMsg(`Lỗi: ${error.message}`);
      return;
    }
    const rowsDayDu = ((data ?? []) as PhatSinhChiPhi[]).map((row, i) => ({
      ...row,
      gia_ban_sell: (records[i]?.gia_ban_sell as number | null | undefined) ?? null,
    }));
    setRows((prev) => [...rowsDayDu, ...prev]);
    setImportMsg(`Đã nhập ${data?.length ?? 0} dòng${errors.length ? `, ${errors.length} dòng lỗi: ${errors.join(" | ")}` : "."}`);
  }

  const tongBuy = rows.filter((r) => r.noi_bo).reduce((s, r) => s + (r.so_tien_da_chi ?? 0), 0);
  const tongSell = rows.reduce((s, r) => s + (r.gia_ban_sell ?? 0), 0);
  const tongPhaiTra = rows.reduce((s, r) => s + (r.so_tien_da_chi ?? 0) - (r.so_tien_da_thanh_toan ?? 0), 0);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Chi phí phát sinh</h2>
          {["Hiện trường", "Chứng từ"].includes(phongBan) && (
            <p className="text-xs text-slate-400">Chỉ hiện các dòng do chính bạn nhập.</p>
          )}
        </div>
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
                onClick={() => setShowBulkForm(true)}
                className="rounded-lg border border-blue-300 px-2.5 py-1.5 text-xs font-medium text-blue-700"
              >
                Nhập nhanh nhiều chi phí
              </button>
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
        {rows.map((row) => {
          const lyDoKhoa = traLoiKhoa(row);
          return (
          <div key={row.id} className="rounded-lg border border-slate-100 p-3 text-sm">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-slate-900">{loaiTen(row.loai_chi_phi_id)}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TRANG_THAI_COLOR[row.trang_thai]}`}>
                {row.trang_thai}
              </span>
            </div>
            <p className="text-slate-500">
              {row.nha_cung_cap_id ? nccTen(row.nha_cung_cap_id) : doiTacTen(row.doi_tac_thue_ngoai_id)} · Buy:{" "}
              {(row.so_tien_da_chi ?? 0).toLocaleString("en-US")}
              {canSeeSell && ` · Sell: ${(row.gia_ban_sell ?? 0).toLocaleString("en-US")}`}
              {" · "}
              {row.noi_bo ? "Nội bộ" : row.chi_ho ? "Chi hộ" : "—"}
              {changTen(row.chi_tiet_van_chuyen_id) ? ` · Chặng: ${changTen(row.chi_tiet_van_chuyen_id)}` : ""}
              {row.nguon_thanh_toan ? ` · Nguồn: ${row.nguon_thanh_toan}` : ""}
            </p>
            {canApprove && (
              <p className="text-slate-500">
                Thanh toán: {row.tinh_trang_thanh_toan}
                {row.so_tien_da_thanh_toan ? ` (đã trả ${row.so_tien_da_thanh_toan.toLocaleString("en-US")})` : ""}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-3">
              {canEditRow && !lyDoKhoa && (
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
              {canEditRow && lyDoKhoa && <span className="text-xs text-slate-400">{lyDoKhoa}</span>}
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
          );
        })}
        {rows.length === 0 && <p className="text-sm text-slate-400">Chưa có chi phí nào.</p>}
      </div>

      {rows.length > 0 && (
        <div className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-600">
          Tổng Buy (nội bộ): <strong>{tongBuy.toLocaleString("en-US")}</strong>
          {canSeeSell && (
            <>
              {" · "}Tổng Sell: <strong>{tongSell.toLocaleString("en-US")}</strong>
            </>
          )}
          {canApprove && (
            <>
              {" · "}Còn phải trả NCC/đối tác: <strong>{tongPhaiTra.toLocaleString("en-US")}</strong>
            </>
          )}
        </div>
      )}

      {showForm && (
        <ChiPhiForm
          initial={editing}
          loaiChiPhiList={loaiChiPhiList}
          nhaCungCapList={nhaCungCapList}
          onNhaCungCapAdded={(row) => setNhaCungCapList((prev) => [...prev, row])}
          doiTacThueNgoaiList={doiTacThueNgoaiList}
          onDoiTacThueNgoaiAdded={(row) => setDoiTacThueNgoaiList((prev) => [...prev, row])}
          chiTietVanChuyenList={chiTietVanChuyenList}
          bangGiaList={bangGiaList}
          khachHangId={khachHangId}
          hangHoaId={hangHoaId}
          phongBan={phongBan}
          canSeeSell={canSeeSell}
          canChonNguonThanhToan={canChonNguonThanhToan}
          donHangId={donHangId}
          currentNhanVienId={currentNhanVienId}
          nhanVienTamUngOptions={nhanVienTamUngOptions}
          onCancel={() => setShowForm(false)}
          onSave={handleSave}
        />
      )}

      {showBulkForm && (
        <ChiPhiBulkForm
          loaiChiPhiList={loaiChiPhiList}
          nhaCungCapList={nhaCungCapList}
          doiTacThueNgoaiList={doiTacThueNgoaiList}
          chiTietVanChuyenList={chiTietVanChuyenList}
          canSeeSell={canSeeSell}
          onCancel={() => setShowBulkForm(false)}
          onSave={handleBulkSave}
        />
      )}
    </div>
  );
}

function ChiPhiForm({
  initial,
  loaiChiPhiList,
  nhaCungCapList,
  onNhaCungCapAdded,
  doiTacThueNgoaiList,
  onDoiTacThueNgoaiAdded,
  chiTietVanChuyenList,
  bangGiaList,
  khachHangId,
  hangHoaId,
  phongBan,
  canSeeSell,
  canChonNguonThanhToan,
  donHangId,
  currentNhanVienId,
  nhanVienTamUngOptions,
  onCancel,
  onSave,
}: {
  initial: PhatSinhChiPhi | null;
  loaiChiPhiList: Option[];
  nhaCungCapList: Option[];
  onNhaCungCapAdded: (row: Option) => void;
  doiTacThueNgoaiList: Option[];
  onDoiTacThueNgoaiAdded: (row: Option) => void;
  chiTietVanChuyenList: ChiTietVanChuyen[];
  bangGiaList: BangGiaKhachHang[];
  khachHangId: string | null;
  hangHoaId: string | null;
  phongBan: string;
  canSeeSell: boolean;
  canChonNguonThanhToan: boolean;
  donHangId: string;
  currentNhanVienId: string | null;
  nhanVienTamUngOptions: Option[];
  onCancel: () => void;
  onSave: (values: Record<string, string | boolean>, luuGiaMoi?: boolean) => void;
}) {
  const isSaleOnly = phongBan === "Sale";
  const isKeToan = phongBan === "Kế toán";
  const isDieuPhoi = phongBan === "Điều phối";

  function timGiaGoiY(loaiChiPhiId: string): BangGiaKhachHang | null {
    const ungVien = bangGiaList.filter((b) => b.loai_chi_phi_id === loaiChiPhiId);
    return ungVien.find((b) => b.hang_hoa_id === hangHoaId) ?? ungVien.find((b) => b.hang_hoa_id === null) ?? null;
  }

  const [giaGoiY, setGiaGoiY] = useState<BangGiaKhachHang | null>(() => timGiaGoiY(initial?.loai_chi_phi_id ?? ""));
  const [luuGiaMoi, setLuuGiaMoi] = useState(false);

  const [values, setValues] = useState({
    loai_chi_phi_id: initial?.loai_chi_phi_id ?? "",
    nha_cung_cap_id: initial?.nha_cung_cap_id ?? "",
    doi_tac_thue_ngoai_id: initial?.doi_tac_thue_ngoai_id ?? "",
    chi_tiet_van_chuyen_id: initial?.chi_tiet_van_chuyen_id ?? "",
    tinh_trang_thanh_toan: initial?.tinh_trang_thanh_toan ?? "Chưa thanh toán",
    so_tien_da_thanh_toan: initial?.so_tien_da_thanh_toan?.toString() ?? "",
    phuong_thuc_thanh_toan: initial?.phuong_thuc_thanh_toan ?? "",
    so_luong: initial?.so_luong?.toString() ?? "",
    don_gia: initial?.don_gia?.toString() ?? "",
    so_tien_da_chi: initial?.so_tien_da_chi?.toString() ?? "",
    gia_ban_sell: initial?.gia_ban_sell?.toString() ?? "",
    vat_percent: initial?.vat_percent?.toString() ?? "",
    ngay_phat_sinh: initial?.ngay_phat_sinh ?? new Date().toISOString().slice(0, 10),
    ghi_chu: initial?.ghi_chu ?? "",
    noi_bo: initial?.noi_bo ?? true,
    chi_ho: initial?.chi_ho ?? false,
    tt_thue: initial?.tt_thue ?? false,
    nguon_thanh_toan: initial?.nguon_thanh_toan ?? "",
    tam_ung_id: initial?.tam_ung_id ?? "",
    // Chi dung khi Ke toan tao moi + chon "Tam ung nhan vien": nhan vien nao
    // dang duoc nhap ho — quyet dinh nguoi_nhap_id cua dong chi phi (xem
    // handleSave o ChiPhiSection). Khong dung khi sua dong da co san.
    nhan_vien_tam_ung_id: "",
  });

  const supabase = useMemo(() => createClient(), []);
  const [tamUngOptions, setTamUngOptions] = useState<
    { id: string; so_tien: number; ngay_thuc_hien: string; so_phieu: string | null }[]
  >([]);
  const [loadingTamUng, setLoadingTamUng] = useState(false);

  async function taiKhoanTamUng(nhanVienId: string) {
    setLoadingTamUng(true);
    const { data } = await supabase
      .from("tam_ung_giai_chi")
      .select("id, so_tien, ngay_thuc_hien, so_phieu")
      .eq("don_hang_id", donHangId)
      .eq("nhan_vien_id", nhanVienId)
      .eq("loai", "Tạm ứng")
      .eq("trang_thai", "Đã duyệt")
      .is("phieu_quyet_toan_id", null)
      .order("ngay_thuc_hien", { ascending: true });
    setTamUngOptions(data ?? []);
    setLoadingTamUng(false);
  }

  // Dieu phoi: tu dong tai tam ung cua chinh minh (RLS 0024 da gioi han ho
  // chi thay cua chinh ho). Ke toan sua dong da co san "Tam ung nhan vien":
  // tai lai dung nhan vien cua dong do (khong doi duoc khi sua). Ke toan tao
  // moi: cho ho chon nhan vien truoc, xem handleNguonThanhToanChange.
  useEffect(() => {
    if (!canChonNguonThanhToan) return;
    // Chi chay 1 lan luc mo form (deps []) — khong phai vong lap render, an
    // toan de goi setState (bat co loading) ngay dau ham async ben trong.
    if (!initial) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (isDieuPhoi && currentNhanVienId) taiKhoanTamUng(currentNhanVienId);
      return;
    }
    if (initial.nguon_thanh_toan === "Tạm ứng nhân viên" && initial.nguoi_nhap_id) {
      taiKhoanTamUng(initial.nguoi_nhap_id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleNguonThanhToanChange(v: string) {
    setValues((prev) => ({
      ...prev,
      nguon_thanh_toan: v,
      tam_ung_id: v === "Tạm ứng nhân viên" ? prev.tam_ung_id : "",
      nhan_vien_tam_ung_id: v === "Tạm ứng nhân viên" ? prev.nhan_vien_tam_ung_id : "",
    }));
    if (v !== "Tạm ứng nhân viên") {
      setTamUngOptions([]);
      return;
    }
    if (isDieuPhoi && currentNhanVienId) {
      taiKhoanTamUng(currentNhanVienId);
    } else if (isKeToan && initial?.nguoi_nhap_id) {
      taiKhoanTamUng(initial.nguoi_nhap_id);
    }
  }

  function set<K extends keyof typeof values>(key: K, value: (typeof values)[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleLoaiChiPhiChange(loaiChiPhiId: string) {
    set("loai_chi_phi_id", loaiChiPhiId);
    const match = timGiaGoiY(loaiChiPhiId);
    setGiaGoiY(match);
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
  const changOptions = chiTietVanChuyenList.map((c) => ({
    value: c.id,
    label: `${c.ngay_vc ?? "?"} · ${c.so_xe || c.tai_xe_cty_thue || "chặng"}`,
  }));

  const cls = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(values, luuGiaMoi);
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
            <QuickAddNhaCungCap
              disabled={isSaleOnly}
              options={nhaCungCapList}
              value={values.nha_cung_cap_id}
              onChange={(v) => set("nha_cung_cap_id", v)}
              onAdded={onNhaCungCapAdded}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Đối tác thuê ngoài <span className="font-normal text-slate-400">(nếu bên vận tải trả chi hộ)</span>
            </label>
            <QuickAddDoiTacThueNgoai
              disabled={isSaleOnly}
              options={doiTacThueNgoaiList}
              value={values.doi_tac_thue_ngoai_id}
              onChange={(v) => set("doi_tac_thue_ngoai_id", v)}
              onAdded={onDoiTacThueNgoaiAdded}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Gắn với chặng vận chuyển</label>
            <SearchableSelect
              disabled={isSaleOnly}
              options={changOptions}
              value={values.chi_tiet_van_chuyen_id}
              onChange={(v) => set("chi_tiet_van_chuyen_id", v)}
              placeholder="-- Không gắn chặng nào --"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Số lượng</label>
            <input disabled={isSaleOnly} type="number" step="any" value={values.so_luong} onChange={(e) => set("so_luong", e.target.value)} className={cls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Đơn giá</label>
            <MoneyInput disabled={isSaleOnly} value={values.don_gia} onChange={(v) => set("don_gia", v)} className={cls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Giá vốn (buy)</label>
            <MoneyInput disabled={isSaleOnly} value={values.so_tien_da_chi} onChange={(v) => set("so_tien_da_chi", v)} className={cls} />
          </div>
          {canSeeSell && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Giá bán (sell)</label>
              <MoneyInput value={values.gia_ban_sell} onChange={(v) => set("gia_ban_sell", v)} className={cls} />
              {giaGoiY && (
                <p className="mt-1 text-xs text-blue-600">
                  Giá theo bảng giá khách hàng: {(giaGoiY.don_gia ?? 0).toLocaleString("en-US")}
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
              {khachHangId &&
                values.loai_chi_phi_id &&
                values.gia_ban_sell &&
                Number(values.gia_ban_sell) !== (giaGoiY?.don_gia ?? null) && (
                  <label className="mt-1 flex items-center gap-1.5 text-xs text-slate-600">
                    <input type="checkbox" checked={luuGiaMoi} onChange={(e) => setLuuGiaMoi(e.target.checked)} />
                    Lưu giá này làm giá mặc định cho khách hàng{hangHoaId ? " + mặt hàng này" : ""} (dùng lại lần
                    sau)
                  </label>
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
          {isKeToan && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Tình trạng thanh toán</label>
                <select
                  value={values.tinh_trang_thanh_toan}
                  onChange={(e) => set("tinh_trang_thanh_toan", e.target.value as typeof values.tinh_trang_thanh_toan)}
                  className={cls}
                >
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
            </>
          )}
        </div>

        {canChonNguonThanhToan && (
          <div className="mt-3 rounded-lg border border-slate-200 p-3">
            <label className="mb-1 block text-sm font-medium text-slate-700">Nguồn thanh toán</label>
            <select
              required
              value={values.nguon_thanh_toan}
              onChange={(e) => handleNguonThanhToanChange(e.target.value)}
              className={cls}
            >
              <option value="">-- Chọn --</option>
              <option value="Tiền mặt">Tiền mặt</option>
              <option value="Tài khoản công ty">Tài khoản công ty</option>
              <option value="Tạm ứng nhân viên">Tạm ứng nhân viên</option>
            </select>

            {values.nguon_thanh_toan === "Tạm ứng nhân viên" && (
              <div className="mt-2 space-y-2">
                {isKeToan && !initial && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Nhân viên (nhập hộ)</label>
                    <SearchableSelect
                      options={nhanVienTamUngOptions.map((n) => ({ value: n.id, label: n.ten }))}
                      value={values.nhan_vien_tam_ung_id}
                      onChange={(v) => {
                        set("nhan_vien_tam_ung_id", v);
                        set("tam_ung_id", "");
                        if (v) taiKhoanTamUng(v);
                        else setTamUngOptions([]);
                      }}
                    />
                  </div>
                )}
                {isKeToan && initial && (
                  <p className="text-xs text-slate-500">
                    Nhân viên: {nhanVienTamUngOptions.find((n) => n.id === initial.nguoi_nhap_id)?.ten ?? "—"} (không đổi được khi sửa)
                  </p>
                )}
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Khoản tạm ứng (có thể để trống)</label>
                  <select
                    value={values.tam_ung_id}
                    onChange={(e) => set("tam_ung_id", e.target.value)}
                    className={cls}
                    disabled={loadingTamUng}
                  >
                    <option value="">-- Để trống (chưa có / tự chọn sau) --</option>
                    {tamUngOptions.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.ngay_thuc_hien} · {t.so_tien.toLocaleString("en-US")}
                        {t.so_phieu ? ` · ${t.so_phieu}` : ""}
                      </option>
                    ))}
                  </select>
                  {loadingTamUng && <p className="mt-1 text-xs text-slate-400">Đang tải...</p>}
                </div>
              </div>
            )}
          </div>
        )}
        {!canChonNguonThanhToan && initial?.nguon_thanh_toan && (
          <p className="mt-3 text-xs text-slate-500">
            Nguồn thanh toán: {initial.nguon_thanh_toan} (tự động theo tạm ứng, không sửa được)
          </p>
        )}

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
