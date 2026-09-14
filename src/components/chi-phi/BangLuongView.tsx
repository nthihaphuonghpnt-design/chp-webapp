"use client";

import { useMemo, useState } from "react";
import { xuatExcelKeO, type ExcelColumn } from "@/lib/excel";
import { TK, GHI_CHU_DINH_KHOAN_GOI_Y } from "@/lib/dinhKhoan";
import {
  HOA_HONG_SALE,
  giamTruGiaCanh,
  tinhThueTNCN,
  tinhBhxhChiTiet,
  dungLuatThueMoi,
  apDungTruLuongTheoChamCong,
  tinhLuongCoBanTheoChamCong,
  THANG_BAT_DAU_TRU_LUONG_THEO_CHAM_CONG,
} from "@/lib/luong";
import { createClient } from "@/lib/supabase/client";
import { laNhanVienVanPhong } from "@/lib/chamCong";
import MoneyInput from "@/components/common/MoneyInput";

interface PhongBan {
  ten: string;
}
interface NhanVien {
  id: string;
  ho_ten: string;
  luong_co_dinh: number | null;
  muc_dong_bhxh: number | null;
  so_nguoi_phu_thuoc: number | null;
  loai_nhan_su: string;
  ngay_vao_lam: string | null;
  phong_ban: PhongBan | PhongBan[] | null;
}
interface ChamCongRow {
  nhan_vien_id: string;
  ngay: string;
  trang_thai: string;
}
interface ChiPhiGiaoNhan {
  nhan_vien_id: string | null;
  thanh_tien: number | null;
  created_at: string;
}
interface DonHang {
  id: string;
  ngay_len_don: string;
  sale_phu_trach_id: string | null;
}
interface ChiPhi {
  don_hang_id: string;
  so_tien_da_chi: number | null;
  gia_ban_sell: number | null;
  noi_bo: boolean;
  trang_thai: string;
}
interface PhuThu {
  don_hang_id: string;
  thanh_tien: number | null;
}
interface ThueNgoai {
  don_hang_id: string;
  so_tien_da_chi: number | null;
  gia_ban_sell: number | null;
}
interface DinhPhi {
  thang_nam: string;
  so_tien: number | null;
}
interface LuongDaTra {
  id: string;
  nhan_vien_id: string;
  thang_luong: string;
  so_tien: number;
  phuong_thuc: "Tiền mặt" | "Tài khoản công ty";
  ngay_tra: string;
}

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? v[0] ?? null : v;
}
function fmt(n: number) {
  return Math.round(n).toLocaleString("en-US");
}

function thangTruoc(thang: string) {
  const [y, m] = thang.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 2, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function ngayTraLuong(thang: string) {
  const [y, m] = thang.split("-").map(Number);
  const d = new Date(y, m - 1, 10);
  const dow = d.getDay();
  if (dow === 6) d.setDate(9);
  if (dow === 0) d.setDate(8);
  return d;
}


function monthRange() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function BangLuongView({
  nhanVienList,
  chiPhiGiaoNhanList,
  donHangList,
  chiPhiList,
  phuThuList,
  thueNgoaiList,
  dinhPhiList,
  luongDaTraList,
  chamCongList = [],
  ngayLeList = [],
}: {
  nhanVienList: NhanVien[];
  chiPhiGiaoNhanList: ChiPhiGiaoNhan[];
  donHangList: DonHang[];
  chiPhiList: ChiPhi[];
  phuThuList: PhuThu[];
  thueNgoaiList: ThueNgoai[];
  dinhPhiList: DinhPhi[];
  luongDaTraList: LuongDaTra[];
  chamCongList?: ChamCongRow[];
  ngayLeList?: string[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [thangLuong, setThangLuong] = useState(monthRange());
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [daTraList, setDaTraList] = useState<LuongDaTra[]>(luongDaTraList);
  const [traForm, setTraForm] = useState<{ nhanVienId: string; soTien: string } | null>(null);
  const [traPhuongThuc, setTraPhuongThuc] = useState<"Tiền mặt" | "Tài khoản công ty">("Tài khoản công ty");
  const [traNgay, setTraNgay] = useState(new Date().toISOString().slice(0, 10));
  const [dangTra, setDangTra] = useState(false);

  const thangHoatDong = thangTruoc(thangLuong);
  const payday = ngayTraLuong(thangLuong);

  // --- Dinh phi phan bo theo thang (dung toan bo du lieu) ---
  const dinhPhiTheoThang = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of dinhPhiList) map.set(d.thang_nam, (map.get(d.thang_nam) ?? 0) + (d.so_tien ?? 0));
    return map;
  }, [dinhPhiList]);
  const soLoTheoThang = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of donHangList) {
      const key = d.ngay_len_don.slice(0, 7);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [donHangList]);

  function loiNhuanTruocHoaHongCuaDon(donHangId: string, thangKey: string) {
    const cp = chiPhiList.filter((c) => c.don_hang_id === donHangId && c.trang_thai !== "Từ chối");
    const buy = cp.filter((c) => c.noi_bo).reduce((s, c) => s + (c.so_tien_da_chi ?? 0), 0);
    const sell =
      cp.reduce((s, c) => s + (c.gia_ban_sell ?? 0), 0) +
      phuThuList.filter((p) => p.don_hang_id === donHangId).reduce((s, p) => s + (p.thanh_tien ?? 0), 0) +
      thueNgoaiList.filter((t) => t.don_hang_id === donHangId).reduce((s, t) => s + (t.gia_ban_sell ?? 0), 0);
    const thueNgoaiBuy = thueNgoaiList.filter((t) => t.don_hang_id === donHangId).reduce((s, t) => s + (t.so_tien_da_chi ?? 0), 0);
    const tongDinhPhi = dinhPhiTheoThang.get(thangKey) ?? 0;
    const soLo = soLoTheoThang.get(thangKey) ?? 0;
    const dinhPhi = soLo > 0 ? tongDinhPhi / soLo : 0;
    return sell - buy - thueNgoaiBuy - dinhPhi;
  }

  const ngayLeSet = useMemo(() => new Set(ngayLeList), [ngayLeList]);
  const apDungChamCong = apDungTruLuongTheoChamCong(thangHoatDong);

  const bangLuong = useMemo(() => {
    return nhanVienList.map((nv) => {
      const pb = one(nv.phong_ban)?.ten ?? "";
      const luongCoDinhGoc = nv.luong_co_dinh ?? 0;
      const luongCoDinh = apDungChamCong && laNhanVienVanPhong(pb)
        ? tinhLuongCoBanTheoChamCong({
            loaiNhanSu: nv.loai_nhan_su,
            luongCoDinh: luongCoDinhGoc,
            ngayVaoLam: nv.ngay_vao_lam,
            thangHoatDong,
            chamCongCaNamList: chamCongList.filter((c) => c.nhan_vien_id === nv.id),
            ngayLeSet,
          })
        : luongCoDinhGoc;

      let luongTheoLo = 0;
      if (pb === "Sale") {
        const donCuaSaleThangTruoc = donHangList.filter(
          (d) => d.sale_phu_trach_id === nv.id && d.ngay_len_don.slice(0, 7) === thangHoatDong
        );
        luongTheoLo = Math.max(
          0,
          donCuaSaleThangTruoc.reduce((s, d) => s + loiNhuanTruocHoaHongCuaDon(d.id, thangHoatDong) * HOA_HONG_SALE, 0)
        );
      } else {
        luongTheoLo = chiPhiGiaoNhanList
          .filter((c) => c.nhan_vien_id === nv.id && c.created_at.slice(0, 7) === thangHoatDong)
          .reduce((s, c) => s + (c.thanh_tien ?? 0), 0);
      }

      const tongThuNhap = luongCoDinh + luongTheoLo;
      const mucDongBhxh = nv.muc_dong_bhxh ?? luongCoDinh;
      const chiTietBhxh = tinhBhxhChiTiet(mucDongBhxh);
      const bhxhNv = chiTietBhxh.nvTong;
      const bhxhCt = chiTietBhxh.ctTong;
      const giamTru = giamTruGiaCanh(thangLuong, nv.so_nguoi_phu_thuoc ?? 0);
      const thuNhapChiuThue = Math.max(0, tongThuNhap - bhxhNv - giamTru);
      const thueTncn = tinhThueTNCN(thuNhapChiuThue, thangLuong);
      const thucLanh = tongThuNhap - bhxhNv - thueTncn;

      return { nv, phongBan: pb, luongCoDinh, luongCoDinhGoc, luongTheoLo, tongThuNhap, mucDongBhxh, chiTietBhxh, bhxhNv, bhxhCt, giamTru, thueTncn, thucLanh };
    });
  }, [nhanVienList, chiPhiGiaoNhanList, donHangList, thangHoatDong, thangLuong, chamCongList, ngayLeSet, apDungChamCong]); // eslint-disable-line react-hooks/exhaustive-deps

  const tongLuong = bangLuong.reduce((s, r) => s + r.tongThuNhap, 0);
  const tongBhxhCt = bangLuong.reduce((s, r) => s + r.bhxhCt, 0);
  const tongKpcd = bangLuong.reduce((s, r) => s + r.chiTietBhxh.ctKpcd, 0);
  const tongChiPhiNhanSu = tongLuong + tongBhxhCt + tongKpcd;

  function daTraCuaThang(nhanVienId: string) {
    return daTraList.find((d) => d.nhan_vien_id === nhanVienId && d.thang_luong === thangLuong) ?? null;
  }

  function moFormTra(nhanVienId: string, thucLanh: number) {
    setTraForm({ nhanVienId, soTien: Math.round(thucLanh).toString() });
    setTraPhuongThuc("Tài khoản công ty");
    setTraNgay(new Date().toISOString().slice(0, 10));
  }

  async function xacNhanTra() {
    if (!traForm) return;
    setDangTra(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: nv } = await supabase.from("nhan_vien").select("id").eq("auth_user_id", user?.id).single();

    const { data, error } = await supabase
      .from("luong_da_tra")
      .upsert(
        {
          nhan_vien_id: traForm.nhanVienId,
          thang_luong: thangLuong,
          so_tien: Number(traForm.soTien),
          phuong_thuc: traPhuongThuc,
          ngay_tra: traNgay,
          nguoi_tra_id: nv?.id,
        },
        { onConflict: "nhan_vien_id,thang_luong" }
      )
      .select()
      .single();
    setDangTra(false);
    if (error) {
      window.alert(error.message);
      return;
    }
    setDaTraList((prev) => [...prev.filter((d) => d.id !== data.id), data as LuongDaTra]);
    setTraForm(null);
  }

  async function themVaoDinhPhi() {
    setSaving(true);
    setSavedMsg(null);
    const { error } = await supabase.from("hoa_don_dau_vao").insert({
      thang_phan_bo: thangLuong,
      khoan_muc: `Lương + BHXH công ty tháng ${thangLuong}`,
      loai_chi_phi: "Định phí cố định",
      ngay_hoa_don: new Date().toISOString().slice(0, 10),
      tong_tien_hang: Math.round(tongChiPhiNhanSu),
    });
    setSaving(false);
    setSavedMsg(error ? `Lỗi: ${error.message}` : "Đã thêm vào Hóa đơn đầu vào (định phí cố định).");
  }

  async function handleExportExcel() {
    const columns: ExcelColumn[] = [
      { header: "Họ tên", key: "hoTen", width: 20 },
      { header: "Phòng ban", key: "phongBan", width: 14 },
      { header: "Lương cố định", key: "luongCoDinh", width: 14 },
      { header: "Lương theo lô (tháng trước)", key: "luongTheoLo", width: 18 },
      { header: `Tổng thu nhập (Nợ ${TK.CHI_PHI_QUAN_LY_KINH_DOANH} / Có ${TK.PHAI_TRA_NGUOI_LAO_DONG})`, key: "tongThuNhap", width: 26 },
      { header: "Mức đóng BHXH", key: "mucDongBhxh", width: 14 },
      { header: `BHXH — NV đóng (Nợ ${TK.PHAI_TRA_NGUOI_LAO_DONG} / Có ${TK.BHXH_PHAI_NOP_CHI_TIET})`, key: "nvBhxh", width: 26 },
      { header: `BHYT — NV đóng (Nợ ${TK.PHAI_TRA_NGUOI_LAO_DONG} / Có ${TK.BHYT_PHAI_NOP_CHI_TIET})`, key: "nvBhyt", width: 26 },
      { header: `BHTN — NV đóng (Nợ ${TK.PHAI_TRA_NGUOI_LAO_DONG} / Có ${TK.BHTN_PHAI_NOP_CHI_TIET})`, key: "nvBhtn", width: 26 },
      { header: "Tổng BHXH/BHYT/BHTN — NV đóng", key: "bhxhNv", width: 22 },
      { header: `BHXH — Cty đóng (Nợ ${TK.CHI_PHI_QUAN_LY_KINH_DOANH} / Có ${TK.BHXH_PHAI_NOP_CHI_TIET})`, key: "ctBhxh", width: 26 },
      { header: `BHYT — Cty đóng (Nợ ${TK.CHI_PHI_QUAN_LY_KINH_DOANH} / Có ${TK.BHYT_PHAI_NOP_CHI_TIET})`, key: "ctBhyt", width: 26 },
      { header: `BHTN — Cty đóng (Nợ ${TK.CHI_PHI_QUAN_LY_KINH_DOANH} / Có ${TK.BHTN_PHAI_NOP_CHI_TIET})`, key: "ctBhtn", width: 26 },
      { header: "Tổng BHXH/BHYT/BHTN — Cty đóng", key: "bhxhCt", width: 22 },
      { header: `KPCĐ 2% — Cty đóng (Nợ ${TK.CHI_PHI_QUAN_LY_KINH_DOANH} / Có ${TK.KPCD_PHAI_NOP})`, key: "kpcd", width: 26 },
      { header: "Số người phụ thuộc", key: "soNguoiPhuThuoc", width: 14 },
      { header: "Giảm trừ gia cảnh", key: "giamTru", width: 16 },
      { header: `Thuế TNCN (Nợ ${TK.PHAI_TRA_NGUOI_LAO_DONG} / Có ${TK.THUE_TNCN_PHAI_NOP})`, key: "thueTncn", width: 26 },
      { header: `Thực lãnh (Nợ ${TK.PHAI_TRA_NGUOI_LAO_DONG} / Có 111,112 — xem TK đối ứng thật ở Sổ quỹ)`, key: "thucLanh", width: 34 },
    ];
    const rows = bangLuong.map((r) => [
      r.nv.ho_ten,
      r.phongBan,
      r.luongCoDinh,
      r.luongTheoLo,
      r.tongThuNhap,
      r.mucDongBhxh,
      r.chiTietBhxh.nvBhxh,
      r.chiTietBhxh.nvBhyt,
      r.chiTietBhxh.nvBhtn,
      r.bhxhNv,
      r.chiTietBhxh.ctBhxh,
      r.chiTietBhxh.ctBhyt,
      r.chiTietBhxh.ctBhtn,
      r.bhxhCt,
      r.chiTietBhxh.ctKpcd,
      r.nv.so_nguoi_phu_thuoc ?? 0,
      r.giamTru,
      r.thueTncn,
      r.thucLanh,
    ]);
    await xuatExcelKeO(`bang-luong-${thangLuong}.xlsx`, {
      sheetName: "Bảng lương",
      headerLines: [`BẢNG LƯƠNG — Tháng ${thangLuong}`, { text: GHI_CHU_DINH_KHOAN_GOI_Y, italic: true, size: 9 }],
      columns,
      rows,
    });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Bảng lương</h1>
        <button onClick={handleExportExcel} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm">
          Xuất Excel
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs text-slate-500">Tháng lương</label>
          <input
            type="month"
            value={thangLuong}
            onChange={(e) => setThangLuong(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">
          Ngày trả lương: <strong>{payday.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })}</strong>
          <span className="ml-1 text-xs text-blue-600">(ngày 10, lùi về thứ 6 nếu rơi vào T7/CN)</span>
        </div>
      </div>

      <p className="mb-1 text-xs text-slate-400">
        Lương theo lô lấy từ hoạt động tháng {thangHoatDong} (chậm 1 tháng so với lương tháng {thangLuong}) — gồm Chi
        phí giao nhận (Hiện trường/Chứng từ/Kế toán) và hoa hồng lợi nhuận (Sale, 4/10).
      </p>
      <p className="mb-1 text-xs text-slate-400">
        Thuế TNCN tháng {thangLuong} tính theo{" "}
        {dungLuatThueMoi(thangLuong)
          ? "Luật Thuế TNCN mới (109/2025/QH15, 5 bậc, giảm trừ bản thân 15,5tr + 6,2tr/người phụ thuộc)"
          : "biểu thuế cũ (7 bậc, giảm trừ bản thân 11tr + 4,4tr/người phụ thuộc)"}
        .
      </p>
      <p className="mb-4 text-xs text-slate-400">
        {apDungChamCong
          ? `Lương cố định tháng ${thangHoatDong} đã được tính lại theo dữ liệu Chấm công (ngày Đi làm + Nghỉ lễ + Nghỉ phép trong hạn mức / ngày công chuẩn; Nghỉ không phép và Thiếu chấm công không được trả lương). Nhân viên Outsource tính theo đơn giá/ngày × số ngày Đi làm thực tế. Riêng Hiện trường/Sale không chấm công nên vẫn tính lương cố định nguyên tháng như cũ.`
          : `Lương cố định tháng ${thangHoatDong} đang tính nguyên tháng (chưa trừ theo Chấm công) — việc trừ theo ngày công chỉ áp dụng từ tháng ${THANG_BAT_DAU_TRU_LUONG_THEO_CHAM_CONG} trở đi (riêng Hiện trường/Sale không chấm công nên luôn tính nguyên tháng).`}
      </p>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              {["Họ tên", "Phòng ban", "Lương cố định", "Lương theo lô", "Tổng thu nhập", "BHXH (NV đóng)", "BHXH (Cty đóng)", "Thuế TNCN", "Thực lãnh", "Trạng thái"].map((h) => (
                <th key={h} className="px-3 py-2 font-medium whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bangLuong.map((r) => (
              <tr key={r.nv.id} className="border-t border-slate-100">
                <td className="px-3 py-2 font-medium text-slate-900">{r.nv.ho_ten}</td>
                <td className="px-3 py-2">{r.phongBan}</td>
                <td className="px-3 py-2">
                  {fmt(r.luongCoDinh)}
                  {apDungChamCong && Math.round(r.luongCoDinh) !== Math.round(r.luongCoDinhGoc) && (
                    <span className="ml-1 text-xs text-slate-400" title="Đã trừ theo dữ liệu Chấm công">
                      (gốc {fmt(r.luongCoDinhGoc)})
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">{fmt(r.luongTheoLo)}</td>
                <td className="px-3 py-2">{fmt(r.tongThuNhap)}</td>
                <td className="px-3 py-2">{fmt(r.bhxhNv)}</td>
                <td className="px-3 py-2">{fmt(r.bhxhCt)}</td>
                <td className="px-3 py-2">{fmt(r.thueTncn)}</td>
                <td className="px-3 py-2 font-semibold text-slate-900">{fmt(r.thucLanh)}</td>
                <td className="px-3 py-2">
                  {daTraCuaThang(r.nv.id) ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      Đã trả · {daTraCuaThang(r.nv.id)!.phuong_thuc} · {daTraCuaThang(r.nv.id)!.ngay_tra}
                    </span>
                  ) : (
                    <button
                      onClick={() => moFormTra(r.nv.id, r.thucLanh)}
                      className="rounded-lg border border-blue-300 px-2 py-1 text-xs font-medium text-blue-700"
                    >
                      Đánh dấu đã trả
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {bangLuong.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-slate-400">
                  Chưa có nhân viên nào.
                </td>
              </tr>
            )}
          </tbody>
          {bangLuong.length > 0 && (
            <tfoot>
              <tr className="border-t border-slate-200 bg-slate-50 font-semibold">
                <td className="px-3 py-2" colSpan={4}>
                  TỔNG
                </td>
                <td className="px-3 py-2">{fmt(tongLuong)}</td>
                <td className="px-3 py-2" colSpan={2}>
                  BHXH công ty đóng: {fmt(tongBhxhCt)} · KPCĐ: {fmt(tongKpcd)}
                </td>
                <td className="px-3 py-2" colSpan={3}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
        <p className="mb-2 text-sm text-slate-700">
          Tổng chi phí nhân sự tháng {thangLuong} (lương + BHXH/BHYT/BHTN công ty đóng + KPCĐ 2%): <strong>{fmt(tongChiPhiNhanSu)}</strong>
        </p>
        <button
          onClick={themVaoDinhPhi}
          disabled={saving}
          className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {saving ? "Đang thêm..." : `Thêm vào Hóa đơn đầu vào (${thangLuong})`}
        </button>
        {savedMsg && <p className="mt-2 text-xs text-slate-500">{savedMsg}</p>}
      </div>

      <p className="mt-3 text-xs text-slate-400">
        * Số liệu tham khảo: thuế TNCN tính theo biểu lũy tiến từng phần hiện hành, giảm trừ bản thân
        11.000.000đ (chưa tính người phụ thuộc). BHXH/BHYT/BHTN trên Mức đóng BHXH: nhân viên đóng 8% + 1,5% + 1% = 10,5%,
        công ty đóng 17,5% + 3% + 1% = 21,5%. KPCĐ (kinh phí công đoàn) 2% trên Mức đóng BHXH, công ty đóng 100% — bắt buộc với
        mọi doanh nghiệp có lao động đóng BHXH bắt buộc kể từ 16/5/2026 theo Nghị định 105/2026/NĐ-CP, kể cả khi công ty
        chưa có tổ chức công đoàn cơ sở (nộp cho Liên đoàn Lao động). Kiểm tra lại trước khi trả lương chính thức.
      </p>
      <p className="mt-1 text-xs text-slate-400">
        * Định khoản gợi ý (xem chi tiết từng khoản trong file Xuất Excel): Tổng thu nhập → Nợ {TK.CHI_PHI_QUAN_LY_KINH_DOANH}/Có {TK.PHAI_TRA_NGUOI_LAO_DONG};
        BHXH/BHYT/BHTN NV đóng (khấu trừ lương) → Nợ {TK.PHAI_TRA_NGUOI_LAO_DONG}/Có {TK.BHXH_PHAI_NOP_CHI_TIET}/{TK.BHYT_PHAI_NOP_CHI_TIET}/{TK.BHTN_PHAI_NOP_CHI_TIET};
        BHXH/BHYT/BHTN Cty đóng → Nợ {TK.CHI_PHI_QUAN_LY_KINH_DOANH}/Có {TK.BHXH_PHAI_NOP_CHI_TIET}/{TK.BHYT_PHAI_NOP_CHI_TIET}/{TK.BHTN_PHAI_NOP_CHI_TIET};
        KPCĐ 2% Cty đóng → Nợ {TK.CHI_PHI_QUAN_LY_KINH_DOANH}/Có {TK.KPCD_PHAI_NOP};
        Thuế TNCN khấu trừ → Nợ {TK.PHAI_TRA_NGUOI_LAO_DONG}/Có {TK.THUE_TNCN_PHAI_NOP}; khi trả lương thực tế → Nợ {TK.PHAI_TRA_NGUOI_LAO_DONG}/Có 111,112
        (đã có sẵn ở Sổ quỹ khi đánh dấu &quot;Đã trả&quot;).
      </p>

      {traForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
          <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-sm sm:rounded-2xl">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Xác nhận đã trả lương</h2>
            <div className="flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Số tiền đã trả</label>
                <MoneyInput
                  value={traForm.soTien}
                  onChange={(v) => setTraForm((prev) => (prev ? { ...prev, soTien: v } : prev))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Phương thức</label>
                <select
                  value={traPhuongThuc}
                  onChange={(e) => setTraPhuongThuc(e.target.value as "Tiền mặt" | "Tài khoản công ty")}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="Tài khoản công ty">Tài khoản công ty</option>
                  <option value="Tiền mặt">Tiền mặt</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Ngày trả</label>
                <input
                  type="date"
                  value={traNgay}
                  onChange={(e) => setTraNgay(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setTraForm(null)}
                className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={dangTra}
                onClick={xacNhanTra}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
              >
                {dangTra ? "Đang lưu..." : "Xác nhận đã trả"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
