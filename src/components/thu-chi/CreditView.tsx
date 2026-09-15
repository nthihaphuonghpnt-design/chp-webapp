"use client";

import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface SoDu {
  id: string;
  doi_tuong: "Khách hàng" | "Nhà cung cấp";
  khach_hang_id: string | null;
  nha_cung_cap_id: string | null;
  so_du: number;
  updated_at: string;
}
interface GiaoDich {
  id: string;
  doi_tuong: "Khách hàng" | "Nhà cung cấp";
  khach_hang_id: string | null;
  nha_cung_cap_id: string | null;
  loai: "Phát sinh" | "Cấn trừ" | "Hoàn tiền";
  so_tien: number;
  so_du_sau: number;
  phuong_thuc: string;
  ly_do: string | null;
  created_at: string;
  nguoi_thuc_hien: { ho_ten: string } | { ho_ten: string }[] | null;
  hoa_don_xuat: { so_hoa_don: string | null } | { so_hoa_don: string | null }[] | null;
  hoa_don_dau_vao: { so_hoa_don: string | null } | { so_hoa_don: string | null }[] | null;
}
interface KhachHang {
  id: string;
  ten_day_du: string;
  ten_viet_tat: string | null;
}
interface NhaCungCap {
  id: string;
  ten: string | null;
}
interface HoaDonXuatMo {
  id: string;
  khach_hang_id: string;
  so_hoa_don: string | null;
  tong_tien: number;
  so_tien_da_thu: number | null;
}
interface HoaDonDauVaoMo {
  id: string;
  nha_cung_cap_id: string;
  so_hoa_don: string | null;
  tong_tien_thanh_toan: number;
  so_tien_da_thanh_toan: number | null;
}

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

const LOAI_COLOR: Record<string, string> = {
  "Phát sinh": "bg-blue-100 text-blue-700",
  "Cấn trừ": "bg-amber-100 text-amber-700",
  "Hoàn tiền": "bg-green-100 text-green-700",
};

export default function CreditView({
  soDuList,
  giaoDichList,
  khachHangList,
  ncList,
  hoaDonXuatMoList,
  hoaDonDauVaoMoList,
  phongBan,
}: {
  soDuList: SoDu[];
  giaoDichList: GiaoDich[];
  khachHangList: KhachHang[];
  ncList: NhaCungCap[];
  hoaDonXuatMoList: HoaDonXuatMo[];
  hoaDonDauVaoMoList: HoaDonDauVaoMo[];
  phongBan: string;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [tab, setTab] = useState<"Khách hàng" | "Nhà cung cấp">("Khách hàng");
  const [moRong, setMoRong] = useState<string | null>(null); // id cua doi tuong (khach_hang_id / nha_cung_cap_id) dang xem lich su
  const [dangXuLy, setDangXuLy] = useState(false);

  const khMap = useMemo(() => new Map(khachHangList.map((k) => [k.id, k.ten_viet_tat || k.ten_day_du])), [khachHangList]);
  const ncMap = useMemo(() => new Map(ncList.map((n) => [n.id, n.ten || "—"])), [ncList]);

  const canCanTruKhachHang = phongBan === "Chứng từ" || phongBan === "Kế toán";
  const canCanTruNcc = phongBan === "Kế toán";
  const canHoanTien = phongBan === "Kế toán" || phongBan === "Giám đốc";

  const dsHienTai = soDuList.filter((s) => s.doi_tuong === tab);

  function tenDoiTuong(s: SoDu) {
    return s.doi_tuong === "Khách hàng" ? (khMap.get(s.khach_hang_id!) ?? "—") : (ncMap.get(s.nha_cung_cap_id!) ?? "—");
  }

  async function handleCanTru(s: SoDu) {
    const dsHoaDon = s.doi_tuong === "Khách hàng" ? hoaDonXuatMoList.filter((h) => h.khach_hang_id === s.khach_hang_id) : hoaDonDauVaoMoList.filter((h) => h.nha_cung_cap_id === s.nha_cung_cap_id);
    if (dsHoaDon.length === 0) {
      window.alert("Không có hóa đơn nào đang mở (chưa thu/trả đủ) của đối tượng này để cấn trừ.");
      return;
    }
    const danhSachGoiY = dsHoaDon
      .map((h) => {
        const conLai = s.doi_tuong === "Khách hàng" ? (h as HoaDonXuatMo).tong_tien - ((h as HoaDonXuatMo).so_tien_da_thu ?? 0) : (h as HoaDonDauVaoMo).tong_tien_thanh_toan - ((h as HoaDonDauVaoMo).so_tien_da_thanh_toan ?? 0);
        return `${h.so_hoa_don ?? "(chưa có số)"} — còn ${conLai.toLocaleString("en-US")}`;
      })
      .join("\n");
    const soHoaDonGo = window.prompt(`Cấn trừ credit (còn ${s.so_du.toLocaleString("en-US")}) vào hóa đơn nào? Gõ đúng số hóa đơn:\n${danhSachGoiY}`);
    if (!soHoaDonGo) return;
    const hd = dsHoaDon.find((h) => h.so_hoa_don === soHoaDonGo.trim());
    if (!hd) {
      window.alert("Không tìm thấy hóa đơn khớp đúng số đã gõ.");
      return;
    }
    const conLai = s.doi_tuong === "Khách hàng" ? (hd as HoaDonXuatMo).tong_tien - ((hd as HoaDonXuatMo).so_tien_da_thu ?? 0) : (hd as HoaDonDauVaoMo).tong_tien_thanh_toan - ((hd as HoaDonDauVaoMo).so_tien_da_thanh_toan ?? 0);
    const soTienGo = window.prompt(`Số tiền cấn trừ (tối đa ${Math.min(s.so_du, conLai).toLocaleString("en-US")}):`, String(Math.min(s.so_du, conLai)));
    if (!soTienGo) return;
    const soTien = Number(soTienGo.replace(/[^\d.]/g, ""));
    if (!soTien || soTien <= 0) {
      window.alert("Số tiền không hợp lệ.");
      return;
    }
    const lyDo = window.prompt("Lý do cấn trừ (bắt buộc):");
    if (!lyDo || !lyDo.trim()) return;

    setDangXuLy(true);
    const { error } =
      s.doi_tuong === "Khách hàng"
        ? await supabase.rpc("can_tru_credit_hoa_don_xuat", { p_khach_hang_id: s.khach_hang_id, p_hoa_don_id: hd.id, p_so_tien: soTien, p_ly_do: lyDo.trim() })
        : await supabase.rpc("can_tru_credit_hoa_don_dau_vao", { p_nha_cung_cap_id: s.nha_cung_cap_id, p_hoa_don_id: hd.id, p_so_tien: soTien, p_ly_do: lyDo.trim() });
    setDangXuLy(false);
    if (error) {
      window.alert(error.message);
      return;
    }
    router.refresh();
  }

  async function handleHoanTien(s: SoDu) {
    const soTienGo = window.prompt(`Hoàn tiền — số dư hiện có ${s.so_du.toLocaleString("en-US")}. Nhập số tiền hoàn:`, String(s.so_du));
    if (!soTienGo) return;
    const soTien = Number(soTienGo.replace(/[^\d.]/g, ""));
    if (!soTien || soTien <= 0) {
      window.alert("Số tiền không hợp lệ.");
      return;
    }
    const phuongThuc = window.prompt('Phương thức hoàn — gõ đúng "Tiền mặt" hoặc "Tài khoản công ty":', "Tài khoản công ty");
    if (phuongThuc !== "Tiền mặt" && phuongThuc !== "Tài khoản công ty") {
      window.alert("Phương thức không hợp lệ.");
      return;
    }
    const lyDo = window.prompt("Lý do hoàn tiền (bắt buộc):");
    if (!lyDo || !lyDo.trim()) return;

    setDangXuLy(true);
    const { error } =
      s.doi_tuong === "Khách hàng"
        ? await supabase.rpc("hoan_tien_khach_hang", { p_khach_hang_id: s.khach_hang_id, p_so_tien: soTien, p_phuong_thuc: phuongThuc, p_ly_do: lyDo.trim() })
        : await supabase.rpc("hoan_tien_ncc", { p_nha_cung_cap_id: s.nha_cung_cap_id, p_so_tien: soTien, p_phuong_thuc: phuongThuc, p_ly_do: lyDo.trim() });
    setDangXuLy(false);
    if (error) {
      window.alert(error.message);
      return;
    }
    router.refresh();
  }

  function lichSuCua(s: SoDu) {
    return giaoDichList.filter((g) => (s.doi_tuong === "Khách hàng" ? g.khach_hang_id === s.khach_hang_id : g.nha_cung_cap_id === s.nha_cung_cap_id));
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="mb-1 text-xl font-semibold text-slate-900">Credit khách hàng / nhà cung cấp</h1>
      <p className="mb-4 text-xs text-slate-500">
        Khoản tiền thừa khi thu/trả vượt số còn phải thu/trả trên hóa đơn — tự động phát sinh qua nút &quot;Thu tiền&quot; (Hóa đơn xuất) hoặc khi thanh toán
        hóa đơn đầu vào. Có thể dùng để cấn trừ vào hóa đơn khác, hoặc hoàn tiền thật.
      </p>

      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setTab("Khách hàng")}
          className={`rounded-lg px-3 py-2 text-sm font-medium ${tab === "Khách hàng" ? "bg-blue-600 text-white" : "border border-slate-300 bg-white text-slate-700"}`}
        >
          Khách hàng
        </button>
        <button
          onClick={() => setTab("Nhà cung cấp")}
          className={`rounded-lg px-3 py-2 text-sm font-medium ${tab === "Nhà cung cấp" ? "bg-blue-600 text-white" : "border border-slate-300 bg-white text-slate-700"}`}
        >
          Nhà cung cấp
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">{tab}</th>
              <th className="px-3 py-2 text-right font-medium">Số dư credit</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {dsHienTai.map((s) => {
              const idDoiTuong = s.doi_tuong === "Khách hàng" ? s.khach_hang_id! : s.nha_cung_cap_id!;
              const canCanTru = s.doi_tuong === "Khách hàng" ? canCanTruKhachHang : canCanTruNcc;
              return (
                <Fragment key={s.id}>
                  <tr className="border-t border-slate-100">
                    <td className="px-3 py-2 font-medium text-slate-900">{tenDoiTuong(s)}</td>
                    <td className="px-3 py-2 text-right font-medium text-blue-700">{s.so_du.toLocaleString("en-US")}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button onClick={() => setMoRong((prev) => (prev === idDoiTuong ? null : idDoiTuong))} className="text-xs font-medium text-slate-600">
                          {moRong === idDoiTuong ? "Ẩn lịch sử" : "Xem lịch sử"}
                        </button>
                        {canCanTru && (
                          <button onClick={() => handleCanTru(s)} disabled={dangXuLy} className="text-xs font-medium text-amber-600 disabled:opacity-50">
                            Cấn trừ vào hóa đơn
                          </button>
                        )}
                        {canHoanTien && (
                          <button onClick={() => handleHoanTien(s)} disabled={dangXuLy} className="text-xs font-medium text-green-700 disabled:opacity-50">
                            Hoàn tiền
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {moRong === idDoiTuong && (
                    <tr className="border-t border-slate-100 bg-slate-50">
                      <td colSpan={3} className="px-3 py-3">
                        <table className="w-full text-xs">
                          <thead className="text-left text-slate-500">
                            <tr>
                              <th className="px-2 py-1 font-medium">Thời gian</th>
                              <th className="px-2 py-1 font-medium">Loại</th>
                              <th className="px-2 py-1 text-right font-medium">Số tiền</th>
                              <th className="px-2 py-1 text-right font-medium">Số dư sau</th>
                              <th className="px-2 py-1 font-medium">Hóa đơn</th>
                              <th className="px-2 py-1 font-medium">Lý do</th>
                              <th className="px-2 py-1 font-medium">Người thực hiện</th>
                            </tr>
                          </thead>
                          <tbody>
                            {lichSuCua(s).map((g) => {
                              const nv = one(g.nguoi_thuc_hien);
                              const hdx = one(g.hoa_don_xuat);
                              const hddv = one(g.hoa_don_dau_vao);
                              return (
                                <tr key={g.id} className="border-t border-slate-200">
                                  <td className="px-2 py-1">{new Date(g.created_at).toLocaleString("vi-VN")}</td>
                                  <td className="px-2 py-1">
                                    <span className={`rounded-full px-1.5 py-0.5 font-medium ${LOAI_COLOR[g.loai]}`}>{g.loai}</span>
                                  </td>
                                  <td className="px-2 py-1 text-right">{g.so_tien.toLocaleString("en-US")}</td>
                                  <td className="px-2 py-1 text-right">{g.so_du_sau.toLocaleString("en-US")}</td>
                                  <td className="px-2 py-1">{hdx?.so_hoa_don || hddv?.so_hoa_don || "—"}</td>
                                  <td className="px-2 py-1">{g.ly_do || "—"}</td>
                                  <td className="px-2 py-1">{nv?.ho_ten || "—"}</td>
                                </tr>
                              );
                            })}
                            {lichSuCua(s).length === 0 && (
                              <tr>
                                <td colSpan={7} className="px-2 py-2 text-center text-slate-400">
                                  Chưa có giao dịch nào.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {dsHienTai.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                  Không có {tab.toLowerCase()} nào đang có credit.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
