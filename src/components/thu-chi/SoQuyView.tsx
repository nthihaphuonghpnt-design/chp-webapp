"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { xuatExcelKeO, type ExcelColumn } from "@/lib/excel";
import { TK, tkTheoPhuongThuc, GHI_CHU_DINH_KHOAN_GOI_Y } from "@/lib/dinhKhoan";
import { createClient } from "@/lib/supabase/client";
import { khoangThangVietNam } from "@/lib/ngayVietNam";
import MoneyInput from "@/components/common/MoneyInput";
import DoiChieuSaoKeView from "@/components/thu-chi/DoiChieuSaoKeView";
import type { SoQuy } from "@/types/database";

const NGUON_HREF: Record<string, string> = {
  tam_ung_giai_chi: "/tam-ung-giai-chi",
  phat_sinh_chi_phi: "/don-hang",
  don_thue_ngoai: "/don-hang",
  hoa_don_xuat: "/khach-hang/hoa-don",
  hoa_don_dau_vao: "/chi-phi/hoa-don-dau-vao",
  luong_da_tra: "/chi-phi/bang-luong",
  phieu_quyet_toan_tam_ung: "/tam-ung-giai-chi/quyet-toan",
};

// TK doi ung goi y theo nguon phat sinh — CHI la goi y de doi chieu voi
// phan mem ke toan, khong phai but toan chinh thuc (xem GHI_CHU_DINH_KHOAN_GOI_Y).
// loaiSoHienTai: can rieng cho dieu_chuyen_quy vi ca 2 ben deu la TK tien
// (111/112) — TK doi ung la TK tien CON LAI, khong phai 1 loai co dinh.
function tkDoiUngGoiY(nguonBang: string, loaiSoHienTai: "Tiền mặt" | "Tài khoản công ty", tkNoRieng?: string): string {
  if (nguonBang === "hoa_don_xuat") return TK.PHAI_THU_KHACH_HANG; // Thu: Co 131
  if (nguonBang === "tam_ung_giai_chi") return TK.TAM_UNG; // Chi: No 141
  if (nguonBang === "phieu_quyet_toan_tam_ung") return TK.TAM_UNG; // Tat toan so du TK 141 cua dot tam ung
  if (nguonBang === "luong_da_tra") return TK.PHAI_TRA_NGUOI_LAO_DONG; // Chi: No 334
  if (nguonBang === "dieu_chuyen_quy_no" || nguonBang === "dieu_chuyen_quy_co")
    return loaiSoHienTai === "Tiền mặt" ? TK.NGAN_HANG : TK.TIEN_MAT;
  if (nguonBang === "hoa_don_dau_vao" && tkNoRieng) return tkNoRieng; // Chi: No theo TK da nhap
  if (nguonBang === "phat_sinh_chi_phi" || nguonBang === "don_thue_ngoai" || nguonBang === "hoa_don_dau_vao") return TK.PHAI_TRA_NGUOI_BAN; // Chi: No 331
  return "—";
}

function fmt(n: number) {
  return Math.round(n).toLocaleString("en-US");
}

function monthRange() {
  return khoangThangVietNam();
}

const NGUON_LABEL: Record<string, string> = {
  phat_sinh_chi_phi: "Thanh toán chi phí",
  don_thue_ngoai: "Thanh toán thuê ngoài",
  hoa_don_xuat: "Thu tiền hóa đơn",
  tam_ung_giai_chi: "Tạm ứng/Giải chi",
  hoa_don_dau_vao: "Hóa đơn đầu vào",
  luong_da_tra: "Trả lương",
  dieu_chuyen_quy_no: "Chuyển quỹ nội bộ",
  dieu_chuyen_quy_co: "Chuyển quỹ nội bộ",
  phieu_quyet_toan_tam_ung: "Quyết toán tạm ứng",
};

export default function SoQuyView({
  initialRows,
  tamUngDetailMap = {},
  donHangMap = {},
  tkNoMap = {},
  canEdit = false,
}: {
  initialRows: SoQuy[];
  tamUngDetailMap?: Record<string, string>;
  donHangMap?: Record<string, { id: string; so_don_hang: string }>;
  tkNoMap?: Record<string, string>;
  canEdit?: boolean;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const defaultRange = monthRange();
  const [loaiSo, setLoaiSo] = useState<"Tiền mặt" | "Tài khoản công ty">("Tiền mặt");
  const [tuNgay, setTuNgay] = useState(defaultRange.start);
  const [denNgay, setDenNgay] = useState(defaultRange.end);
  const [showChuyenQuy, setShowChuyenQuy] = useState(false);
  const [showDoiChieu, setShowDoiChieu] = useState(false);
  const [chieuChuyen, setChieuChuyen] = useState<"Ngân hàng → Tiền mặt" | "Tiền mặt → Ngân hàng">("Ngân hàng → Tiền mặt");
  const [soTienChuyen, setSoTienChuyen] = useState("");
  const [ghiChuChuyen, setGhiChuChuyen] = useState("");
  const [savingChuyen, setSavingChuyen] = useState(false);
  const [loiChuyen, setLoiChuyen] = useState<string | null>(null);

  async function handleChuyenQuy() {
    if (!soTienChuyen || Number(soTienChuyen) <= 0) {
      setLoiChuyen("Nhập số tiền hợp lệ.");
      return;
    }
    setSavingChuyen(true);
    setLoiChuyen(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: nv } = await supabase.from("nhan_vien").select("id").eq("auth_user_id", user?.id).single();
    const { error } = await supabase.from("dieu_chuyen_quy").insert({
      chieu: chieuChuyen,
      so_tien: Number(soTienChuyen),
      ghi_chu: ghiChuChuyen || null,
      nguoi_thuc_hien_id: nv?.id,
    });
    setSavingChuyen(false);
    if (error) {
      setLoiChuyen(error.message);
      return;
    }
    setShowChuyenQuy(false);
    setSoTienChuyen("");
    setGhiChuChuyen("");
    router.refresh();
  }

  const rowsCuaSo = initialRows.filter((r) => r.loai_so === loaiSo);

  const tonDauKy = useMemo(() => {
    return rowsCuaSo
      .filter((r) => r.ngay < tuNgay)
      .reduce((s, r) => s + (r.loai_giao_dich === "Thu" ? r.so_tien : -r.so_tien), 0);
  }, [rowsCuaSo, tuNgay]);

  const trongKy = rowsCuaSo.filter((r) => r.ngay >= tuNgay && r.ngay <= denNgay).sort((a, b) => a.ngay.localeCompare(b.ngay));

  const tongThu = trongKy.filter((r) => r.loai_giao_dich === "Thu").reduce((s, r) => s + r.so_tien, 0);
  const tongChi = trongKy.filter((r) => r.loai_giao_dich === "Chi").reduce((s, r) => s + r.so_tien, 0);
  const tonCuoiKy = tonDauKy + tongThu - tongChi;

  const rowsWithRunning = trongKy.reduce<(SoQuy & { tonSauGiaoDich: number })[]>((acc, r) => {
    const tonTruoc = acc.length > 0 ? acc[acc.length - 1].tonSauGiaoDich : tonDauKy;
    const tonSauGiaoDich = tonTruoc + (r.loai_giao_dich === "Thu" ? r.so_tien : -r.so_tien);
    acc.push({ ...r, tonSauGiaoDich });
    return acc;
  }, []);

  async function handleExportExcel() {
    const tkTien = tkTheoPhuongThuc(loaiSo);
    const columns: ExcelColumn[] = [
      { header: "Ngày", key: "ngay", width: 12 },
      { header: "Loại", key: "loai", width: 18 },
      { header: "Nội dung", key: "noiDung", width: 30 },
      { header: "Đơn hàng", key: "donHang", width: 14 },
      { header: "Thu", key: "thu", width: 14 },
      { header: "Chi", key: "chi", width: 14 },
      { header: "TK Nợ", key: "tkNo", width: 10 },
      { header: "TK Có", key: "tkCo", width: 10 },
      { header: "Tồn", key: "ton", width: 14 },
    ];
    const rows = [
      ["", "", `TỒN ĐẦU KỲ (${tuNgay})`, "", "", "", "", "", tonDauKy],
      ...rowsWithRunning.map((r) => {
        const tkDoiUng = tkDoiUngGoiY(r.nguon_bang, loaiSo, tkNoMap[r.nguon_id]);
        const [tkNo, tkCo] = r.loai_giao_dich === "Thu" ? [tkTien, tkDoiUng] : [tkDoiUng, tkTien];
        return [
          r.ngay,
          NGUON_LABEL[r.nguon_bang] ?? r.nguon_bang,
          r.noi_dung ?? "",
          donHangMap[r.nguon_id]?.so_don_hang ?? "",
          r.loai_giao_dich === "Thu" ? r.so_tien : "",
          r.loai_giao_dich === "Chi" ? r.so_tien : "",
          tkNo,
          tkCo,
          r.tonSauGiaoDich,
        ];
      }),
    ];
    const totalRow = ["", "", `TỒN CUỐI KỲ (${denNgay})`, "", tongThu, tongChi, "", "", tonCuoiKy];
    await xuatExcelKeO(`so-quy-${loaiSo}-${tuNgay}_${denNgay}.xlsx`, {
      sheetName: "Sổ quỹ",
      headerLines: [`SỔ QUỸ — ${loaiSo}`, `Từ ${tuNgay} đến ${denNgay}`, GHI_CHU_DINH_KHOAN_GOI_Y],
      columns,
      rows,
      totalRow,
    });
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Sổ quỹ</h1>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleExportExcel} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm">
            Xuất Excel
          </button>
          {canEdit && (
            <button
              onClick={() => setShowChuyenQuy((v) => !v)}
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white"
            >
              + Chuyển quỹ nội bộ
            </button>
          )}
          {canEdit && (
            <button
              onClick={() => setShowDoiChieu((v) => !v)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700"
            >
              Đối chiếu sao kê
            </button>
          )}
        </div>
      </div>

      {showDoiChieu && <DoiChieuSaoKeView loaiSo={loaiSo} onXong={() => setShowDoiChieu(false)} />}

      {showChuyenQuy && (
        <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50/40 p-4">
          <p className="mb-3 text-sm font-medium text-slate-700">Chuyển tiền giữa Tiền mặt và Tài khoản công ty</p>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs text-slate-500">Chiều chuyển</label>
              <select
                value={chieuChuyen}
                onChange={(e) => setChieuChuyen(e.target.value as typeof chieuChuyen)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="Ngân hàng → Tiền mặt">Ngân hàng → Tiền mặt (rút tiền)</option>
                <option value="Tiền mặt → Ngân hàng">Tiền mặt → Ngân hàng (nộp tiền)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Số tiền</label>
              <MoneyInput value={soTienChuyen} onChange={setSoTienChuyen} className="w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div className="min-w-[180px] flex-1">
              <label className="mb-1 block text-xs text-slate-500">Ghi chú (tùy chọn)</label>
              <input
                value={ghiChuChuyen}
                onChange={(e) => setGhiChuChuyen(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <button
              onClick={handleChuyenQuy}
              disabled={savingChuyen}
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
            >
              {savingChuyen ? "Đang lưu..." : "Lưu"}
            </button>
            <button onClick={() => setShowChuyenQuy(false)} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm">
              Hủy
            </button>
          </div>
          {loiChuyen && <p className="mt-2 text-sm text-red-600">{loiChuyen}</p>}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-end gap-2">
        <div className="flex rounded-lg border border-slate-300 bg-white p-1">
          {(["Tiền mặt", "Tài khoản công ty"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setLoaiSo(v)}
              className={`rounded-md px-4 py-2 text-sm font-medium ${loaiSo === v ? "bg-blue-600 text-white" : "text-slate-600"}`}
            >
              {v}
            </button>
          ))}
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">Từ ngày</label>
          <input type="date" value={tuNgay} onChange={(e) => setTuNgay(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">Đến ngày</label>
          <input type="date" value={denNgay} onChange={(e) => setDenNgay(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs text-slate-500">Tồn đầu kỳ</p>
          <p className="text-lg font-semibold text-slate-900">{fmt(tonDauKy)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs text-slate-500">Thu trong kỳ</p>
          <p className="text-lg font-semibold text-green-600">{fmt(tongThu)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs text-slate-500">Chi trong kỳ</p>
          <p className="text-lg font-semibold text-red-600">{fmt(tongChi)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs text-slate-500">Tồn cuối kỳ</p>
          <p className="text-lg font-semibold text-slate-900">{fmt(tonCuoiKy)}</p>
        </div>
      </div>

      {tonCuoiKy < 0 && (
        <div role="alert" className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Số dư {loaiSo.toLowerCase()} đang âm {fmt(Math.abs(tonCuoiKy))}. Kiểm tra số dư đầu kỳ, khoản thu/chi chưa ghi và phương thức thanh toán trước khi chốt sổ.
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              {["Ngày", "Nguồn", "Nội dung", "Đơn hàng", "Thu", "Chi", "Tồn"].map((h) => (
                <th key={h} className="px-3 py-2 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowsWithRunning.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-3 py-2">{r.ngay}</td>
                <td className="px-3 py-2">
                  {NGUON_HREF[r.nguon_bang] ? (
                    <Link href={NGUON_HREF[r.nguon_bang]} className="text-blue-600 hover:underline">
                      {NGUON_LABEL[r.nguon_bang] ?? r.nguon_bang}
                    </Link>
                  ) : (
                    NGUON_LABEL[r.nguon_bang] ?? r.nguon_bang
                  )}
                  {r.nguon_bang === "tam_ung_giai_chi" && tamUngDetailMap[r.nguon_id] && (
                    <p className="text-xs text-slate-400">{tamUngDetailMap[r.nguon_id]}</p>
                  )}
                </td>
                <td className="px-3 py-2">{r.noi_dung ?? "—"}</td>
                <td className="px-3 py-2">
                  {donHangMap[r.nguon_id] ? (
                    <Link href={`/don-hang/${donHangMap[r.nguon_id].id}`} className="text-blue-600 hover:underline">
                      {donHangMap[r.nguon_id].so_don_hang}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-3 py-2 text-green-600">{r.loai_giao_dich === "Thu" ? fmt(r.so_tien) : ""}</td>
                <td className="px-3 py-2 text-red-600">{r.loai_giao_dich === "Chi" ? fmt(r.so_tien) : ""}</td>
                <td className="px-3 py-2 font-medium">{fmt(r.tonSauGiaoDich)}</td>
              </tr>
            ))}
            {rowsWithRunning.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-slate-400">
                  Không có giao dịch trong khoảng thời gian này.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-slate-400">
        Sổ quỹ tự động cập nhật từ: Tạm ứng/Giải chi đã duyệt, thanh toán Chi phí phát sinh, thanh
        toán Thuê dịch vụ ngoài, thu tiền Hóa đơn — chọn đúng &quot;Phương thức&quot; (Tiền mặt/Tài
        khoản công ty) ở từng nơi để dòng tiền tự chạy vào đúng sổ.
      </p>
    </div>
  );
}
