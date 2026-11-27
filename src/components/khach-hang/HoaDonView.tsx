"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/client";
import SearchableSelect from "@/components/common/SearchableSelect";
import FileAttachSection from "@/components/common/FileAttachSection";
import MoneyInput from "@/components/common/MoneyInput";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { xuatExcelKeO, CONG_TY, CONG_TY_HEADER_LINES, taiLogoCongTy, type ExcelColumn } from "@/lib/excel";
import { docDanhSachHoaDonDienTu } from "@/lib/danhSachHoaDonDienTu";
import { khachMeCua, khachXuatDichVu, type NhomCoMe } from "@/lib/nhomKhach";
import type { DinhKem } from "@/types/database";

interface ThongTinHuy {
  hoa_don_id: string;
  ly_do: string | null;
  luc: string;
  nguoi: string | null;
}

type LoaiXuat = "Dịch vụ" | "Chi hộ" | "Gộp";
const LOAI_XUAT: LoaiXuat[] = ["Dịch vụ", "Chi hộ", "Gộp"];

/** Suy ra tu so tien: chi co chi ho / chi co dich vu / ca hai. */
function loaiXuatCua(r: { tong_tien: number; tien_chi_ho: number | null }): LoaiXuat {
  const chiHo = r.tien_chi_ho ?? 0;
  if (!chiHo) return "Dịch vụ";
  return Math.abs(r.tong_tien - chiHo) < 1 ? "Chi hộ" : "Gộp";
}

interface KhachHang {
  id: string;
  ma_so_thue: string | null;
  ten_day_du: string;
  ten_viet_tat: string | null;
  nhom_khach_hang_id?: string | null;
  nhom_khach_hang_ten?: string | null;
}
interface DonHangOpt {
  id: string;
  so_don_hang: string;
  khach_hang_id: string | null;
  khach_hang_dich_vu_id?: string | null;
}
interface LienKet {
  hoa_don_id: string;
  don_hang_id: string;
}
interface ChiPhiDoiChieu {
  id: string;
  hoa_don_id: string | null;
  don_hang_id: string;
  chi_ho: boolean;
  so_tien_da_chi: number | null;
  gia_ban_sell: number | null;
  vat_percent: number | null;
  don_hang: { so_don_hang: string } | { so_don_hang: string }[] | null;
  loai_chi_phi: { ten: string } | { ten: string }[] | null;
}
interface PhuThuDoiChieu {
  id: string;
  hoa_don_id: string | null;
  don_hang_id: string;
  loai_phu_thu: string | null;
  thanh_tien: number | null;
  don_hang: { so_don_hang: string } | { so_don_hang: string }[] | null;
}
interface ChiPhiRaSoatRow {
  don_hang_id: string;
  chi_ho: boolean;
  so_tien_da_chi: number | null;
  gia_ban_sell: number | null;
  vat_percent: number | null;
}
interface PhuThuRaSoatRow {
  don_hang_id: string;
  thanh_tien: number | null;
}

type TrangThaiHoaDon = "Đã phát hành" | "Đã điều chỉnh" | "Đã thay thế" | "Đã hủy";
type LoaiHoaDon = "Gốc" | "Điều chỉnh" | "Thay thế";

interface Row {
  id: string;
  khach_hang_id: string;
  so_hoa_don: string | null;
  ngay_xuat: string;
  tong_tien_truoc_thue: number | null;
  vat_percent: number | null;
  tien_vat: number;
  tien_chi_ho: number | null;
  tong_tien: number;
  trang_thai_thanh_toan: "Chưa thu" | "Thu một phần" | "Đã thu đủ";
  so_tien_da_thu: number | null;
  phuong_thuc_thu: string | null;
  ghi_chu: string | null;
  khach_hang: KhachHang | KhachHang[] | null;
  trang_thai: TrangThaiHoaDon;
  loai_hoa_don: LoaiHoaDon;
  hoa_don_goc_id: string | null;
  hoa_don_thay_the_id: string | null;
  ky_ke_khai: string | null;
}

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? v[0] ?? null : v;
}
function khName(kh: KhachHang | null) {
  return kh ? kh.ten_viet_tat || kh.ten_day_du : "—";
}
/** Kem ten nhom (vd Apple Trans) de chon dung phap nhan, tranh nham giua cac cong ty con cung nhom. */
function khOptionLabel(k: KhachHang) {
  const ten = k.ten_viet_tat || k.ten_day_du;
  return k.nhom_khach_hang_ten ? `${ten} — (${k.nhom_khach_hang_ten})` : ten;
}

const TT_THU: Row["trang_thai_thanh_toan"][] = ["Chưa thu", "Thu một phần", "Đã thu đủ"];
const TT_COLOR: Record<string, string> = {
  "Chưa thu": "bg-red-100 text-red-700",
  "Thu một phần": "bg-amber-100 text-amber-700",
  "Đã thu đủ": "bg-green-100 text-green-700",
};
const TRANG_THAI_COLOR: Record<TrangThaiHoaDon, string> = {
  "Đã phát hành": "bg-slate-100 text-slate-700",
  "Đã điều chỉnh": "bg-amber-100 text-amber-700",
  "Đã thay thế": "bg-orange-100 text-orange-700",
  "Đã hủy": "bg-red-100 text-red-700 line-through",
};

export default function HoaDonView({
  initialRows,
  khachHangList,
  donHangList,
  lienKetAll,
  dinhKemRows,
  chiPhiRows,
  phuThuRows,
  chiPhiRaSoat = [],
  phuThuRaSoat = [],
  canEdit,
  canHuy,
  currentUserId,
  nhomList = [],
  thongTinHuy = [],
}: {
  nhomList?: NhomCoMe[];
  thongTinHuy?: ThongTinHuy[];
  initialRows: Row[];
  khachHangList: KhachHang[];
  donHangList: DonHangOpt[];
  lienKetAll: LienKet[];
  dinhKemRows: DinhKem[];
  chiPhiRows: ChiPhiDoiChieu[];
  phuThuRows: PhuThuDoiChieu[];
  chiPhiRaSoat?: ChiPhiRaSoatRow[];
  phuThuRaSoat?: PhuThuRaSoatRow[];
  canEdit: boolean;
  canHuy: boolean;
  currentUserId?: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [lienKet, setLienKet] = useState<LienKet[]>(lienKetAll);
  const [khFilter, setKhFilter] = useState("");
  const [ttFilter, setTtFilter] = useState("");
  const [dsHuy, setDsHuy] = useState<ThongTinHuy[]>(thongTinHuy);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [doiChieuMoRong, setDoiChieuMoRong] = useState<string | null>(null);
  const [dctForm, setDctForm] = useState<{ mode: "dieu_chinh" | "thay_the"; row: Row } | null>(null);
  const [lichSuMoRong, setLichSuMoRong] = useState<string | null>(null);
  // Chon nhieu hoa don de thu tien trong 1 lan (vd 1 lan chuyen khoan tra
  // nhieu hoa don cung luc) — phan bo tuan tu theo ngay xuat cu nhat truoc,
  // van goi lai dung RPC thu_tien_hoa_don_xuat cho tung hoa don (khong doi
  // logic da co), chi gom lam 1 thao tac UI thay vi bam "Thu tiền" tung dong.
  const [selectedForThu, setSelectedForThu] = useState<Set<string>>(new Set());
  const [showThuTienNhieu, setShowThuTienNhieu] = useState(false);
  // P1 muc 5e: state cho 3 ConfirmDialog thay window.prompt() (xem huy/
  // xuLy*Confirm phia tren).
  const [dialogThuTien, setDialogThuTien] = useState<Row | null>(null);
  const [dialogSuaPhuongThuc, setDialogSuaPhuongThuc] = useState<Row | null>(null);
  const [dialogHuy, setDialogHuy] = useState<Row | null>(null);
  const [doiChieuCong, setDoiChieuCong] = useState<{ dong: number; so: string; ketQua: string }[] | null>(null);
  const [loiFileCong, setLoiFileCong] = useState<string | null>(null);
  // P1 muc 5c/5d: ra soat nhanh TOAN BO hoa don hien co (khong can upload file
  // HDDT) — phat hien hoa don gan vao lo co tong tien lech qua lon so voi gia
  // ban/chi ho cua chinh lo do, dieu tra duoc ngay ca voi hoa don da nhap tu
  // truoc (nhu C25TAA-55 gan nham CHPNK2611007).
  const [raSoatBatThuong, setRaSoatBatThuong] = useState<{ soHoaDon: string; khach: string; ketQua: string }[] | null>(null);

  function chayRaSoatBatThuong() {
    const ds: { soHoaDon: string; khach: string; ketQua: string }[] = [];
    for (const r of rows) {
      if (r.trang_thai === "Đã hủy" || r.trang_thai === "Đã thay thế") continue;
      const donHangIds = lienKet.filter((l) => l.hoa_don_id === r.id).map((l) => l.don_hang_id);
      if (donHangIds.length === 0) continue;
      const soDon = donHangList.filter((d) => donHangIds.includes(d.id)).map((d) => d.so_don_hang).join(", ");
      const canhBao = canhBaoLechHoaDon(r.tong_tien, donHangIds);
      if (canhBao) {
        ds.push({ soHoaDon: r.so_hoa_don ?? "(chưa có số)", khach: khName(one(r.khach_hang)), ketQua: `${canhBao} (lô: ${soDon})` });
      }
    }
    setRaSoatBatThuong(ds);
  }

  /** P1 muc 5c/5d (2026-11-26): "claim" cua cac lo — CHI tinh phan dich vu
   * (khong goiVAT, khong chi ho), vi chi ho thuong duoc hoan/thu rieng (qua
   * tam ung, tam ung giai chi, hoac 1 hoa don khac), KHONG phai luc nao cung
   * gop chung vao dung hoa don dich vu nay — gop chi ho vao se gay bao dong
   * gia (hoa don dich vu < tong lo la BINH THUONG, vi lo thuong co nhieu hoa
   * don/dot thu khac nhau). Chi canh bao 2 truong hop RO RANG BAT THUONG,
   * khong doi xung:
   *  (a) hoa don gan nhu 0 nhung lo co phat sinh dang ke — kieu C26TAA-47;
   *  (b) hoa don LON HON NHIEU (>2 lan) toan bo dich vu+chi ho da ghi nhan
   *      cua lo — kieu C25TAA-55/CHPNK2611007 (gan nham don).
   * Hoa don < tong lo (do lo xuat nhieu hoa don/dot) KHONG bi bao — dung
   * nghiep vu binh thuong, tranh bao dong gia lam ke toan mat long tin.
   */
  function canhBaoLechHoaDon(tongTienHoaDon: number, donHangIds: string[]): string | null {
    const dichVu = chiPhiRaSoat
      .filter((r) => donHangIds.includes(r.don_hang_id) && !r.chi_ho)
      .reduce((s, r) => s + (r.gia_ban_sell ?? 0) * (1 + (r.vat_percent ?? 0) / 100), 0);
    const chiHo = chiPhiRaSoat.filter((r) => donHangIds.includes(r.don_hang_id) && r.chi_ho).reduce((s, r) => s + (r.so_tien_da_chi ?? 0), 0);
    const phuThu = phuThuRaSoat.filter((r) => donHangIds.includes(r.don_hang_id)).reduce((s, r) => s + (r.thanh_tien ?? 0), 0);
    const tongLo = dichVu + chiHo + phuThu;
    if (tongLo >= 1000000 && tongTienHoaDon < 50000) {
      return `Hóa đơn gần như 0 (${tongTienHoaDon.toLocaleString("en-US")}) nhưng lô đã ghi nhận ~${tongLo.toLocaleString("en-US")}`;
    }
    if (tongLo > 0 && tongTienHoaDon > tongLo * 2 && tongTienHoaDon - tongLo > 1000000) {
      return `Tổng hóa đơn ${tongTienHoaDon.toLocaleString("en-US")} lớn hơn nhiều so với toàn bộ dịch vụ+chi hộ đã ghi nhận của lô (~${tongLo.toLocaleString("en-US")}) — kiểm tra lại có gán đúng đơn không`;
    }
    return null;
  }

  async function doiChieuDanhSachHoaDon(file: File) {
    setLoiFileCong(null);
    try {
      const book = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
      const list = docDanhSachHoaDonDienTu(book.Sheets[book.SheetNames[0]]);
      if (list.length === 0) {
        setDoiChieuCong([]);
        setLoiFileCong("File chỉ có tiêu đề, chưa có hóa đơn để đối chiếu.");
        return;
      }
      const seen = new Set<string>();
      const checks = list.map((invoice) => {
        let ketQua = "Khớp số, khách hàng và tổng tiền";
        const key = `${invoice.kyHieuMau}|${invoice.kyHieu}|${invoice.soHoaDon}`;
        if (invoice.mstNguoiBan !== CONG_TY.mst) ketQua = "MST người bán không phải công ty";
        else if (!invoice.mstNguoiMua || !khachHangList.some((k) => k.ma_so_thue?.trim() === invoice.mstNguoiMua)) ketQua = "Chưa xác định được khách hàng theo MST";
        else if (seen.has(key)) ketQua = "Trùng hóa đơn trong file";
        else if (!/^\d{4}-\d{2}-\d{2}$/.test(invoice.ngayLap)) ketQua = "Ngày lập không hợp lệ";
        else if (![invoice.tienTruocThue, invoice.tienThue, invoice.tienChietKhau, invoice.tienPhi, invoice.tongThanhToan].every(Number.isFinite)) ketQua = "Số tiền không hợp lệ";
        else if (invoice.donViTienTe && invoice.donViTienTe.toUpperCase() !== "VND") ketQua = "Ngoại tệ: cần đối chiếu tỷ giá";
        else if (invoice.trangThai.toLowerCase().includes("hủy") || invoice.trangThai.toLowerCase().includes("huỷ")) ketQua = "Hóa đơn hủy: kiểm tra trạng thái trên app";
        else {
          const matched = rows.filter((r) => r.so_hoa_don?.trim() === invoice.soHoaDon && r.ngay_xuat === invoice.ngayLap);
          if (matched.length !== 1) ketQua = matched.length === 0 ? "Chưa có trong app (hoặc sai ngày lập)" : "Trùng số và ngày lập trong app";
          else if (khachHangList.find((k) => k.id === matched[0].khach_hang_id)?.ma_so_thue?.trim() !== invoice.mstNguoiMua) ketQua = "Sai khách hàng/MST";
          else if (Math.abs(matched[0].tong_tien - invoice.tongThanhToan) > 1) ketQua = "Lệch tổng thanh toán";
          else if (matched[0].trang_thai === "Đã hủy" || matched[0].trang_thai === "Đã thay thế") ketQua = "Trạng thái app cần kiểm tra";
          else {
            const donHangIds = lienKet.filter((l) => l.hoa_don_id === matched[0].id).map((l) => l.don_hang_id);
            if (donHangIds.length > 0) {
              const soDon = donHangList.filter((d) => donHangIds.includes(d.id)).map((d) => d.so_don_hang).join(", ");
              const canhBao = canhBaoLechHoaDon(matched[0].tong_tien, donHangIds);
              if (canhBao) ketQua = `Khớp số nhưng ${canhBao[0].toLowerCase()}${canhBao.slice(1)} (lô: ${soDon})`;
            }
          }
        }
        seen.add(key);
        return { dong: invoice.dong, so: invoice.soHoaDon, ketQua };
      });
      setDoiChieuCong(checks);
    } catch (error) {
      setDoiChieuCong(null);
      setLoiFileCong(error instanceof Error ? error.message : "Không đọc được file Excel");
    }
  }

  /** Chuoi goc <-> dieu chinh/thay the cua 1 hoa don, di theo con tro
   * hoa_don_goc_id/hoa_don_thay_the_id tren mang rows da co san — khong can
   * RPC/CTE de quy rieng. */
  function chuoiHoaDon(row: Row): Row[] {
    let dauChuoi = row;
    while (dauChuoi.hoa_don_goc_id) {
      const goc = rows.find((r) => r.id === dauChuoi.hoa_don_goc_id);
      if (!goc) break;
      dauChuoi = goc;
    }
    const chuoi: Row[] = [dauChuoi];
    let hienTai = dauChuoi;
    while (hienTai.hoa_don_thay_the_id) {
      const tiepTheo = rows.find((r) => r.id === hienTai.hoa_don_thay_the_id);
      if (!tiepTheo) break;
      chuoi.push(tiepTheo);
      hienTai = tiepTheo;
    }
    return chuoi;
  }

  function chiTietCuaHoaDon(hoaDonId: string) {
    const cp = chiPhiRows.filter((r) => r.hoa_don_id === hoaDonId);
    const pt = phuThuRows.filter((r) => r.hoa_don_id === hoaDonId);
    return { cp, pt };
  }

  function donHangCuaHoaDon(hoaDonId: string) {
    const ids = lienKet.filter((l) => l.hoa_don_id === hoaDonId).map((l) => l.don_hang_id);
    return donHangList.filter((d) => ids.includes(d.id));
  }

  // Hoa don Da huy/Da thay the khong con trang thai thu tien.
  const hetHieuLuc = (r: Row) => r.trang_thai === "Đã hủy" || r.trang_thai === "Đã thay thế";
  const nhomCua = (khachId: string) => khachHangList.find((k) => k.id === khachId)?.nhom_khach_hang_id ?? null;

  const filtered = rows
    .filter((r) => !khFilter || (khFilter.startsWith("nhom:") ? nhomCua(r.khach_hang_id) === khFilter.slice(5) : r.khach_hang_id === khFilter))
    .filter((r) => {
      if (!ttFilter) return true;
      if (ttFilter === "Đã hủy" || ttFilter === "Đã thay thế") return r.trang_thai === ttFilter;
      return !hetHieuLuc(r) && r.trang_thai_thanh_toan === ttFilter;
    });

  // Chi 5 truong duoi day (trong truongLuonGhiDuoc ben duoi) con duoc ghi TRUC
  // TIEP tu client sau migration 0095 (hoa_don_xuat bi khoa update o tang
  // GRANT, chi mo lai dung cac cot nay). Moi truong tai chinh cot loi khac
  // phai di qua RPC sua_hoa_don_xuat_moi_tao.
  function coTheSuaTruongTaiChinh(row: Row | null) {
    return !row || (row.trang_thai === "Đã phát hành" && row.loai_hoa_don === "Gốc" && !row.so_tien_da_thu);
  }

  async function handleSave(values: Record<string, string>, selectedDonHang: string[]) {
    const tongTruocThue = values.tong_tien_truoc_thue ? Number(values.tong_tien_truoc_thue) : 0;
    const vatPercent = values.vat_percent ? Number(values.vat_percent) : 0;
    const tienVat = Math.round((tongTruocThue * vatPercent) / 100);
    const kyKeKhai = values.ky_ke_khai || values.ngay_xuat.slice(0, 7);

    let hoaDonId = editing?.id;

    if (editing) {
      if (coTheSuaTruongTaiChinh(editing)) {
        const { error: rpcError } = await supabase.rpc("sua_hoa_don_xuat_moi_tao", {
          p_hoa_don_id: editing.id,
          p_khach_hang_id: values.khach_hang_id,
          p_so_hoa_don: values.so_hoa_don || null,
          p_ngay_xuat: values.ngay_xuat,
          p_tong_tien_truoc_thue: values.tong_tien_truoc_thue ? tongTruocThue : null,
          p_vat_percent: values.vat_percent ? vatPercent : null,
          p_tien_vat: tienVat,
          p_tien_chi_ho: values.tien_chi_ho ? Number(values.tien_chi_ho) : null,
          p_ky_ke_khai: kyKeKhai,
        });
        if (rpcError) {
          window.alert(rpcError.message);
          return;
        }
      }
      // CHI con ghi_chu/ky_ke_khai — so_tien_da_thu/trang_thai_thanh_toan/
      // phuong_thuc_thu KHONG con sua truc tiep duoc tu sau migration 0099
      // (bi khoa o tang GRANT), phai di qua nut "Thu tiền" -> RPC
      // thu_tien_hoa_don_xuat de xu ly dung phan tra thua thanh credit,
      // khong am tham "an" tien thua vao trang_thai_thanh_toan nua.
      const { data, error } = await supabase
        .from("hoa_don_xuat")
        .update({ ghi_chu: values.ghi_chu || null, ky_ke_khai: kyKeKhai })
        .eq("id", editing.id)
        .select("*, khach_hang:khach_hang_id(ten_day_du, ten_viet_tat)")
        .single();
      if (error) {
        window.alert(error.message);
        return;
      }
      setRows((prev) => prev.map((r) => (r.id === editing.id ? (data as Row) : r)));
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data: nv } = await supabase.from("nhan_vien").select("id").eq("auth_user_id", user?.id).single();

      // Hoa don MOI TAO chua ai dung toi nen van duoc phep set san mot khoan
      // da thu ngay tu luc tao (vd nhap lieu lai giao dich cu) — INSERT
      // khong bi khoa nhu UPDATE.
      const { data, error } = await supabase
        .from("hoa_don_xuat")
        .insert({
          khach_hang_id: values.khach_hang_id,
          so_hoa_don: values.so_hoa_don || null,
          ngay_xuat: values.ngay_xuat,
          tong_tien_truoc_thue: values.tong_tien_truoc_thue ? tongTruocThue : null,
          vat_percent: values.vat_percent ? vatPercent : null,
          tien_vat: tienVat,
          tien_chi_ho: values.tien_chi_ho ? Number(values.tien_chi_ho) : null,
          trang_thai_thanh_toan: values.trang_thai_thanh_toan || "Chưa thu",
          so_tien_da_thu: values.so_tien_da_thu ? Number(values.so_tien_da_thu) : null,
          phuong_thuc_thu: values.phuong_thuc_thu || null,
          ghi_chu: values.ghi_chu || null,
          ky_ke_khai: kyKeKhai,
          nguoi_tao_id: nv?.id,
        })
        .select("*, khach_hang:khach_hang_id(ten_day_du, ten_viet_tat)")
        .single();
      if (error) {
        window.alert(error.message);
        return;
      }
      hoaDonId = data.id;
      setRows((prev) => [data as Row, ...prev]);
    }

    if (hoaDonId) {
      await supabase.from("hoa_don_don_hang").delete().eq("hoa_don_id", hoaDonId);
      if (selectedDonHang.length > 0) {
        await supabase.from("hoa_don_don_hang").insert(selectedDonHang.map((donHangId) => ({ hoa_don_id: hoaDonId, don_hang_id: donHangId })));
      }
      setLienKet((prev) => [
        ...prev.filter((l) => l.hoa_don_id !== hoaDonId),
        ...selectedDonHang.map((donHangId) => ({ hoa_don_id: hoaDonId!, don_hang_id: donHangId })),
      ]);
    }

    setShowForm(false);
  }

  async function refetchRow(id: string) {
    const { data } = await supabase
      .from("hoa_don_xuat")
      .select("*, khach_hang:khach_hang_id(ten_day_du, ten_viet_tat)")
      .eq("id", id)
      .single();
    return data as Row | null;
  }

  // P1 muc 5e (2026-11-26): window.prompt()/window.confirm() KHONG duoc trinh
  // duyet nhung (preview trong app) ho tro — bam nut im lim, console bao loi
  // "prompt() is not supported". Thay bang modal rieng cua app (ConfirmDialog)
  // cho ca 3 hanh dong duoi day — mo dialog qua state, RPC thuc su chay trong
  // cac ham xuLy*ConfirmDialog goi tu onConfirm.
  function handleThuTien(row: Row) {
    setDialogThuTien(row);
  }
  async function xuLyThuTienConfirm(row: Row, values: Record<string, string>) {
    const soTien = Number((values.so_tien || "").replace(/[^\d.]/g, ""));
    if (!soTien || soTien <= 0) {
      window.alert("Số tiền không hợp lệ.");
      return;
    }
    setDialogThuTien(null);
    const { data, error } = await supabase.rpc("thu_tien_hoa_don_xuat", {
      p_hoa_don_id: row.id,
      p_so_tien: soTien,
      p_phuong_thuc: values.phuong_thuc,
      p_ghi_chu: null,
    });
    if (error) {
      window.alert(error.message);
      return;
    }
    const ketQua = data as { ap_dung_hoa_don: number; thua_thanh_credit: number } | null;
    if (ketQua && ketQua.thua_thanh_credit > 0) {
      window.alert(
        `Đã áp dụng ${ketQua.ap_dung_hoa_don.toLocaleString("en-US")} vào hóa đơn (Đã thu đủ).\nPhần dư ${ketQua.thua_thanh_credit.toLocaleString("en-US")} đã tự động chuyển thành CREDIT cho khách hàng này — xem ở trang Credit khách hàng/NCC.`,
      );
    }
    const updated = await refetchRow(row.id);
    if (updated) setRows((prev) => prev.map((r) => (r.id === row.id ? updated : r)));
  }

  function handleSuaPhuongThucThu(row: Row) {
    setDialogSuaPhuongThuc(row);
  }
  async function xuLySuaPhuongThucConfirm(row: Row, values: Record<string, string>) {
    setDialogSuaPhuongThuc(null);
    const { error } = await supabase.rpc("sua_phuong_thuc_thu_hoa_don_xuat", {
      p_hoa_don_id: row.id,
      p_phuong_thuc_moi: values.phuong_thuc_moi,
      p_ly_do: values.ly_do,
    });
    if (error) {
      window.alert(error.message);
      return;
    }
    const updated = await refetchRow(row.id);
    if (updated) setRows((prev) => prev.map((r) => (r.id === row.id ? updated : r)));
  }

  function handleHuy(row: Row) {
    setDialogHuy(row);
  }
  async function xuLyHuyConfirm(row: Row, values: Record<string, string>) {
    setDialogHuy(null);
    const { error } = await supabase.rpc("huy_hoa_don_xuat", { p_hoa_don_id: row.id, p_ly_do: values.ly_do });
    if (error) {
      window.alert(error.message);
      return;
    }
    setDsHuy((prev) => [...prev, { hoa_don_id: row.id, ly_do: values.ly_do, luc: new Date().toISOString(), nguoi: null }]);
    const updated = await refetchRow(row.id);
    if (updated) setRows((prev) => prev.map((r) => (r.id === row.id ? updated : r)));
  }

  async function handleDieuChinhThayThe(mode: "dieu_chinh" | "thay_the", row: Row, values: Record<string, string>, lyDo: string) {
    const tongTruocThue = values.tong_tien_truoc_thue ? Number(values.tong_tien_truoc_thue) : 0;
    const vatPercent = values.vat_percent ? Number(values.vat_percent) : 0;
    const tienVat = Math.round((tongTruocThue * vatPercent) / 100);
    const tienChiHo = values.tien_chi_ho ? Number(values.tien_chi_ho) : 0;
    const kyKeKhai = values.ky_ke_khai || values.ngay_xuat.slice(0, 7);

    const rpcName = mode === "dieu_chinh" ? "dieu_chinh_hoa_don_xuat" : "thay_the_hoa_don_xuat";
    const params: Record<string, unknown> =
      mode === "dieu_chinh"
        ? {
            p_hoa_don_goc_id: row.id,
            p_so_hoa_don: values.so_hoa_don || null,
            p_ngay_xuat: values.ngay_xuat,
            p_tong_tien_truoc_thue_delta: tongTruocThue,
            p_vat_percent: vatPercent,
            p_tien_vat_delta: tienVat,
            p_tien_chi_ho_delta: tienChiHo,
            p_ky_ke_khai: kyKeKhai,
            p_ly_do: lyDo,
          }
        : {
            p_hoa_don_goc_id: row.id,
            p_khach_hang_id: values.khach_hang_id || row.khach_hang_id,
            p_so_hoa_don: values.so_hoa_don || null,
            p_ngay_xuat: values.ngay_xuat,
            p_tong_tien_truoc_thue: tongTruocThue,
            p_vat_percent: vatPercent,
            p_tien_vat: tienVat,
            p_tien_chi_ho: tienChiHo,
            p_ky_ke_khai: kyKeKhai,
            p_ly_do: lyDo,
          };

    const { error } = await supabase.rpc(rpcName, params);
    if (error) {
      window.alert(error.message);
      return;
    }
    // Hoa don goc va hoa don moi deu doi/xuat hien — refetch toan bo danh sach cho don gian va chac chan dung.
    const { data } = await supabase
      .from("hoa_don_xuat")
      .select("*, khach_hang:khach_hang_id(ten_day_du, ten_viet_tat)")
      .order("ngay_xuat", { ascending: false });
    if (data) setRows(data as Row[]);
    setDctForm(null);
  }

  async function handleExportExcel() {
    const columns: ExcelColumn[] = [
      { header: "Khách hàng", key: "kh", width: 22 },
      { header: "Nhóm khách hàng", key: "nhom", width: 18 },
      { header: "Loại", key: "loai", width: 10 },
      { header: "Trạng thái hóa đơn", key: "trangThaiHd", width: 16 },
      { header: "Số hóa đơn", key: "so", width: 14 },
      { header: "Ngày xuất", key: "ngay", width: 12 },
      { header: "Tổng trước thuế", key: "truocThue", width: 16 },
      { header: "VAT %", key: "vat", width: 8 },
      { header: "Tiền chi hộ", key: "chiHo", width: 14 },
      { header: "Tiền VAT", key: "tienVat", width: 14 },
      { header: "Tổng tiền", key: "tong", width: 16 },
      { header: "Trạng thái thanh toán", key: "tt", width: 16 },
      { header: "Đã thu", key: "daThu", width: 14 },
      { header: "Đơn hàng liên quan", key: "donHang", width: 20 },
      { header: "Ghi chú", key: "ghiChu", width: 20 },
    ];
    const rows = filtered.map((r) => [
      khName(one(r.khach_hang)),
      nhomList.find((n) => n.id === nhomCua(r.khach_hang_id))?.ten ?? "",
      loaiXuatCua(r),
      r.trang_thai,
      r.so_hoa_don ?? "",
      r.ngay_xuat,
      r.tong_tien_truoc_thue ?? "",
      r.vat_percent ?? "",
      r.tien_chi_ho ?? "",
      r.tien_vat,
      r.tong_tien,
      hetHieuLuc(r) ? "" : r.trang_thai_thanh_toan,
      r.so_tien_da_thu ?? "",
      donHangCuaHoaDon(r.id).map((d) => d.so_don_hang).join(", "),
      r.ghi_chu ?? "",
    ]);
    const logo = await taiLogoCongTy();
    await xuatExcelKeO("hoa-don-xuat.xlsx", {
      sheetName: "Hóa đơn",
      logo: logo ?? undefined,
      headerLines: [...CONG_TY_HEADER_LINES, "", { text: "DANH SÁCH HÓA ĐƠN XUẤT", bold: true, size: 12 }],
      columns,
      rows,
    });
  }

  // Hoa don Da huy/Da thay the khong con la nghia vu cong no thuc su (xem quy
  // tac trong 0092) — loai khoi tong hop dau trang de khop voi Bao cao.
  const congNoRows = filtered.filter((r) => r.trang_thai !== "Đã hủy" && r.trang_thai !== "Đã thay thế");
  const tongTien = congNoRows.reduce((s, r) => s + r.tong_tien, 0);
  const tongDaThu = congNoRows.reduce((s, r) => s + (r.so_tien_da_thu ?? 0), 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Hóa đơn xuất</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/bao-cao#cong-no-theo-lo" className="text-sm font-medium text-blue-600 hover:underline">
            Xem công nợ theo lô →
          </Link>
          <button onClick={handleExportExcel} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            Xuất Excel
          </button>
          <label className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-sm">
            Đối chiếu Excel HĐĐT bán ra
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void doiChieuDanhSachHoaDon(file);
              e.target.value = "";
            }} />
          </label>
          <button onClick={chayRaSoatBatThuong} className="rounded-lg border border-amber-300 px-3 py-2 text-sm font-medium text-amber-700">
            Rà soát hóa đơn ↔ lô bất thường
          </button>
          {canEdit && (
            <button
              onClick={() => {
                setEditing(null);
                setShowForm(true);
              }}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm"
            >
              + Thêm hóa đơn
            </button>
          )}
        </div>
      </div>

      {loiFileCong && <p className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">{loiFileCong}</p>}
      {doiChieuCong && doiChieuCong.length > 0 && (
        <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4 text-sm">
          <h2 className="font-semibold">Kết quả đối chiếu danh sách hóa đơn điện tử</h2>
          <p className="mt-1 text-slate-600">{doiChieuCong.length} hóa đơn · {doiChieuCong.filter((item) => item.ketQua !== "Khớp số, khách hàng và tổng tiền").length} cần xử lý. Chức năng này chỉ đối chiếu, không ghi dữ liệu vào sổ hóa đơn.</p>
          {doiChieuCong.filter((item) => item.ketQua !== "Khớp số, khách hàng và tổng tiền").slice(0, 100).map((item, index) => (
            <p key={`${item.dong}-${index}`} className="mt-1 text-amber-800">Dòng {item.dong} · HĐ {item.so}: {item.ketQua}</p>
          ))}
          {doiChieuCong.length > 100 && <p className="mt-1 text-slate-500">Hiển thị tối đa 100 dòng cần xử lý.</p>}
        </div>
      )}

      {raSoatBatThuong && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm">
          <h2 className="font-semibold text-amber-900">Rà soát hóa đơn ↔ lô bất thường</h2>
          {raSoatBatThuong.length === 0 ? (
            <p className="mt-1 text-amber-800">Không thấy hóa đơn nào lệch lớn so với giá bán/chi hộ của lô đang gắn.</p>
          ) : (
            <>
              <p className="mt-1 text-amber-800">{raSoatBatThuong.length} hóa đơn có tổng tiền lệch lớn so với lô đang gắn — kiểm tra lại có gán đúng đơn không trước khi tin số liệu công nợ.</p>
              {raSoatBatThuong.map((item, index) => (
                <p key={index} className="mt-1 text-amber-800">HĐ {item.soHoaDon} · {item.khach}: {item.ketQua}</p>
              ))}
            </>
          )}
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="w-56">
          <SearchableSelect
            options={[
              ...nhomList.map((n) => ({ value: `nhom:${n.id}`, label: `Nhóm: ${n.ten} (tất cả công ty)` })),
              ...khachHangList.map((k) => ({ value: k.id, label: khOptionLabel(k) })),
            ]}
            value={khFilter}
            onChange={setKhFilter}
            placeholder="Tất cả khách hàng"
          />
        </div>
        <select value={ttFilter} onChange={(e) => setTtFilter(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm">
          <option value="">Tất cả trạng thái</option>
          {[...TT_THU, "Đã hủy", "Đã thay thế"].map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </div>

      <p className="mb-4 text-sm text-slate-600">
        Tổng tiền: <strong>{tongTien.toLocaleString("en-US")}</strong> · Đã thu: <strong>{tongDaThu.toLocaleString("en-US")}</strong> · Còn phải thu:{" "}
        <strong>{(tongTien - tongDaThu).toLocaleString("en-US")}</strong>
        <span className="ml-1 text-xs text-slate-400">(không tính hóa đơn đã hủy/đã thay thế)</span>
      </p>

      {canEdit && selectedForThu.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-blue-50 p-3 text-sm">
          <span>
            Đã chọn <strong>{selectedForThu.size}</strong> hóa đơn — còn phải thu tổng{" "}
            <strong>
              {rows
                .filter((r) => selectedForThu.has(r.id))
                .reduce((s, r) => s + (r.tong_tien - (r.so_tien_da_thu ?? 0)), 0)
                .toLocaleString("en-US")}
            </strong>
          </span>
          <div className="flex gap-2">
            <button onClick={() => setShowThuTienNhieu(true)} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white">
              Thu tiền (1 lần cho các hóa đơn đã chọn)
            </button>
            <button onClick={() => setSelectedForThu(new Set())} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700">
              Bỏ chọn
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {filtered.map((row) => (
          <div key={row.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-2 font-medium text-slate-900">
                {canEdit && row.trang_thai === "Đã phát hành" && row.trang_thai_thanh_toan !== "Đã thu đủ" && (
                  <input
                    type="checkbox"
                    checked={selectedForThu.has(row.id)}
                    onChange={(e) =>
                      setSelectedForThu((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) next.add(row.id);
                        else next.delete(row.id);
                        return next;
                      })
                    }
                  />
                )}
                {row.so_hoa_don || "(chưa có số)"} · {khName(one(row.khach_hang))}
              </span>
              <span className="flex gap-1">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TRANG_THAI_COLOR[row.trang_thai]}`}>{row.trang_thai}</span>
                {!hetHieuLuc(row) && (
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TT_COLOR[row.trang_thai_thanh_toan]}`}>{row.trang_thai_thanh_toan}</span>
                )}
              </span>
            </div>
            <p className="text-slate-500">
              {row.ngay_xuat} · Tổng: {row.tong_tien.toLocaleString("en-US")}
              {row.tien_vat ? ` (gồm VAT ${row.tien_vat.toLocaleString("en-US")}${row.vat_percent ? ` · ${row.vat_percent}%` : ""})` : ""}
              {row.tien_chi_ho ? ` (gồm chi hộ ${row.tien_chi_ho.toLocaleString("en-US")})` : ""}
              {row.so_tien_da_thu ? ` · Đã thu: ${row.so_tien_da_thu.toLocaleString("en-US")}` : ""}
              {row.loai_hoa_don !== "Gốc" ? ` · ${row.loai_hoa_don} cho hóa đơn khác` : ""}
            </p>
            {donHangCuaHoaDon(row.id).length > 0 && (
              <p className="text-slate-500">Đơn hàng: {donHangCuaHoaDon(row.id).map((d) => d.so_don_hang).join(", ")}</p>
            )}
            {row.ghi_chu && <p className="text-slate-500">{row.ghi_chu}</p>}
            {row.trang_thai === "Đã hủy" &&
              dsHuy
                .filter((h) => h.hoa_don_id === row.id)
                .map((h) => (
                  <p key={h.luc} className="text-red-700">
                    Hủy lúc {new Date(h.luc).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}
                    {h.nguoi ? ` bởi ${h.nguoi}` : ""} — Lý do: {h.ly_do || "(không ghi)"}
                  </p>
                ))}
            <FileAttachSection
              parentField="hoa_don_id"
              parentId={row.id}
              pathPrefix="hoa-don"
              lienKetToi="Hóa đơn"
              initialRows={dinhKemRows.filter((d) => d.hoa_don_id === row.id)}
              canUpload={canEdit}
              currentUserId={currentUserId}
            />
            <div className="mt-2 flex flex-wrap gap-3">
              <button
                onClick={() => setDoiChieuMoRong((prev) => (prev === row.id ? null : row.id))}
                className="text-xs font-medium text-slate-600"
              >
                {doiChieuMoRong === row.id ? "Ẩn đối chiếu" : "Đối chiếu với Bảng kê"}
              </button>
              {chuoiHoaDon(row).length > 1 && (
                <button
                  onClick={() => setLichSuMoRong((prev) => (prev === row.id ? null : row.id))}
                  className="text-xs font-medium text-slate-600"
                >
                  {lichSuMoRong === row.id ? "Ẩn lịch sử" : "Xem lịch sử"}
                </button>
              )}
              {canEdit && coTheSuaTruongTaiChinh(row) && (
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
              {canEdit && row.trang_thai === "Đã phát hành" && row.trang_thai_thanh_toan !== "Đã thu đủ" && (
                <button onClick={() => handleThuTien(row)} className="text-xs font-medium text-green-700">
                  Thu tiền
                </button>
              )}
              {canEdit && row.trang_thai === "Đã phát hành" && (row.so_tien_da_thu ?? 0) > 0 && (
                <button onClick={() => handleSuaPhuongThucThu(row)} className="text-xs font-medium text-teal-700">
                  Sửa phương thức thu
                </button>
              )}
              {canEdit && row.trang_thai === "Đã phát hành" && (
                <>
                  <button onClick={() => setDctForm({ mode: "dieu_chinh", row })} className="text-xs font-medium text-amber-600">
                    Điều chỉnh
                  </button>
                  <button onClick={() => setDctForm({ mode: "thay_the", row })} className="text-xs font-medium text-orange-600">
                    Thay thế
                  </button>
                </>
              )}
              {canHuy && row.trang_thai === "Đã phát hành" && (
                <button onClick={() => handleHuy(row)} className="text-xs font-medium text-red-600">
                  Hủy hóa đơn
                </button>
              )}
            </div>
            {lichSuMoRong === row.id && (
              <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-600">
                {chuoiHoaDon(row).map((h, i) => (
                  <p key={h.id}>
                    {i > 0 && "→ "}
                    {h.loai_hoa_don} · {h.so_hoa_don || "(chưa có số)"} · {h.ngay_xuat} · {h.tong_tien.toLocaleString("en-US")} ·{" "}
                    <span className={`rounded-full px-1.5 py-0.5 font-medium ${TRANG_THAI_COLOR[h.trang_thai]}`}>{h.trang_thai}</span>
                  </p>
                ))}
              </div>
            )}
            {doiChieuMoRong === row.id && <DoiChieuBangKe {...chiTietCuaHoaDon(row.id)} row={row} />}
          </div>
        ))}
        {filtered.length === 0 && <p className="py-8 text-center text-sm text-slate-400">Chưa có hóa đơn nào.</p>}
      </div>

      {showForm && (
        <HoaDonForm
          initial={editing}
          khachHangList={khachHangList}
          nhomList={nhomList}
          donHangList={donHangList}
          initialDonHangIds={editing ? donHangCuaHoaDon(editing.id).map((d) => d.id) : []}
          donHangDaCoHoaDon={(() => {
            // P1 muc 5b: don da duoc hoa don KHAC (khong phai hoa don dang
            // sua, neu co) gan toi — dung de canh bao trong form, khong loc
            // khoi danh sach (xem HoaDonForm).
            const map = new Map<string, string[]>();
            for (const l of lienKet) {
              if (editing && l.hoa_don_id === editing.id) continue;
              const hd = rows.find((r) => r.id === l.hoa_don_id);
              if (!hd || hd.trang_thai === "Đã hủy" || hd.trang_thai === "Đã thay thế") continue;
              const arr = map.get(l.don_hang_id) ?? [];
              arr.push(`${hd.so_hoa_don || "(chưa có số)"} (${loaiXuatCua(hd)})`);
              map.set(l.don_hang_id, arr);
            }
            return map;
          })()}
          onCancel={() => setShowForm(false)}
          onSave={handleSave}
        />
      )}

      {dctForm && (
        <DieuChinhThayTheForm
          mode={dctForm.mode}
          row={dctForm.row}
          khachHangList={khachHangList}
          onCancel={() => setDctForm(null)}
          onSave={(values, lyDo) => handleDieuChinhThayThe(dctForm.mode, dctForm.row, values, lyDo)}
        />
      )}

      {showThuTienNhieu && (
        <ThuTienNhieuHoaDonForm
          rows={rows.filter((r) => selectedForThu.has(r.id))}
          onCancel={() => setShowThuTienNhieu(false)}
          onDone={async () => {
            setShowThuTienNhieu(false);
            const ids = Array.from(selectedForThu);
            setSelectedForThu(new Set());
            const updated = await Promise.all(ids.map((id) => refetchRow(id)));
            setRows((prev) => prev.map((r) => updated.find((u) => u?.id === r.id) ?? r));
          }}
        />
      )}

      {dialogThuTien && (
        <ConfirmDialog
          title={`Ghi nhận thu tiền — ${dialogThuTien.so_hoa_don ?? "(chưa có số)"}`}
          message={`Còn phải thu ${(dialogThuTien.tong_tien - (dialogThuTien.so_tien_da_thu ?? 0)).toLocaleString("en-US")}. Số tiền thực nhận có thể lớn hơn, phần dư sẽ tự chuyển thành credit của khách hàng.`}
          fields={[
            { key: "so_tien", label: "Số tiền thực nhận", required: true, placeholder: "VD: 10000000" },
            {
              key: "phuong_thuc",
              label: "Phương thức thu",
              type: "select",
              defaultValue: dialogThuTien.phuong_thuc_thu || "Tài khoản công ty",
              options: [
                { value: "Tài khoản công ty", label: "Tài khoản công ty" },
                { value: "Tiền mặt", label: "Tiền mặt" },
              ],
            },
          ]}
          confirmLabel="Ghi nhận"
          onCancel={() => setDialogThuTien(null)}
          onConfirm={(values) => xuLyThuTienConfirm(dialogThuTien, values)}
        />
      )}

      {dialogSuaPhuongThuc && (
        <ConfirmDialog
          title={`Sửa phương thức thu — ${dialogSuaPhuongThuc.so_hoa_don ?? "(chưa có số)"}`}
          message={`Đang ghi nhận thu qua "${dialogSuaPhuongThuc.phuong_thuc_thu || "(chưa có)"}".`}
          fields={[
            {
              key: "phuong_thuc_moi",
              label: "Phương thức đúng",
              type: "select",
              defaultValue: dialogSuaPhuongThuc.phuong_thuc_thu === "Tiền mặt" ? "Tài khoản công ty" : "Tiền mặt",
              options: [
                { value: "Tài khoản công ty", label: "Tài khoản công ty" },
                { value: "Tiền mặt", label: "Tiền mặt" },
              ],
            },
            { key: "ly_do", label: "Lý do sửa", type: "textarea", required: true, placeholder: "Bắt buộc" },
          ]}
          confirmLabel="Lưu"
          onCancel={() => setDialogSuaPhuongThuc(null)}
          onConfirm={(values) => xuLySuaPhuongThucConfirm(dialogSuaPhuongThuc, values)}
        />
      )}

      {dialogHuy && (
        <ConfirmDialog
          title={`Hủy hóa đơn — ${dialogHuy.so_hoa_don ?? "(chưa có số)"}`}
          fields={[{ key: "ly_do", label: "Lý do hủy", type: "textarea", required: true, placeholder: "Bắt buộc" }]}
          confirmLabel="Xác nhận hủy"
          danger
          onCancel={() => setDialogHuy(null)}
          onConfirm={(values) => xuLyHuyConfirm(dialogHuy, values)}
        />
      )}
    </div>
  );
}

/** Ghi nhan 1 lan thu tien (vd 1 lan chuyen khoan) duoc phan bo cho NHIEU hoa
 * don da chon — dien 1 so tien + 1 phuong thuc duy nhat, tu dong chia theo
 * thu tu ngay xuat cu nhat truoc, moi hoa don nhan toi da dung phan con thieu
 * cua no; hoa don CUOI CUNG trong danh sach nhan phan con du (neu nhap du
 * nhieu hon tong con phai thu) de RPC thu_tien_hoa_don_xuat tu chuyen thanh
 * credit nhu hanh vi thu tung hoa don rieng le da co. Goi lai dung RPC do cho
 * tung hoa don (tuan tu, khong dung transaction gop) — khong doi logic nghiep
 * vu, chi gom thao tac UI. */
function ThuTienNhieuHoaDonForm({ rows, onCancel, onDone }: { rows: Row[]; onCancel: () => void; onDone: () => void }) {
  const supabase = useMemo(() => createClient(), []);
  const sorted = useMemo(() => [...rows].sort((a, b) => a.ngay_xuat.localeCompare(b.ngay_xuat)), [rows]);
  const tongConLai = sorted.reduce((s, r) => s + (r.tong_tien - (r.so_tien_da_thu ?? 0)), 0);
  const [soTien, setSoTien] = useState(String(tongConLai));
  const [phuongThuc, setPhuongThuc] = useState("Tài khoản công ty");
  const [saving, setSaving] = useState(false);
  // Xac nhan chenh lech gan voi dung so tien dang nhap: doi so tien la phai tick lai.
  const [dongYLechVoi, setDongYLechVoi] = useState<string | null>(null);
  const chenhLech = (Number(soTien) || 0) - tongConLai;
  const [err, setErr] = useState<string | null>(null);

  const phanBo = useMemo(() => {
    const tongInput = Number(soTien) || 0;
    return sorted.reduce<{ result: { row: Row; apDung: number }[]; pool: number }>(
      (acc, r, i) => {
        const conLai = r.tong_tien - (r.so_tien_da_thu ?? 0);
        const isLast = i === sorted.length - 1;
        const apDung = isLast ? acc.pool : Math.min(acc.pool, conLai);
        return { result: [...acc.result, { row: r, apDung }], pool: acc.pool - conLai };
      },
      { result: [], pool: tongInput }
    ).result;
  }, [sorted, soTien]);

  async function handleSubmit() {
    const tong = Number(soTien);
    if (!tong || tong <= 0) {
      setErr("Nhập số tiền hợp lệ.");
      return;
    }
    if (Math.abs(chenhLech) >= 1 && dongYLechVoi !== soTien) {
      setErr("Số tiền thực nhận khác tổng còn phải thu của các hóa đơn đã chọn — kiểm tra lại, hoặc tick xác nhận chênh lệch.");
      return;
    }
    setSaving(true);
    setErr(null);
    for (const { row, apDung } of phanBo) {
      if (apDung <= 0) continue;
      const { error } = await supabase.rpc("thu_tien_hoa_don_xuat", {
        p_hoa_don_id: row.id,
        p_so_tien: apDung,
        p_phuong_thuc: phuongThuc,
        p_ghi_chu: `Thu gộp nhiều hóa đơn cùng lúc (${sorted.length} hóa đơn)`,
      });
      if (error) {
        setSaving(false);
        setErr(`Đã dừng tại hóa đơn "${row.so_hoa_don ?? row.id}": ${error.message}. Các hóa đơn xử lý trước đó vẫn đã được ghi nhận.`);
        return;
      }
    }
    setSaving(false);
    onDone();
  }

  const cls = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-lg sm:rounded-2xl">
        <h2 className="mb-1 text-lg font-semibold text-slate-900">Thu tiền cho {sorted.length} hóa đơn</h2>
        <p className="mb-4 text-xs text-slate-400">
          Dùng khi 1 lần chuyển khoản/tiền mặt trả gộp nhiều hóa đơn — nhập đúng 1 số tiền tổng, hệ thống tự chia cho
          từng hóa đơn (cũ nhất trước), phần dư nếu có sẽ thành credit của khách hàng.
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Tổng số tiền thực nhận</label>
            <MoneyInput value={soTien} onChange={setSoTien} className={cls} />
            <p className="mt-1 text-xs text-slate-400">Tổng còn phải thu của các hóa đơn đã chọn: {tongConLai.toLocaleString("en-US")}</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Phương thức</label>
            <select value={phuongThuc} onChange={(e) => setPhuongThuc(e.target.value)} className={cls}>
              <option value="Tiền mặt">Tiền mặt</option>
              <option value="Tài khoản công ty">Tài khoản công ty</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-1.5 rounded-lg bg-slate-50 p-3 text-sm">
          <p className="mb-1 text-xs font-medium text-slate-500">Dự kiến phân bổ:</p>
          {phanBo.map(({ row, apDung }) => (
            <div key={row.id} className="flex items-center justify-between">
              <span className="text-slate-700">
                {row.so_hoa_don || "(chưa có số)"} · {row.ngay_xuat}
              </span>
              <span className={`font-medium ${apDung > row.tong_tien - (row.so_tien_da_thu ?? 0) ? "text-blue-600" : "text-slate-900"}`}>
                {apDung.toLocaleString("en-US")}
                {apDung > row.tong_tien - (row.so_tien_da_thu ?? 0) && " (gồm dư → credit)"}
              </span>
            </div>
          ))}
        </div>

        {Math.abs(chenhLech) >= 1 && (
          <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            <p>
              Thực nhận {chenhLech > 0 ? "NHIỀU hơn" : "ÍT hơn"} tổng còn phải thu <strong>{Math.abs(chenhLech).toLocaleString("en-US")}</strong>.{" "}
              {chenhLech > 0
                ? "Kiểm tra xem có hóa đơn nào chưa chọn hoặc chưa nhập vào app; phần dư sẽ thành credit."
                : "Hóa đơn mới nhất sẽ chỉ được thu một phần."}
            </p>
            <label className="mt-2 flex items-center gap-2">
              <input type="checkbox" checked={dongYLechVoi === soTien} onChange={(e) => setDongYLechVoi(e.target.checked ? soTien : null)} />
              Tôi đã kiểm tra và đồng ý ghi nhận với chênh lệch này
            </label>
          </div>
        )}

        {err && <p className="mt-3 text-sm text-red-600">{err}</p>}

        <div className="mt-6 flex gap-3">
          <button type="button" onClick={onCancel} className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700">
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {saving ? "Đang ghi nhận..." : "Ghi nhận thu tiền"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DoiChieuBangKe({ cp, pt, row }: { cp: ChiPhiDoiChieu[]; pt: PhuThuDoiChieu[]; row: Row }) {
  const dong = [
    ...cp.map((r) => {
      const soTien = r.chi_ho ? r.so_tien_da_chi ?? 0 : r.gia_ban_sell ?? 0;
      const vatPercent = r.chi_ho ? 0 : row.vat_percent || r.vat_percent || 0;
      const tienVat = r.chi_ho ? 0 : Math.round((soTien * vatPercent) / 100);
      return {
        id: r.id,
        dienGiai: one(r.loai_chi_phi)?.ten ?? "—",
        donHang: one(r.don_hang)?.so_don_hang ?? "—",
        soTien,
        tienVat,
        ghiChu: r.chi_ho ? "Chi hộ" : "Xuất HĐ",
      };
    }),
    ...pt.map((r) => {
      const soTien = r.thanh_tien ?? 0;
      const tienVat = Math.round((soTien * (row.vat_percent || 0)) / 100);
      return {
        id: r.id,
        dienGiai: `Phụ thu: ${r.loai_phu_thu ?? "—"}`,
        donHang: one(r.don_hang)?.so_don_hang ?? "—",
        soTien,
        tienVat,
        ghiChu: "Xuất HĐ (Phụ thu)",
      };
    }),
  ];
  const tongGiaBanVaChiHo = dong.reduce((s, r) => s + r.soTien, 0);
  const tongVat = dong.reduce((s, r) => s + r.tienVat, 0);
  // row.tong_tien la cot generated = truoc_thue + VAT + tien_chi_ho (xem
  // migration 0031/0038) — DA GOM san chi ho, va tongGiaBanVaChiHo o day cung
  // da cong ca dong "Chi hộ" nen khop thang voi tong_tien, khong duoc cong
  // them tien_chi_ho lan nua (tung nham la khong gom, gay bao "Chenh lech" gia
  // tren moi hoa don co chi ho).
  const tongHoaDonThatSu = row.tong_tien;
  const khop = tongGiaBanVaChiHo + tongVat === tongHoaDonThatSu;

  return (
    <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
      {dong.length === 0 ? (
        <p className="text-xs text-slate-400">Hóa đơn này không gắn với dòng chi phí/phụ thu nào (có thể tạo thủ công).</p>
      ) : (
        <>
          <table className="w-full text-xs">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="px-2 py-1 font-medium">Diễn giải</th>
                <th className="px-2 py-1 font-medium">Đơn hàng</th>
                <th className="px-2 py-1 font-medium">Thành tiền</th>
                <th className="px-2 py-1 font-medium">Tiền VAT</th>
                <th className="px-2 py-1 font-medium">Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {dong.map((r) => (
                <tr key={r.id} className="border-t border-slate-200">
                  <td className="px-2 py-1">{r.dienGiai}</td>
                  <td className="px-2 py-1">{r.donHang}</td>
                  <td className="px-2 py-1">{r.soTien.toLocaleString("en-US")}</td>
                  <td className="px-2 py-1">{r.tienVat ? r.tienVat.toLocaleString("en-US") : ""}</td>
                  <td className="px-2 py-1 text-slate-500">{r.ghiChu}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-300 font-semibold">
                <td className="px-2 py-1" colSpan={2}>
                  Cộng dồn (khớp Bảng kê chi tiết)
                </td>
                <td className="px-2 py-1">{tongGiaBanVaChiHo.toLocaleString("en-US")}</td>
                <td className="px-2 py-1">{tongVat.toLocaleString("en-US")}</td>
                <td className="px-2 py-1"></td>
              </tr>
            </tfoot>
          </table>
          <p className={`mt-2 text-xs font-medium ${khop ? "text-green-700" : "text-red-600"}`}>
            {khop
              ? `Khớp: Tổng dòng ${tongGiaBanVaChiHo.toLocaleString("en-US")} + VAT ${tongVat.toLocaleString("en-US")} = Tổng hóa đơn (gồm chi hộ nếu có) ${tongHoaDonThatSu.toLocaleString("en-US")}.`
              : `Chênh lệch ${(tongHoaDonThatSu - tongGiaBanVaChiHo - tongVat).toLocaleString("en-US")} so với hóa đơn (gồm chi hộ nếu có) ${tongHoaDonThatSu.toLocaleString("en-US")} — có thể do sửa tay số liệu hóa đơn sau khi xuất.`}
          </p>
        </>
      )}
      {row.ky_ke_khai && (
        <p className="mt-2 text-xs text-slate-500">
          Kỳ kê khai: {row.ky_ke_khai} ·{" "}
          <a href={`/bao-cao/vat?ky=${row.ky_ke_khai}`} className="font-medium text-blue-600">
            Xem trong Báo cáo VAT →
          </a>
        </p>
      )}
    </div>
  );
}

function HoaDonForm({
  initial,
  khachHangList,
  nhomList,
  donHangList,
  initialDonHangIds,
  donHangDaCoHoaDon,
  onCancel,
  onSave,
}: {
  initial: Row | null;
  khachHangList: KhachHang[];
  nhomList: NhomCoMe[];
  donHangList: DonHangOpt[];
  initialDonHangIds: string[];
  /** So hoa don KHAC (khong phai hoa don dang sua) da gan cho tung don hang —
   * P1 muc 5b: don da co hoa don van hien de chon (co the con phan chua len
   * hoa don), nhung phai canh bao ro + bat xac nhan truoc khi chon, tranh
   * xuat trung vo y. */
  donHangDaCoHoaDon: Map<string, string[]>;
  onCancel: () => void;
  onSave: (values: Record<string, string>, selectedDonHang: string[]) => void;
}) {
  const [values, setValues] = useState({
    khach_hang_id: initial?.khach_hang_id ?? "",
    so_hoa_don: initial?.so_hoa_don ?? "",
    ngay_xuat: initial?.ngay_xuat ?? new Date().toISOString().slice(0, 10),
    tong_tien_truoc_thue: initial?.tong_tien_truoc_thue?.toString() ?? "",
    vat_percent: initial?.vat_percent?.toString() ?? "",
    tien_chi_ho: initial?.tien_chi_ho?.toString() ?? "",
    trang_thai_thanh_toan: initial?.trang_thai_thanh_toan ?? "Chưa thu",
    so_tien_da_thu: initial?.so_tien_da_thu?.toString() ?? "",
    phuong_thuc_thu: initial?.phuong_thuc_thu ?? "",
    ghi_chu: initial?.ghi_chu ?? "",
    ky_ke_khai: initial?.ky_ke_khai ?? "",
  });
  const [selectedDonHang, setSelectedDonHang] = useState<string[]>(initialDonHangIds);
  const [goiYTong, setGoiYTong] = useState<number | null>(null);
  const supabase = useMemo(() => createClient(), []);
  // Sau khi hoa don da co tien thu, da dieu chinh/thay the/huy, hoac ban than
  // no la dong Dieu chinh/Thay the — khong duoc sua truc tiep cac truong tai
  // chinh cot loi nua (xem sua_hoa_don_xuat_moi_tao, migration 0094/0095) —
  // dung Dieu chinh/Thay the tu danh sach thay vi form nay.
  const khoaTruongTaiChinh = !!initial && !(initial.trang_thai === "Đã phát hành" && initial.loai_hoa_don === "Gốc" && !initial.so_tien_da_thu);

  function set(key: keyof typeof values, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  // P1 muc 5b/5e (2026-11-26): window.confirm() khong duoc trinh duyet nhung
  // ho tro (xac nhan xong im lim, khong tick duoc) — xac nhan don-da-co-HD
  // qua ConfirmDialog (state ben duoi) thay vi goi truc tiep window.confirm().
  const [xacNhanChonDonDaCoHD, setXacNhanChonDonDaCoHD] = useState<string | null>(null);

  function toggleDonHang(id: string) {
    if (!selectedDonHang.includes(id)) {
      const hoaDonKhac = donHangDaCoHoaDon.get(id);
      if (hoaDonKhac && hoaDonKhac.length > 0) {
        setXacNhanChonDonDaCoHD(id);
        return;
      }
    }
    setSelectedDonHang((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  useEffect(() => {
    let cancelled = false;
    if (selectedDonHang.length === 0) {
      Promise.resolve().then(() => {
        if (!cancelled) setGoiYTong(null);
      });
    } else {
      supabase.rpc("tong_sell_khong_chi_ho", { p_don_hang_ids: selectedDonHang }).then(({ data }) => {
        if (!cancelled) setGoiYTong(typeof data === "number" ? data : null);
      });
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDonHang.join(",")]);

  const khOptions = khachHangList.map((k) => ({ value: k.id, label: khOptionLabel(k) }));
  const [loaiXuat, setLoaiXuat] = useState<LoaiXuat>(initial ? loaiXuatCua(initial) : "Dịch vụ");
  const [ghiChuTuChon, setGhiChuTuChon] = useState<string | null>(null);

  function donThuocKhach(d: DonHangOpt, khachId: string, loai: LoaiXuat) {
    const dichVu = khachXuatDichVu(d, khachHangList, nhomList) === khachId;
    const chiHo = d.khach_hang_id === khachId;
    return loai === "Dịch vụ" ? dichVu : loai === "Chi hộ" ? chiHo : dichVu || chiHo;
  }

  // Chi liet ke don cua khach da chon (kem cac don da tick de con bo tick duoc).
  const donHangCuaKh = donHangList.filter(
    (d) => selectedDonHang.includes(d.id) || (!!values.khach_hang_id && donThuocKhach(d, values.khach_hang_id, loaiXuat)),
  );

  /** Dat khach + loai cung luc: tu chuyen sang cong ty me khi xuat dich vu, bo tick don khong con thuoc khach. */
  function datKhachVaLoai(khachId: string, loai: LoaiXuat) {
    let khachMoi = khachId;
    let ghiChu: string | null = null;
    if (loai === "Dịch vụ" && khachId) {
      const me = khachMeCua(khachId, khachHangList, nhomList);
      if (me && khachHangList.some((k) => k.id === me)) {
        khachMoi = me;
        ghiChu = `Hóa đơn dịch vụ xuất cho công ty mẹ của nhóm: đã đổi từ ${khOptionTen(khachId)}.`;
      }
    }
    if (loai === "Chi hộ" && selectedDonHang.length > 0) {
      const khachCuaDon = new Set(donHangList.filter((d) => selectedDonHang.includes(d.id)).map((d) => d.khach_hang_id));
      const duyNhat = khachCuaDon.size === 1 ? Array.from(khachCuaDon)[0] : null;
      if (duyNhat && duyNhat !== khachId) {
        khachMoi = duyNhat;
        ghiChu = "Hóa đơn chi hộ: đã tự chọn khách của đơn hàng đã tick.";
      }
    }
    setLoaiXuat(loai);
    setGhiChuTuChon(ghiChu);
    setValues((prev) => ({
      ...prev,
      khach_hang_id: khachMoi,
      ...(loai === "Dịch vụ" ? { tien_chi_ho: "" } : {}),
      ...(loai === "Chi hộ" ? { tong_tien_truoc_thue: "", vat_percent: "" } : {}),
    }));
    setSelectedDonHang((prev) =>
      prev.filter((id) => {
        const d = donHangList.find((x) => x.id === id);
        return !d || !khachMoi || donThuocKhach(d, khachMoi, loai);
      }),
    );
  }
  const cls = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";

  const HOA_DON_STEPS = ["Khách hàng & đơn hàng", "Dòng tiền & VAT", "Thanh toán", "Xem trước"] as const;
  const [step, setStep] = useState(0);

  function khOptionTen(id: string) {
    return khachHangList.find((k) => k.id === id)?.ten_day_du ?? "—";
  }

  const tongTienCoThue = (Number(values.tong_tien_truoc_thue) || 0) * (1 + (Number(values.vat_percent) || 0) / 100) + (Number(values.tien_chi_ho) || 0);

  // P1 muc 5a (2026-11-26): khong cho luu hoa don trong — bat buoc So hoa don,
  // Ngay xuat, Tong tien > 0. Validate o DAY (truoc khi goi onSave) de chan
  // moi duong dan submit (kec ca neu Escape/phim tat nao do vo tinh trigger
  // submit cua <form>), khong chi dua vao nguoi dung bam dung nut "Luu".
  function hopLeDeLuu(): string | null {
    if (!values.khach_hang_id) return "Chưa chọn khách hàng.";
    if (!values.so_hoa_don.trim()) return "Chưa nhập Số hóa đơn.";
    if (!values.ngay_xuat) return "Chưa nhập Ngày xuất.";
    if (tongTienCoThue <= 0) return "Tổng tiền phải lớn hơn 0.";
    return null;
  }

  const coDuLieuDaNhap =
    !!values.so_hoa_don.trim() || !!values.tong_tien_truoc_thue.trim() || !!values.tien_chi_ho.trim() || !!values.ghi_chu.trim() || selectedDonHang.length > 0;
  // P1 muc 5e: window.confirm() cung khong duoc trinh duyet nhung ho tro —
  // dung ConfirmDialog (modal rieng cua app) thay vi window.confirm().
  const [xacNhanDong, setXacNhanDong] = useState(false);

  function huyForm() {
    // P1 muc 5a: hoi xac nhan neu da nhap do, tranh mat du lieu khi bam
    // Huy/Escape/bam ra ngoai nham.
    if (coDuLieuDaNhap) {
      setXacNhanDong(true);
      return;
    }
    onCancel();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onKeyDown={(e) => {
        // Chan Escape o tang NGOAI CUNG — tuyet doi khong de lot xuong <form>
        // (vai trinh duyet nhung tung ghi nhan Escape nhu mot phim submit).
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          huyForm();
        }
      }}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const loi = hopLeDeLuu();
          if (loi) {
            window.alert(loi);
            return;
          }
          onSave(values, selectedDonHang);
        }}
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-lg sm:rounded-2xl"
      >
        <h2 className="mb-2 text-lg font-semibold text-slate-900">{initial ? "Sửa hóa đơn" : "Thêm hóa đơn"}</h2>
        <div className="mb-4 flex flex-wrap gap-1.5 text-xs">
          {HOA_DON_STEPS.map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => i < step && setStep(i)}
              disabled={i > step}
              className={`rounded-full px-2.5 py-1 font-medium ${
                i === step ? "bg-blue-600 text-white" : i < step ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-400"
              }`}
            >
              {i + 1}. {label}
            </button>
          ))}
        </div>
        {khoaTruongTaiChinh && (
          <p className="mb-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-700">
            Hóa đơn đã có tiền thu hoặc đã qua điều chỉnh/thay thế/hủy — không sửa trực tiếp được số tiền/khách hàng/số hóa đơn/ngày xuất nữa. Dùng nút
            &quot;Điều chỉnh&quot;/&quot;Thay thế&quot; ở danh sách nếu cần thay đổi.
          </p>
        )}

        {step === 0 && (
          <div className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Loại hóa đơn</label>
              <select
                value={loaiXuat}
                onChange={(e) => datKhachVaLoai(values.khach_hang_id, e.target.value as LoaiXuat)}
                className={cls}
                disabled={khoaTruongTaiChinh}
              >
                {LOAI_XUAT.map((v) => (
                  <option key={v} value={v}>
                    {v === "Gộp" ? "Gộp (dịch vụ + chi hộ cùng 1 hóa đơn)" : v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Khách hàng</label>
              <SearchableSelect options={khOptions} value={values.khach_hang_id} onChange={(v) => datKhachVaLoai(v, loaiXuat)} disabled={khoaTruongTaiChinh} />
              {ghiChuTuChon && <p className="mt-1 text-xs text-blue-600">{ghiChuTuChon}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Đơn hàng liên quan (có thể chọn nhiều)</label>
              <div className="max-h-52 overflow-y-auto rounded-lg border border-slate-200 p-2">
                {donHangCuaKh.length === 0 && (
                  <p className="text-xs text-slate-400">
                    {values.khach_hang_id ? `Không có đơn hàng nào xuất hóa đơn "${loaiXuat}" cho khách này.` : "Chọn khách hàng để xem đơn hàng."}
                  </p>
                )}
                {donHangCuaKh.map((d) => {
                  const hoaDonKhac = donHangDaCoHoaDon.get(d.id);
                  return (
                    <label key={d.id} className="flex items-center gap-2 py-1 text-sm">
                      <input type="checkbox" checked={selectedDonHang.includes(d.id)} onChange={() => toggleDonHang(d.id)} />
                      {d.so_don_hang}
                      {d.khach_hang_id && d.khach_hang_id !== values.khach_hang_id && (
                        <span className="text-xs text-slate-400">({khOptionTen(d.khach_hang_id)})</span>
                      )}
                      {hoaDonKhac && hoaDonKhac.length > 0 && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">⚠ Đã có HĐ: {hoaDonKhac.join(", ")}</span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Số hóa đơn</label>
              <input
                value={values.so_hoa_don}
                onChange={(e) => set("so_hoa_don", e.target.value)}
                className={cls}
                disabled={khoaTruongTaiChinh}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Ngày xuất</label>
              <input
                required
                type="date"
                value={values.ngay_xuat}
                onChange={(e) => set("ngay_xuat", e.target.value)}
                className={cls}
                disabled={khoaTruongTaiChinh}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Tổng tiền trước thuế</label>
              <MoneyInput value={values.tong_tien_truoc_thue} onChange={(v) => set("tong_tien_truoc_thue", v)} className={cls} disabled={khoaTruongTaiChinh || loaiXuat === "Chi hộ"} />
              {goiYTong !== null && loaiXuat !== "Chi hộ" && (
                <p className="mt-1 text-xs text-blue-600">
                  Gợi ý (đã bán cho khách, không gồm chi hộ): {goiYTong.toLocaleString("en-US")}
                  {values.tong_tien_truoc_thue !== String(goiYTong) && (
                    <button type="button" onClick={() => set("tong_tien_truoc_thue", String(goiYTong))} className="ml-2 underline">
                      Dùng số này
                    </button>
                  )}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">VAT %</label>
              <input
                type="number"
                step="any"
                value={values.vat_percent}
                onChange={(e) => set("vat_percent", e.target.value)}
                className={cls}
                disabled={khoaTruongTaiChinh || loaiXuat === "Chi hộ"}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Tiền chi hộ</label>
              <MoneyInput value={values.tien_chi_ho} onChange={(v) => set("tien_chi_ho", v)} className={cls} disabled={khoaTruongTaiChinh || loaiXuat === "Dịch vụ"} />
              <p className="mt-1 text-xs text-slate-400">Khoản thu hộ đúng số tiền, không tính VAT</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Kỳ kê khai VAT</label>
              <input
                value={values.ky_ke_khai}
                onChange={(e) => set("ky_ke_khai", e.target.value)}
                placeholder={values.ngay_xuat.slice(0, 7)}
                className={cls}
              />
            </div>
            <p className="sm:col-span-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
              Tổng cộng (có thuế + chi hộ): <strong>{tongTienCoThue.toLocaleString("en-US")}</strong>
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Trạng thái thanh toán</label>
              {initial ? (
                <p className={`rounded-lg px-3 py-2 text-sm ${TT_COLOR[values.trang_thai_thanh_toan] ?? ""}`}>{values.trang_thai_thanh_toan}</p>
              ) : (
                <select value={values.trang_thai_thanh_toan} onChange={(e) => set("trang_thai_thanh_toan", e.target.value)} className={cls}>
                  {TT_THU.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Đã thu</label>
              {initial ? (
                <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  {(initial.so_tien_da_thu ?? 0).toLocaleString("en-US")}
                  <span className="ml-1 text-xs text-slate-400">— dùng nút &quot;Thu tiền&quot; ở danh sách để ghi nhận thêm</span>
                </p>
              ) : (
                <MoneyInput value={values.so_tien_da_thu} onChange={(v) => set("so_tien_da_thu", v)} className={cls} />
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Phương thức thu</label>
              {initial ? (
                <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{values.phuong_thuc_thu || "—"}</p>
              ) : (
                <select value={values.phuong_thuc_thu} onChange={(e) => set("phuong_thuc_thu", e.target.value)} className={cls}>
                  <option value="">-- Chọn --</option>
                  <option value="Tiền mặt">Tiền mặt</option>
                  <option value="Tài khoản công ty">Tài khoản công ty</option>
                </select>
              )}
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Ghi chú</label>
              <textarea rows={2} value={values.ghi_chu} onChange={(e) => set("ghi_chu", e.target.value)} className={cls} />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-2 text-sm">
            <ReviewRow label="Loại hóa đơn" value={loaiXuat} />
            <ReviewRow label="Khách hàng" value={values.khach_hang_id ? khOptionTen(values.khach_hang_id) : "—"} />
            <ReviewRow
              label="Đơn hàng liên quan"
              value={selectedDonHang.length > 0 ? donHangList.filter((d) => selectedDonHang.includes(d.id)).map((d) => d.so_don_hang).join(", ") : "—"}
            />
            <ReviewRow label="Số hóa đơn" value={values.so_hoa_don || "—"} />
            <ReviewRow label="Ngày xuất" value={values.ngay_xuat} />
            <ReviewRow label="Tổng tiền trước thuế" value={values.tong_tien_truoc_thue ? Number(values.tong_tien_truoc_thue).toLocaleString("en-US") : "—"} />
            <ReviewRow label="VAT %" value={values.vat_percent || "0"} />
            <ReviewRow label="Tiền chi hộ" value={values.tien_chi_ho ? Number(values.tien_chi_ho).toLocaleString("en-US") : "—"} />
            <ReviewRow label="Tổng cộng (có thuế + chi hộ)" value={tongTienCoThue.toLocaleString("en-US")} />
            <ReviewRow label="Trạng thái thanh toán" value={values.trang_thai_thanh_toan} />
            <ReviewRow label="Đã thu" value={values.so_tien_da_thu ? Number(values.so_tien_da_thu).toLocaleString("en-US") : (initial?.so_tien_da_thu ?? 0).toLocaleString("en-US")} />
            <ReviewRow label="Phương thức thu" value={values.phuong_thuc_thu || "—"} />
          </div>
        )}

        <div className="mt-6 flex gap-3">
          {step === 0 ? (
            <button type="button" onClick={huyForm} className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700">
              Hủy
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700"
            >
              Quay lại
            </button>
          )}
          {step < HOA_DON_STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(s + 1, HOA_DON_STEPS.length - 1))}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white"
            >
              Tiếp tục
            </button>
          ) : (
            <button type="submit" className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white">
              Lưu
            </button>
          )}
        </div>
      </form>
      {xacNhanDong && (
        <ConfirmDialog
          title="Đóng form?"
          message="Dữ liệu đã nhập sẽ không được lưu."
          confirmLabel="Đóng, không lưu"
          danger
          onCancel={() => setXacNhanDong(false)}
          onConfirm={() => {
            setXacNhanDong(false);
            onCancel();
          }}
        />
      )}
      {xacNhanChonDonDaCoHD && (
        <ConfirmDialog
          title="Đơn đã có hóa đơn"
          message={`Đơn này đã có hóa đơn: ${(donHangDaCoHoaDon.get(xacNhanChonDonDaCoHD) ?? []).join(", ")}. Chọn tiếp có thể gây xuất trùng — chỉ tiếp tục nếu chắc chắn đơn còn phần chưa lên hóa đơn.`}
          confirmLabel="Vẫn chọn đơn này"
          danger
          onCancel={() => setXacNhanChonDonDaCoHD(null)}
          onConfirm={() => {
            const id = xacNhanChonDonDaCoHD;
            setXacNhanChonDonDaCoHD(null);
            setSelectedDonHang((prev) => (prev.includes(id) ? prev : [...prev, id]));
          }}
        />
      )}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-slate-100 pb-2">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="font-medium text-slate-800">{value}</span>
    </div>
  );
}

/** Form tao hoa don Dieu chinh (chenh lech, co the am) hoac Thay the (tong day
 * du) cho 1 hoa don goc — goi RPC dieu_chinh_hoa_don_xuat/thay_the_hoa_don_xuat. */
function DieuChinhThayTheForm({
  mode,
  row,
  khachHangList,
  onCancel,
  onSave,
}: {
  mode: "dieu_chinh" | "thay_the";
  row: Row;
  khachHangList: KhachHang[];
  onCancel: () => void;
  onSave: (values: Record<string, string>, lyDo: string) => void;
}) {
  const [values, setValues] = useState({
    khach_hang_id: row.khach_hang_id,
    so_hoa_don: "",
    ngay_xuat: new Date().toISOString().slice(0, 10),
    tong_tien_truoc_thue: "",
    vat_percent: row.vat_percent?.toString() ?? "",
    tien_chi_ho: "",
    ky_ke_khai: "",
  });
  const [lyDo, setLyDo] = useState("");
  const [xacNhanDong, setXacNhanDong] = useState(false);
  const khOptions = khachHangList.map((k) => ({ value: k.id, label: khOptionLabel(k) }));
  const cls = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";

  function set(key: keyof typeof values, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function huyForm() {
    // P1 muc 5a/5e: hoi xac nhan bang ConfirmDialog (khong dung window.confirm,
    // xem giai thich o HoaDonForm) neu da nhap do.
    if (values.so_hoa_don.trim() || values.tong_tien_truoc_thue.trim() || lyDo.trim()) {
      setXacNhanDong(true);
      return;
    }
    onCancel();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onKeyDown={(e) => {
        // Xem giai thich o HoaDonForm (P1 muc 5a) — chan Escape o tang ngoai
        // cung, khong de lot xuong <form> co the vo tinh trigger submit.
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          huyForm();
        }
      }}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!lyDo.trim()) {
            window.alert("Phải nhập lý do.");
            return;
          }
          if (!values.so_hoa_don.trim() || !values.ngay_xuat || !values.tong_tien_truoc_thue.trim()) {
            window.alert("Phải nhập đủ Số hóa đơn, Ngày xuất và Tổng tiền.");
            return;
          }
          onSave(values, lyDo);
        }}
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-lg sm:rounded-2xl"
      >
        <h2 className="mb-1 text-lg font-semibold text-slate-900">
          {mode === "dieu_chinh" ? "Điều chỉnh hóa đơn" : "Thay thế hóa đơn"}
        </h2>
        <p className="mb-4 text-xs text-slate-500">
          Hóa đơn gốc: {row.so_hoa_don || "(chưa có số)"} · Tổng {row.tong_tien.toLocaleString("en-US")}
          {mode === "dieu_chinh"
            ? " — nhập số CHÊNH LỆCH so với hóa đơn gốc (có thể âm nếu điều chỉnh giảm)."
            : " — nhập TỔNG ĐẦY ĐỦ của hóa đơn thay thế (không phải chênh lệch)."}
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {mode === "thay_the" && (
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Khách hàng</label>
              <SearchableSelect options={khOptions} value={values.khach_hang_id} onChange={(v) => set("khach_hang_id", v)} />
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Số hóa đơn mới</label>
            <input required value={values.so_hoa_don} onChange={(e) => set("so_hoa_don", e.target.value)} className={cls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Ngày xuất</label>
            <input required type="date" value={values.ngay_xuat} onChange={(e) => set("ngay_xuat", e.target.value)} className={cls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {mode === "dieu_chinh" ? "Chênh lệch trước thuế" : "Tổng tiền trước thuế"}
            </label>
            <input
              required
              type="number"
              step="any"
              value={values.tong_tien_truoc_thue}
              onChange={(e) => set("tong_tien_truoc_thue", e.target.value)}
              className={cls}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">VAT %</label>
            <input type="number" step="any" value={values.vat_percent} onChange={(e) => set("vat_percent", e.target.value)} className={cls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{mode === "dieu_chinh" ? "Chênh lệch chi hộ" : "Tiền chi hộ"}</label>
            <input type="number" step="any" value={values.tien_chi_ho} onChange={(e) => set("tien_chi_ho", e.target.value)} className={cls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Kỳ kê khai VAT</label>
            <input
              value={values.ky_ke_khai}
              onChange={(e) => set("ky_ke_khai", e.target.value)}
              placeholder={values.ngay_xuat.slice(0, 7)}
              className={cls}
            />
          </div>
        </div>

        <div className="mt-3">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Lý do {mode === "dieu_chinh" ? "điều chỉnh" : "thay thế"} <span className="text-red-600">*</span>
          </label>
          <textarea required rows={2} value={lyDo} onChange={(e) => setLyDo(e.target.value)} className={cls} />
        </div>

        <div className="mt-6 flex gap-3">
          <button type="button" onClick={huyForm} className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700">
            Hủy
          </button>
          <button type="submit" className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white">
            Lưu
          </button>
        </div>
      </form>
      {xacNhanDong && (
        <ConfirmDialog
          title="Đóng form?"
          message="Dữ liệu đã nhập sẽ không được lưu."
          confirmLabel="Đóng, không lưu"
          danger
          onCancel={() => setXacNhanDong(false)}
          onConfirm={() => {
            setXacNhanDong(false);
            onCancel();
          }}
        />
      )}
    </div>
  );
}
