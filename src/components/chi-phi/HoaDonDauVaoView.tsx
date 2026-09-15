"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/client";
import { xuatExcelKeO, CONG_TY_HEADER_LINES, taiLogoCongTy, type ExcelColumn } from "@/lib/excel";
import { TK, tkTheoPhuongThuc, GHI_CHU_DINH_KHOAN_GOI_Y } from "@/lib/dinhKhoan";
import MoneyInput from "@/components/common/MoneyInput";

export interface NhaCungCapOption {
  id: string;
  ten?: string;
  ma_so_thue?: string | null;
  dia_chi?: string | null;
}

export interface DonHangOption {
  id: string;
  so_don_hang: string;
}

export interface HoaDonDauVao {
  id: string;
  mau_so_hoa_don: string | null;
  so_hoa_don: string | null;
  ngay_hoa_don: string;
  ngay_ky_hoa_don: string | null;
  nha_cung_cap_id: string | null;
  don_hang_id: string | null;
  khoan_muc: string;
  loai_chi_phi: "Định phí cố định" | "Phát sinh";
  thang_phan_bo: string;
  don_vi_tinh: string | null;
  so_luong: number | null;
  don_gia: number | null;
  tai_khoan_no: string | null;
  tong_tien_hang: number;
  tien_thue_gtgt: number;
  tong_tien_thanh_toan: number;
  tinh_trang_thanh_toan: "Chưa thanh toán" | "Một phần" | "Đã đủ";
  so_tien_da_thanh_toan: number | null;
  phuong_thuc_thanh_toan: "Tiền mặt" | "Tài khoản công ty" | null;
  ghi_chu: string | null;
  ky_ke_khai: string | null;
  dieu_kien_khau_tru: "Đủ điều kiện" | "Không đủ điều kiện" | "Chưa xác định";
  chi_ho: boolean;
}

type EditValues = {
  mau_so_hoa_don: string;
  so_hoa_don: string;
  ngay_hoa_don: string;
  ngay_ky_hoa_don: string;
  nha_cung_cap_ten: string;
  don_hang_ten: string;
  khoan_muc: string;
  loai_chi_phi: string;
  thang_phan_bo: string;
  don_vi_tinh: string;
  so_luong: string;
  don_gia: string;
  tai_khoan_no: string;
  tong_tien_hang: string;
  tien_thue_gtgt: string;
  tinh_trang_thanh_toan: string;
  so_tien_da_thanh_toan: string;
  phuong_thuc_thanh_toan: string;
  ghi_chu: string;
  ky_ke_khai: string;
  dieu_kien_khau_tru: string;
  chi_ho: string;
};

function thangHienTai() {
  return new Date().toISOString().slice(0, 7);
}

function dongTrong(): EditValues {
  return {
    mau_so_hoa_don: "",
    so_hoa_don: "",
    ngay_hoa_don: new Date().toISOString().slice(0, 10),
    ngay_ky_hoa_don: "",
    nha_cung_cap_ten: "",
    don_hang_ten: "",
    khoan_muc: "",
    loai_chi_phi: "Phát sinh",
    thang_phan_bo: thangHienTai(),
    don_vi_tinh: "",
    so_luong: "",
    don_gia: "",
    tai_khoan_no: "",
    tong_tien_hang: "",
    tien_thue_gtgt: "",
    tinh_trang_thanh_toan: "Chưa thanh toán",
    so_tien_da_thanh_toan: "",
    phuong_thuc_thanh_toan: "",
    ghi_chu: "",
    ky_ke_khai: "",
    dieu_kien_khau_tru: "Đủ điều kiện",
    chi_ho: "false",
  };
}

function toEditValues(r: HoaDonDauVao, tenNcc: string, tenDonHang: string): EditValues {
  return {
    mau_so_hoa_don: r.mau_so_hoa_don ?? "",
    so_hoa_don: r.so_hoa_don ?? "",
    ngay_hoa_don: r.ngay_hoa_don,
    ngay_ky_hoa_don: r.ngay_ky_hoa_don ?? "",
    nha_cung_cap_ten: tenNcc,
    don_hang_ten: tenDonHang,
    khoan_muc: r.khoan_muc,
    loai_chi_phi: r.loai_chi_phi,
    thang_phan_bo: r.thang_phan_bo,
    don_vi_tinh: r.don_vi_tinh ?? "",
    so_luong: String(r.so_luong ?? ""),
    don_gia: String(r.don_gia ?? ""),
    tai_khoan_no: r.tai_khoan_no ?? "",
    tong_tien_hang: String(r.tong_tien_hang ?? ""),
    tien_thue_gtgt: String(r.tien_thue_gtgt ?? ""),
    tinh_trang_thanh_toan: r.tinh_trang_thanh_toan,
    so_tien_da_thanh_toan: String(r.so_tien_da_thanh_toan ?? ""),
    phuong_thuc_thanh_toan: r.phuong_thuc_thanh_toan ?? "",
    ghi_chu: r.ghi_chu ?? "",
    ky_ke_khai: r.ky_ke_khai ?? "",
    dieu_kien_khau_tru: r.dieu_kien_khau_tru,
    chi_ho: String(r.chi_ho),
  };
}

const fmt = (n: number | null | undefined) => (n ?? 0).toLocaleString("en-US");

const IMPORT_COLUMNS = [
  "Mẫu số hóa đơn",
  "Ngày hóa đơn (yyyy-mm-dd)",
  "Ngày ký hóa đơn (yyyy-mm-dd)",
  "Số hóa đơn",
  "Nhà cung cấp",
  "Số đơn hàng (nếu có)",
  "Khoản mục",
  "Loại (Định phí cố định / Phát sinh)",
  "Tháng phân bổ (yyyy-mm)",
  "ĐVT",
  "Số lượng",
  "Đơn giá",
  "TK Nợ (chi phí/kho)",
  "Tổng tiền hàng",
  "Tiền thuế GTGT",
  "Ghi chú",
  "Kỳ kê khai VAT (yyyy-mm)",
  "Điều kiện khấu trừ (Đủ điều kiện/Không đủ điều kiện/Chưa xác định)",
  "Chi hộ (x nếu có)",
];

export default function HoaDonDauVaoView({
  initialRows,
  nhaCungCapList,
  donHangList,
  canEdit,
}: {
  initialRows: HoaDonDauVao[];
  nhaCungCapList: NhaCungCapOption[];
  donHangList: DonHangOption[];
  canEdit: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<HoaDonDauVao[]>(initialRows);
  const [ncList, setNcList] = useState<NhaCungCapOption[]>(nhaCungCapList);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<EditValues>(dongTrong());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thangLoc, setThangLoc] = useState(thangHienTai());
  const [loaiLoc, setLoaiLoc] = useState("Tất cả");
  const [query, setQuery] = useState("");
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<{ success: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ncMap = new Map(ncList.map((n) => [n.id, n.ten ?? ""]));
  const ncInfoMap = new Map(ncList.map((n) => [n.id, n]));
  const dhMap = new Map(donHangList.map((d) => [d.id, d.so_don_hang]));

  const filteredRows = rows.filter((r) => {
    if (thangLoc && r.thang_phan_bo !== thangLoc) return false;
    if (loaiLoc !== "Tất cả" && r.loai_chi_phi !== loaiLoc) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      r.khoan_muc.toLowerCase().includes(q) ||
      (r.so_hoa_don ?? "").toLowerCase().includes(q) ||
      (ncMap.get(r.nha_cung_cap_id ?? "") ?? "").toLowerCase().includes(q)
    );
  });

  const tongTheoLoc = filteredRows.reduce((s, r) => s + (r.tong_tien_thanh_toan ?? 0), 0);

  function set(key: keyof EditValues, value: string) {
    setEditValues((prev) => ({ ...prev, [key]: value }));
  }

  // SL x Don gia -> tu dien Tien hang (chi khi Tien hang dang trong, tranh
  // ghi de gia tri nguoi dung da tu sua tay).
  function setSoLuongDonGia(key: "so_luong" | "don_gia", value: string) {
    setEditValues((prev) => {
      const next = { ...prev, [key]: value };
      const sl = Number(next.so_luong || 0);
      const dg = Number(next.don_gia || 0);
      if (sl > 0 && dg > 0 && !prev.tong_tien_hang) {
        next.tong_tien_hang = String(sl * dg);
      }
      return next;
    });
  }

  function batDauThem() {
    const tam: HoaDonDauVao = {
      id: `new-${Date.now()}`,
      mau_so_hoa_don: null,
      so_hoa_don: null,
      ngay_hoa_don: new Date().toISOString().slice(0, 10),
      ngay_ky_hoa_don: null,
      nha_cung_cap_id: null,
      don_hang_id: null,
      khoan_muc: "",
      loai_chi_phi: "Phát sinh",
      thang_phan_bo: thangLoc || thangHienTai(),
      don_vi_tinh: null,
      so_luong: null,
      don_gia: null,
      tai_khoan_no: null,
      tong_tien_hang: 0,
      tien_thue_gtgt: 0,
      tong_tien_thanh_toan: 0,
      tinh_trang_thanh_toan: "Chưa thanh toán",
      so_tien_da_thanh_toan: null,
      phuong_thuc_thanh_toan: null,
      ghi_chu: null,
      ky_ke_khai: null,
      dieu_kien_khau_tru: "Đủ điều kiện",
      chi_ho: false,
    };
    setRows((prev) => [tam, ...prev]);
    setEditValues({ ...dongTrong(), thang_phan_bo: thangLoc || thangHienTai() });
    setEditingId(tam.id);
    setError(null);
  }

  function batDauSua(row: HoaDonDauVao) {
    setEditingId(row.id);
    setEditValues(toEditValues(row, ncMap.get(row.nha_cung_cap_id ?? "") ?? "", dhMap.get(row.don_hang_id ?? "") ?? ""));
    setError(null);
  }

  function huy(row: HoaDonDauVao) {
    if (row.id.startsWith("new-")) {
      setRows((prev) => prev.filter((r) => r.id !== row.id));
    }
    setEditingId(null);
    setError(null);
  }

  async function luu(row: HoaDonDauVao) {
    if (!editValues.khoan_muc.trim()) {
      setError("Thiếu Khoản mục.");
      return;
    }
    setSaving(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: nv } = await supabase.from("nhan_vien").select("id").eq("auth_user_id", user?.id).single();

    // Go ten NCC truc tiep tren dong (khong qua hop thoai): khop ten co san
    // (khong phan biet hoa/thuong) hoac tu tao moi nha_cung_cap ngay tai day.
    const tenNccGo = editValues.nha_cung_cap_ten.trim();
    let nhaCungCapId: string | null = null;
    if (tenNccGo) {
      const match = ncList.find((n) => (n.ten ?? "").trim().toLowerCase() === tenNccGo.toLowerCase());
      if (match) {
        nhaCungCapId = match.id;
      } else {
        const { data: ncMoi, error: ncErr } = await supabase.from("nha_cung_cap").insert({ ten: tenNccGo }).select("id, ten").single();
        if (ncErr) {
          setSaving(false);
          setError(`Không tạo được nhà cung cấp mới: ${ncErr.message}`);
          return;
        }
        nhaCungCapId = ncMoi.id;
        setNcList((prev) => [...prev, ncMoi as NhaCungCapOption]);
      }
    }

    // Don hang: chi GAN neu trung so don hang co san, KHONG tu tao moi (don
    // hang phai tao qua nghiep vu that su, khong phai tu day) — go sai/khong
    // khop thi de trong, khong chan viec luu.
    const tenDonHangGo = editValues.don_hang_ten.trim();
    const donHangMatch = tenDonHangGo ? donHangList.find((d) => d.so_don_hang.toLowerCase() === tenDonHangGo.toLowerCase()) : undefined;

    const payload = {
      mau_so_hoa_don: editValues.mau_so_hoa_don || null,
      so_hoa_don: editValues.so_hoa_don || null,
      ngay_hoa_don: editValues.ngay_hoa_don,
      ngay_ky_hoa_don: editValues.ngay_ky_hoa_don || null,
      nha_cung_cap_id: nhaCungCapId,
      don_hang_id: donHangMatch?.id ?? null,
      khoan_muc: editValues.khoan_muc.trim(),
      loai_chi_phi: editValues.loai_chi_phi,
      thang_phan_bo: editValues.thang_phan_bo,
      don_vi_tinh: editValues.don_vi_tinh || null,
      so_luong: editValues.so_luong ? Number(editValues.so_luong) : null,
      don_gia: editValues.don_gia ? Number(editValues.don_gia) : null,
      tai_khoan_no: editValues.tai_khoan_no || null,
      tong_tien_hang: editValues.tong_tien_hang ? Number(editValues.tong_tien_hang) : 0,
      tien_thue_gtgt: editValues.tien_thue_gtgt ? Number(editValues.tien_thue_gtgt) : 0,
      tinh_trang_thanh_toan: editValues.tinh_trang_thanh_toan,
      so_tien_da_thanh_toan: editValues.so_tien_da_thanh_toan ? Number(editValues.so_tien_da_thanh_toan) : 0,
      phuong_thuc_thanh_toan: editValues.phuong_thuc_thanh_toan || null,
      ghi_chu: editValues.ghi_chu || null,
      ky_ke_khai: editValues.ky_ke_khai || editValues.ngay_hoa_don.slice(0, 7),
      dieu_kien_khau_tru: editValues.dieu_kien_khau_tru,
      chi_ho: editValues.chi_ho === "true",
    };

    if (row.id.startsWith("new-")) {
      const { data, error: err } = await supabase
        .from("hoa_don_dau_vao")
        .insert({ ...payload, nguoi_nhap_id: nv?.id })
        .select()
        .single();
      setSaving(false);
      if (err) {
        setError(err.message);
        return;
      }
      setRows((prev) => prev.map((r) => (r.id === row.id ? (data as HoaDonDauVao) : r)));
    } else {
      const { data, error: err } = await supabase.from("hoa_don_dau_vao").update(payload).eq("id", row.id).select().single();
      setSaving(false);
      if (err) {
        setError(err.message);
        return;
      }
      setRows((prev) => prev.map((r) => (r.id === row.id ? (data as HoaDonDauVao) : r)));
    }
    setEditingId(null);
  }

  async function xoa(row: HoaDonDauVao) {
    if (row.id.startsWith("new-")) {
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      return;
    }
    if (!window.confirm(`Xóa hẳn "${row.khoan_muc}"? Thao tác này không thể hoàn tác.`)) return;
    const { error: err } = await supabase.from("hoa_don_dau_vao").delete().eq("id", row.id);
    if (err) {
      window.alert(`Không thể xóa: ${err.message}`);
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== row.id));
  }

  function handleDownloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([IMPORT_COLUMNS]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mẫu nhập hóa đơn đầu vào");
    XLSX.writeFile(wb, "mau-nhap-hoa-don-dau-vao.xlsx");
  }

  // TK Co goi y: da tra du -> tien mat/ngan hang (1111/1121) theo phuong
  // thuc; con no mot phan/chua tra -> 331 (phai tra nguoi ban) cho phan con
  // no. Chi la GOI Y de doi chieu voi phan mem ke toan, khong phai but toan
  // chinh thuc — Ke toan van can kiem tra lai truoc khi nhap.
  function tkCoGoiY(r: HoaDonDauVao): string {
    if (r.tinh_trang_thanh_toan === "Đã đủ" && r.phuong_thuc_thanh_toan) {
      return tkTheoPhuongThuc(r.phuong_thuc_thanh_toan);
    }
    return TK.PHAI_TRA_NGUOI_BAN;
  }

  async function handleExportExcel() {
    const columns: ExcelColumn[] = [
      { header: "Mẫu số", key: "mauSo", width: 10 },
      { header: "Ngày hạch toán", key: "ngayHd", width: 14 },
      { header: "Ngày chứng từ", key: "ngayKy", width: 14 },
      { header: "Số chứng từ", key: "soHd", width: 14 },
      { header: "Nhà cung cấp", key: "ncc", width: 28 },
      { header: "Mã số thuế", key: "mst", width: 14 },
      { header: "Địa chỉ NCC", key: "diaChi", width: 28 },
      { header: "Đơn hàng", key: "donHang", width: 14 },
      { header: "Diễn giải", key: "khoanMuc", width: 24 },
      { header: "Loại", key: "loai", width: 16 },
      { header: "Tháng phân bổ", key: "thang", width: 12 },
      { header: "ĐVT", key: "dvt", width: 8 },
      { header: "Số lượng", key: "sl", width: 10, numFmt: "#,##0.##" },
      { header: "Đơn giá", key: "donGia", width: 14, numFmt: "#,##0" },
      { header: "TK Nợ (chi phí/kho)", key: "tkNo", width: 14 },
      { header: "TK Có (gợi ý)", key: "tkCo", width: 12 },
      { header: "Tổng tiền hàng", key: "tienHang", width: 16, numFmt: "#,##0" },
      { header: "Thuế suất GTGT %", key: "thueSuat", width: 14 },
      { header: "Tiền thuế GTGT", key: "thueGtgt", width: 16, numFmt: "#,##0" },
      { header: "Tổng tiền thanh toán", key: "tongTt", width: 18, numFmt: "#,##0" },
      { header: "Tình trạng TT", key: "tinhTrang", width: 14 },
      { header: "Đã trả", key: "daTra", width: 14, numFmt: "#,##0" },
      { header: "Ghi chú", key: "ghiChu", width: 20 },
      { header: "Kỳ kê khai VAT", key: "kyKeKhai", width: 14 },
      { header: "Điều kiện khấu trừ", key: "dieuKienKhauTru", width: 16 },
      { header: "Chi hộ", key: "chiHo", width: 10 },
    ];
    const exportRows = filteredRows.map((r) => {
      const nc = ncInfoMap.get(r.nha_cung_cap_id ?? "");
      const thueSuat = r.tong_tien_hang > 0 ? Math.round((r.tien_thue_gtgt / r.tong_tien_hang) * 1000) / 10 : 0;
      return [
        r.mau_so_hoa_don ?? "",
        r.ngay_hoa_don,
        r.ngay_ky_hoa_don ?? "",
        r.so_hoa_don ?? "",
        nc?.ten ?? "",
        nc?.ma_so_thue ?? "",
        nc?.dia_chi ?? "",
        dhMap.get(r.don_hang_id ?? "") ?? "",
        r.khoan_muc,
        r.loai_chi_phi,
        r.thang_phan_bo,
        r.don_vi_tinh ?? "",
        r.so_luong ?? "",
        r.don_gia ?? "",
        r.tai_khoan_no ?? "",
        tkCoGoiY(r),
        r.tong_tien_hang,
        thueSuat,
        r.tien_thue_gtgt,
        r.tong_tien_thanh_toan,
        r.tinh_trang_thanh_toan,
        r.so_tien_da_thanh_toan ?? 0,
        r.ghi_chu ?? "",
        r.ky_ke_khai ?? r.ngay_hoa_don.slice(0, 7),
        r.dieu_kien_khau_tru,
        r.chi_ho ? "Có" : "",
      ];
    });
    const logo = await taiLogoCongTy();
    await xuatExcelKeO(`hoa-don-dau-vao-${new Date().toISOString().slice(0, 10)}.xlsx`, {
      sheetName: "Hóa đơn đầu vào",
      logo: logo ?? undefined,
      headerLines: [
        ...CONG_TY_HEADER_LINES,
        "",
        { text: "HÓA ĐƠN ĐẦU VÀO", bold: true, size: 12 },
        { text: GHI_CHU_DINH_KHOAN_GOI_Y, italic: true, size: 9 },
      ],
      columns,
      rows: exportRows,
    });
  }

  async function handleImportFile(file: File) {
    setImporting(true);
    setImportSummary(null);

    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array", cellDates: true });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: nv } = await supabase.from("nhan_vien").select("id").eq("auth_user_id", user?.id).single();

    function excelDate(v: unknown): string {
      if (v instanceof Date) return v.toISOString().slice(0, 10);
      return String(v ?? "").trim();
    }

    const records: Record<string, unknown>[] = [];
    const errors: string[] = [];

    raw.forEach((rawRow, idx) => {
      const rowNum = idx + 2;
      const n: Record<string, unknown> = {};
      for (const key of Object.keys(rawRow)) n[key.trim().toLowerCase()] = rawRow[key];

      const khoanMuc = String(n["khoản mục"] ?? "").trim();
      const thang = String(n["tháng phân bổ (yyyy-mm)"] ?? "").trim();
      if (!khoanMuc || !thang) {
        errors.push(`Dòng ${rowNum}: thiếu Khoản mục hoặc Tháng phân bổ.`);
        return;
      }

      const tenNcc = String(n["nhà cung cấp"] ?? "").trim();
      let nhaCungCapId: string | null = null;
      if (tenNcc) {
        const match = ncList.find((o) => (o.ten ?? "").trim().toLowerCase() === tenNcc.toLowerCase());
        if (!match) {
          errors.push(`Dòng ${rowNum}: không tìm thấy nhà cung cấp "${tenNcc}" (thêm trước ở Danh mục Nhà cung cấp).`);
          return;
        }
        nhaCungCapId = match.id;
      }

      const soDonHang = String(n["số đơn hàng (nếu có)"] ?? "").trim();
      let donHangId: string | null = null;
      if (soDonHang) {
        const matchDh = donHangList.find((d) => d.so_don_hang.toLowerCase() === soDonHang.toLowerCase());
        if (!matchDh) {
          errors.push(`Dòng ${rowNum}: không tìm thấy đơn hàng "${soDonHang}" — vẫn lưu dòng này, chỉ để trống liên kết đơn hàng.`);
        } else {
          donHangId = matchDh.id;
        }
      }

      const loai = String(n["loại (định phí cố định / phát sinh)"] ?? "Phát sinh").trim();
      const ngayHoaDon = excelDate(n["ngày hóa đơn (yyyy-mm-dd)"]) || new Date().toISOString().slice(0, 10);
      const dieuKienKhauTruGo = String(n["điều kiện khấu trừ (đủ điều kiện/không đủ điều kiện/chưa xác định)"] ?? "").trim();

      records.push({
        mau_so_hoa_don: String(n["mẫu số hóa đơn"] ?? "").trim() || null,
        ngay_hoa_don: ngayHoaDon,
        ngay_ky_hoa_don: excelDate(n["ngày ký hóa đơn (yyyy-mm-dd)"]) || null,
        so_hoa_don: String(n["số hóa đơn"] ?? "").trim() || null,
        nha_cung_cap_id: nhaCungCapId,
        don_hang_id: donHangId,
        khoan_muc: khoanMuc,
        loai_chi_phi: loai === "Định phí cố định" ? "Định phí cố định" : "Phát sinh",
        thang_phan_bo: thang,
        don_vi_tinh: String(n["đvt"] ?? "").trim() || null,
        so_luong: n["số lượng"] ? Number(n["số lượng"]) : null,
        don_gia: n["đơn giá"] ? Number(n["đơn giá"]) : null,
        tai_khoan_no: String(n["tk nợ (chi phí/kho)"] ?? "").trim() || null,
        tong_tien_hang: Number(n["tổng tiền hàng"] || 0),
        tien_thue_gtgt: Number(n["tiền thuế gtgt"] || 0),
        ghi_chu: String(n["ghi chú"] ?? "").trim() || null,
        ky_ke_khai: String(n["kỳ kê khai vat (yyyy-mm)"] ?? "").trim() || ngayHoaDon.slice(0, 7),
        dieu_kien_khau_tru: ["Đủ điều kiện", "Không đủ điều kiện", "Chưa xác định"].includes(dieuKienKhauTruGo) ? dieuKienKhauTruGo : "Đủ điều kiện",
        chi_ho: !!String(n["chi hộ (x nếu có)"] ?? "").trim(),
        nguoi_nhap_id: nv?.id,
      });
    });

    if (records.length === 0) {
      setImportSummary({ success: 0, errors: errors.length ? errors : ["File không có dòng dữ liệu hợp lệ."] });
      setImporting(false);
      return;
    }

    const { data, error: err } = await supabase.from("hoa_don_dau_vao").insert(records).select();
    setImporting(false);
    if (err) {
      setImportSummary({ success: 0, errors: [...errors, `Lỗi khi lưu: ${err.message}`] });
      return;
    }
    setRows((prev) => [...((data as HoaDonDauVao[]) ?? []), ...prev]);
    setImportSummary({ success: data?.length ?? 0, errors });
  }

  const thangOptions = Array.from(new Set(rows.map((r) => r.thang_phan_bo))).sort().reverse();
  if (!thangOptions.includes(thangLoc)) thangOptions.unshift(thangLoc);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Hóa đơn đầu vào</h1>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleExportExcel} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700">
            Xuất Excel
          </button>
          {canEdit && (
            <>
              <button onClick={handleDownloadTemplate} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700">
                Tải mẫu Excel
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-60"
              >
                {importing ? "Đang nhập..." : "Nhập Excel"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImportFile(file);
                  e.target.value = "";
                }}
              />
              <button
                onClick={batDauThem}
                disabled={editingId !== null}
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm disabled:opacity-60"
              >
                + Thêm dòng
              </button>
            </>
          )}
        </div>
      </div>

      {importSummary && (
        <div className={`mb-4 rounded-lg border p-3 text-sm ${importSummary.errors.length > 0 ? "border-amber-300 bg-amber-50 text-amber-800" : "border-green-300 bg-green-50 text-green-800"}`}>
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium">
              Đã nhập {importSummary.success} dòng{importSummary.errors.length > 0 ? `, ${importSummary.errors.length} dòng lỗi:` : "."}
            </p>
            <button onClick={() => setImportSummary(null)} className="text-xs underline">
              Đóng
            </button>
          </div>
          {importSummary.errors.length > 0 && (
            <ul className="mt-2 list-disc space-y-0.5 pl-5">
              {importSummary.errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        <select value={thangLoc} onChange={(e) => setThangLoc(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
          {thangOptions.map((t) => (
            <option key={t} value={t}>
              Tháng {t}
            </option>
          ))}
        </select>
        <select value={loaiLoc} onChange={(e) => setLoaiLoc(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
          <option>Tất cả</option>
          <option>Định phí cố định</option>
          <option>Phát sinh</option>
        </select>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm khoản mục, NCC, số hóa đơn..."
          className="min-w-[200px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <datalist id="ds-nha-cung-cap">
        {ncList.map((n) => (
          <option key={n.id} value={n.ten ?? ""} />
        ))}
      </datalist>
      <datalist id="ds-don-hang">
        {donHangList.map((d) => (
          <option key={d.id} value={d.so_don_hang} />
        ))}
      </datalist>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[2050px] text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">Mẫu số</th>
              <th className="px-3 py-2 font-medium">Ngày HĐ</th>
              <th className="px-3 py-2 font-medium">Ngày ký</th>
              <th className="px-3 py-2 font-medium">Số HĐ</th>
              <th className="px-3 py-2 font-medium">Nhà cung cấp</th>
              <th className="px-3 py-2 font-medium">Đơn hàng</th>
              <th className="px-3 py-2 font-medium">Khoản mục</th>
              <th className="px-3 py-2 font-medium">Loại</th>
              <th className="px-3 py-2 font-medium">Tháng PB</th>
              <th className="px-3 py-2 font-medium">ĐVT</th>
              <th className="px-3 py-2 text-right font-medium">SL</th>
              <th className="px-3 py-2 text-right font-medium">Đơn giá</th>
              <th className="px-3 py-2 font-medium">TK Nợ</th>
              <th className="px-3 py-2 text-right font-medium">Tiền hàng</th>
              <th className="px-3 py-2 text-right font-medium">Thuế GTGT</th>
              <th className="px-3 py-2 text-right font-medium">Tổng TT</th>
              <th className="px-3 py-2 font-medium">Tình trạng</th>
              <th className="px-3 py-2 text-right font-medium">Đã trả</th>
              <th className="px-3 py-2 font-medium">PT thanh toán</th>
              <th className="px-3 py-2 font-medium">Ghi chú</th>
              <th className="px-3 py-2 font-medium">Kỳ kê khai VAT</th>
              <th className="px-3 py-2 font-medium">Điều kiện khấu trừ</th>
              <th className="px-3 py-2 font-medium">Chi hộ</th>
              {canEdit && <th className="px-3 py-2"></th>}
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) =>
              editingId === row.id ? (
                <tr key={row.id} className="border-t border-blue-100 bg-blue-50/40">
                  <td className="px-2 py-1.5">
                    <input value={editValues.mau_so_hoa_don} onChange={(e) => set("mau_so_hoa_don", e.target.value)} className="w-20 rounded border border-slate-300 px-2 py-1.5 text-sm" />
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="date" value={editValues.ngay_hoa_don} onChange={(e) => set("ngay_hoa_don", e.target.value)} className="w-32 rounded border border-slate-300 px-2 py-1.5 text-sm" />
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="date" value={editValues.ngay_ky_hoa_don} onChange={(e) => set("ngay_ky_hoa_don", e.target.value)} className="w-32 rounded border border-slate-300 px-2 py-1.5 text-sm" />
                  </td>
                  <td className="px-2 py-1.5">
                    <input value={editValues.so_hoa_don} onChange={(e) => set("so_hoa_don", e.target.value)} className="w-24 rounded border border-slate-300 px-2 py-1.5 text-sm" />
                  </td>
                  <td className="min-w-[180px] px-2 py-1.5">
                    <input
                      list="ds-nha-cung-cap"
                      value={editValues.nha_cung_cap_ten}
                      onChange={(e) => set("nha_cung_cap_ten", e.target.value)}
                      placeholder="Gõ tên NCC (tự tạo mới nếu chưa có)"
                      className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                    />
                  </td>
                  <td className="min-w-[130px] px-2 py-1.5">
                    <input
                      list="ds-don-hang"
                      value={editValues.don_hang_ten}
                      onChange={(e) => set("don_hang_ten", e.target.value)}
                      placeholder="Số đơn hàng (nếu có)"
                      className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                    />
                  </td>
                  <td className="min-w-[160px] px-2 py-1.5">
                    <input value={editValues.khoan_muc} onChange={(e) => set("khoan_muc", e.target.value)} placeholder="VD: Thuê văn phòng" className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm" />
                  </td>
                  <td className="px-2 py-1.5">
                    <select value={editValues.loai_chi_phi} onChange={(e) => set("loai_chi_phi", e.target.value)} className="rounded border border-slate-300 bg-white px-2 py-1.5 text-sm">
                      <option>Định phí cố định</option>
                      <option>Phát sinh</option>
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <input value={editValues.thang_phan_bo} onChange={(e) => set("thang_phan_bo", e.target.value)} placeholder="YYYY-MM" className="w-24 rounded border border-slate-300 px-2 py-1.5 text-sm" />
                  </td>
                  <td className="px-2 py-1.5">
                    <input value={editValues.don_vi_tinh} onChange={(e) => set("don_vi_tinh", e.target.value)} placeholder="Tháng, cái..." className="w-20 rounded border border-slate-300 px-2 py-1.5 text-sm" />
                  </td>
                  <td className="px-2 py-1.5">
                    <MoneyInput value={editValues.so_luong} onChange={(v) => setSoLuongDonGia("so_luong", v)} className="w-16 rounded border border-slate-300 px-2 py-1.5 text-right text-sm" />
                  </td>
                  <td className="px-2 py-1.5">
                    <MoneyInput value={editValues.don_gia} onChange={(v) => setSoLuongDonGia("don_gia", v)} className="w-24 rounded border border-slate-300 px-2 py-1.5 text-right text-sm" />
                  </td>
                  <td className="px-2 py-1.5">
                    <input value={editValues.tai_khoan_no} onChange={(e) => set("tai_khoan_no", e.target.value)} placeholder="642..." className="w-16 rounded border border-slate-300 px-2 py-1.5 text-sm" />
                  </td>
                  <td className="px-2 py-1.5">
                    <MoneyInput value={editValues.tong_tien_hang} onChange={(v) => set("tong_tien_hang", v)} className="w-28 rounded border border-slate-300 px-2 py-1.5 text-right text-sm" />
                  </td>
                  <td className="px-2 py-1.5">
                    <MoneyInput value={editValues.tien_thue_gtgt} onChange={(v) => set("tien_thue_gtgt", v)} className="w-24 rounded border border-slate-300 px-2 py-1.5 text-right text-sm" />
                  </td>
                  <td className="px-3 py-1.5 text-right font-medium text-slate-700">
                    {fmt(Number(editValues.tong_tien_hang || 0) + Number(editValues.tien_thue_gtgt || 0))}
                  </td>
                  <td className="px-2 py-1.5">
                    <select value={editValues.tinh_trang_thanh_toan} onChange={(e) => set("tinh_trang_thanh_toan", e.target.value)} className="rounded border border-slate-300 bg-white px-2 py-1.5 text-sm">
                      <option>Chưa thanh toán</option>
                      <option>Một phần</option>
                      <option>Đã đủ</option>
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <MoneyInput value={editValues.so_tien_da_thanh_toan} onChange={(v) => set("so_tien_da_thanh_toan", v)} className="w-24 rounded border border-slate-300 px-2 py-1.5 text-right text-sm" />
                  </td>
                  <td className="px-2 py-1.5">
                    <select value={editValues.phuong_thuc_thanh_toan} onChange={(e) => set("phuong_thuc_thanh_toan", e.target.value)} className="rounded border border-slate-300 bg-white px-2 py-1.5 text-sm">
                      <option value="">—</option>
                      <option>Tiền mặt</option>
                      <option>Tài khoản công ty</option>
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <input value={editValues.ghi_chu} onChange={(e) => set("ghi_chu", e.target.value)} className="w-28 rounded border border-slate-300 px-2 py-1.5 text-sm" />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      value={editValues.ky_ke_khai}
                      onChange={(e) => set("ky_ke_khai", e.target.value)}
                      placeholder={editValues.ngay_hoa_don.slice(0, 7)}
                      className="w-24 rounded border border-slate-300 px-2 py-1.5 text-sm"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <select value={editValues.dieu_kien_khau_tru} onChange={(e) => set("dieu_kien_khau_tru", e.target.value)} className="rounded border border-slate-300 bg-white px-2 py-1.5 text-sm">
                      <option>Đủ điều kiện</option>
                      <option>Không đủ điều kiện</option>
                      <option>Chưa xác định</option>
                    </select>
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <input type="checkbox" checked={editValues.chi_ho === "true"} onChange={(e) => set("chi_ho", String(e.target.checked))} />
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-right">
                    <button onClick={() => luu(row)} disabled={saving} className="mr-2 text-sm font-medium text-blue-600 disabled:opacity-60">
                      {saving ? "..." : "Lưu"}
                    </button>
                    <button onClick={() => huy(row)} className="text-sm font-medium text-slate-500">
                      Hủy
                    </button>
                  </td>
                </tr>
              ) : (
                <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2 text-slate-700">{row.mau_so_hoa_don ?? "—"}</td>
                  <td className="px-3 py-2 text-slate-700">{row.ngay_hoa_don}</td>
                  <td className="px-3 py-2 text-slate-700">{row.ngay_ky_hoa_don ?? "—"}</td>
                  <td className="px-3 py-2 text-slate-700">{row.so_hoa_don ?? "—"}</td>
                  <td className="px-3 py-2 text-slate-700">{ncMap.get(row.nha_cung_cap_id ?? "") || "—"}</td>
                  <td className="px-3 py-2 text-slate-700">
                    {row.don_hang_id ? (
                      <Link href={`/don-hang/${row.don_hang_id}`} className="text-blue-600 hover:underline">
                        {dhMap.get(row.don_hang_id) ?? "—"}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2 font-medium text-slate-900">{row.khoan_muc}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${row.loai_chi_phi === "Định phí cố định" ? "bg-indigo-100 text-indigo-700" : "bg-amber-100 text-amber-700"}`}>
                      {row.loai_chi_phi}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-700">{row.thang_phan_bo}</td>
                  <td className="px-3 py-2 text-slate-700">{row.don_vi_tinh ?? "—"}</td>
                  <td className="px-3 py-2 text-right text-slate-700">{row.so_luong ?? "—"}</td>
                  <td className="px-3 py-2 text-right text-slate-700">{row.don_gia ? fmt(row.don_gia) : "—"}</td>
                  <td className="px-3 py-2 text-slate-700">{row.tai_khoan_no ?? "—"}</td>
                  <td className="px-3 py-2 text-right text-slate-700">{fmt(row.tong_tien_hang)}</td>
                  <td className="px-3 py-2 text-right text-slate-700">{fmt(row.tien_thue_gtgt)}</td>
                  <td className="px-3 py-2 text-right font-medium text-slate-900">{fmt(row.tong_tien_thanh_toan)}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        row.tinh_trang_thanh_toan === "Đã đủ" ? "bg-green-100 text-green-700" : row.tinh_trang_thanh_toan === "Một phần" ? "bg-amber-100 text-amber-700" : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {row.tinh_trang_thanh_toan}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right text-slate-700">{fmt(row.so_tien_da_thanh_toan)}</td>
                  <td className="px-3 py-2 text-slate-700">{row.phuong_thuc_thanh_toan ?? "—"}</td>
                  <td className="max-w-[140px] truncate px-3 py-2 text-slate-500" title={row.ghi_chu ?? ""}>
                    {row.ghi_chu ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-slate-700">{row.ky_ke_khai ?? row.ngay_hoa_don.slice(0, 7)}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        row.dieu_kien_khau_tru === "Đủ điều kiện"
                          ? "bg-green-100 text-green-700"
                          : row.dieu_kien_khau_tru === "Không đủ điều kiện"
                            ? "bg-red-100 text-red-700"
                            : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {row.dieu_kien_khau_tru}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-700">{row.chi_ho ? "Có" : "—"}</td>
                  {canEdit && (
                    <td className="whitespace-nowrap px-3 py-2 text-right">
                      <button onClick={() => batDauSua(row)} disabled={editingId !== null} className="mr-3 text-sm font-medium text-blue-600 hover:underline disabled:opacity-40">
                        Sửa
                      </button>
                      <button onClick={() => xoa(row)} disabled={editingId !== null} className="text-sm font-medium text-red-600 hover:underline disabled:opacity-40">
                        Xóa
                      </button>
                    </td>
                  )}
                </tr>
              )
            )}
            {filteredRows.length === 0 && (
              <tr>
                <td colSpan={24} className="px-4 py-8 text-center text-slate-400">
                  Chưa có hóa đơn nào trong tháng này.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <p className="mt-4 text-sm text-slate-700">
        Tổng hóa đơn đầu vào tháng {thangLoc}{loaiLoc !== "Tất cả" ? ` (${loaiLoc})` : ""}: <strong>{fmt(tongTheoLoc)}</strong>
      </p>
      <p className="mt-2 max-w-3xl text-xs text-slate-400">
        Dùng để phân bổ đều cho các lô hàng phát sinh trong tháng đó khi tính lợi nhuận (Định phí phân bổ/lô = Tổng hóa đơn đầu vào tháng ÷ Số lô hàng trong tháng) — gồm cả &ldquo;Định phí cố định&rdquo; (thuê
        nhà, lương...) lẫn &ldquo;Phát sinh&rdquo; (ăn uống, văn phòng phẩm...). Đánh dấu &ldquo;Đã đủ&rdquo;/&ldquo;Một phần&rdquo; + chọn phương thức thanh toán để tự động ghi vào Sổ quỹ.
      </p>
    </div>
  );
}
