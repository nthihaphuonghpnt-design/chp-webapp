"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import SearchableSelect from "@/components/common/SearchableSelect";
import { xuatExcelKeO, CONG_TY_HEADER_LINES, taiLogoCongTy, type ExcelColumn } from "@/lib/excel";

interface KhachHang {
  id: string;
  ten_day_du: string;
  ten_viet_tat: string | null;
}
interface KhachHangChiTiet {
  id: string;
  ten_day_du: string;
  ten_viet_tat: string | null;
  dia_chi: string | null;
  ma_so_thue: string | null;
  nguoi_lien_he: string | null;
  dien_thoai: string | null;
  email: string | null;
}
interface DonHangOpt {
  id: string;
  so_don_hang: string;
  ngay_len_don: string;
  ngay_van_chuyen: string | null;
  loai_don_hang: string | null;
  loai_kich_co: string | null;
  dvt: string | null;
  so_luong: number | null;
  so_bl_bk: string | null;
  so_lo: string | null;
  hang_hoa: { ten: string } | { ten: string }[] | null;
  bien_so: string[];
  so_to_khai: string[];
}

interface ChiPhiRow {
  id: string;
  don_hang_id: string;
  gia_von_buy: number | null;
  gia_ban_sell: number | null;
  vat_percent: number | null;
  chi_ho: boolean;
  don_hang: { so_don_hang: string } | { so_don_hang: string }[] | null;
  loai_chi_phi: { ten: string } | { ten: string }[] | null;
}
interface PhuThuRow {
  id: string;
  don_hang_id: string;
  loai_phu_thu: string | null;
  thanh_tien: number | null;
  don_hang: { so_don_hang: string } | { so_don_hang: string }[] | null;
}

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? v[0] ?? null : v;
}

export default function BangKeView({
  khachHangList,
  khachHangIdChon,
  khachHangChiTiet,
  donHangList,
  chiPhiRows: initialChiPhi,
  phuThuRows: initialPhuThu,
}: {
  khachHangList: KhachHang[];
  khachHangIdChon: string;
  khachHangChiTiet: KhachHangChiTiet | null;
  donHangList: DonHangOpt[];
  chiPhiRows: ChiPhiRow[];
  phuThuRows: PhuThuRow[];
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [chiPhiRowsAll, setChiPhiRows] = useState<ChiPhiRow[]>(initialChiPhi);
  const [phuThuRowsAll] = useState<PhuThuRow[]>(initialPhuThu);
  const [donHangFilter, setDonHangFilter] = useState("");
  const [vatPercent, setVatPercent] = useState("");
  const [soHoaDon, setSoHoaDon] = useState("");
  const [dangXuat, setDangXuat] = useState(false);

  const chiPhiRows = donHangFilter ? chiPhiRowsAll.filter((r) => r.don_hang_id === donHangFilter) : chiPhiRowsAll;
  const phuThuRows = donHangFilter ? phuThuRowsAll.filter((r) => r.don_hang_id === donHangFilter) : phuThuRowsAll;

  const [chonChiPhi, setChonChiPhi] = useState<Set<string>>(new Set(initialChiPhi.map((r) => r.id)));
  const [chonPhuThu, setChonPhuThu] = useState<Set<string>>(new Set(initialPhuThu.map((r) => r.id)));

  const khOptions = khachHangList.map((k) => ({ value: k.id, label: k.ten_viet_tat || k.ten_day_du }));
  const donHangOptions = donHangList.map((d) => ({
    value: d.id,
    label: `${d.so_don_hang} · ${d.ngay_len_don}${d.loai_kich_co ? ` · ${d.so_luong ?? 1}x${d.loai_kich_co}` : ""}`,
  }));
  const donHangChon = donHangList.find((d) => d.id === donHangFilter) ?? null;
  const donHangMap = useMemo(() => new Map(donHangList.map((d) => [d.id, d])), [donHangList]);

  function chonKhachHang(id: string) {
    const params = new URLSearchParams();
    if (id) params.set("khach_hang", id);
    router.push(`/khach-hang/bang-ke?${params.toString()}`);
  }

  async function toggleChiHo(row: ChiPhiRow) {
    const { data, error } = await supabase
      .from("phat_sinh_chi_phi")
      .update({ chi_ho: !row.chi_ho, noi_bo: row.chi_ho })
      .eq("id", row.id)
      .select("*, don_hang:don_hang_id(so_don_hang), loai_chi_phi:loai_chi_phi_id(ten)")
      .single();
    if (!error && data) {
      setChiPhiRows((prev) => prev.map((r) => (r.id === row.id ? (data as ChiPhiRow) : r)));
    } else if (error) {
      window.alert(error.message);
    }
  }

  function toggle(set: Set<string>, id: string, setter: (s: Set<string>) => void) {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setter(next);
  }

  const dongChiHo = chiPhiRows.filter((r) => r.chi_ho);
  const dongGiaBan = chiPhiRows.filter((r) => !r.chi_ho);

  const tongChiHo = dongChiHo.filter((r) => chonChiPhi.has(r.id)).reduce((s, r) => s + (r.gia_von_buy ?? 0), 0);
  const tongGiaBanChiPhi = dongGiaBan.filter((r) => chonChiPhi.has(r.id)).reduce((s, r) => s + (r.gia_ban_sell ?? 0), 0);
  const tongPhuThu = phuThuRows.filter((r) => chonPhuThu.has(r.id)).reduce((s, r) => s + (r.thanh_tien ?? 0), 0);
  const tongTruocThue = tongGiaBanChiPhi + tongPhuThu;
  // Cong don VAT tung dong (giong het cach tinh o bang "Bang ke chi tiet" phia
  // tren), thay vi ap 1 ty le chung cho ca tong — de so tien hoa don luon khop
  // voi Bang ke chi tiet du khung "VAT %" duoi day co nhap hay khong.
  const vatChungNhapTay = Number(vatPercent) || 0;
  const tienVat =
    dongGiaBan
      .filter((r) => chonChiPhi.has(r.id))
      .reduce((s, r) => s + Math.round(((r.gia_ban_sell ?? 0) * (vatChungNhapTay || r.vat_percent || 0)) / 100), 0) +
    phuThuRows.filter((r) => chonPhuThu.has(r.id)).reduce((s, r) => s + Math.round(((r.thanh_tien ?? 0) * vatChungNhapTay) / 100), 0);
  const tongCong = tongTruocThue + tienVat + tongChiHo;

  const chiTietBangKe = useMemo(() => {
    const vat = Number(vatPercent) || 0;
    const rows: {
      dienGiai: string;
      donHangId: string;
      donHang: string;
      donGia: number;
      soLuong: number;
      thanhTien: number;
      vatPercent: number;
      tienVat: number;
      tongSauVat: number;
      ghiChu: string;
    }[] = [];
    for (const r of chiPhiRows) {
      const soTien = r.chi_ho ? r.gia_von_buy ?? 0 : r.gia_ban_sell ?? 0;
      // Ưu tiên VAT% nhập tay ở khung "Tạo hóa đơn" (áp cho cả bảng); nếu chưa nhập,
      // dùng VAT% đã lưu sẵn theo từng dòng chi phí lúc tạo ở Đơn hàng.
      const vatDong = r.chi_ho ? 0 : vat || r.vat_percent || 0;
      const tienVatDong = r.chi_ho ? 0 : Math.round((soTien * vatDong) / 100);
      rows.push({
        dienGiai: one(r.loai_chi_phi)?.ten ?? "—",
        donHangId: r.don_hang_id,
        donHang: one(r.don_hang)?.so_don_hang ?? "—",
        donGia: soTien,
        soLuong: 1,
        thanhTien: soTien,
        vatPercent: vatDong,
        tienVat: tienVatDong,
        tongSauVat: soTien + tienVatDong,
        ghiChu: r.chi_ho ? "Chi hộ" : "Xuất HĐ",
      });
    }
    for (const r of phuThuRows) {
      const soTien = r.thanh_tien ?? 0;
      const tienVatDong = Math.round((soTien * vat) / 100);
      rows.push({
        dienGiai: `Phụ thu: ${r.loai_phu_thu ?? "—"}`,
        donHangId: r.don_hang_id,
        donHang: one(r.don_hang)?.so_don_hang ?? "—",
        donGia: soTien,
        soLuong: 1,
        thanhTien: soTien,
        vatPercent: vat,
        tienVat: tienVatDong,
        tongSauVat: soTien + tienVatDong,
        ghiChu: "Xuất HĐ (Phụ thu)",
      });
    }
    return rows;
  }, [chiPhiRows, phuThuRows, vatPercent]);

  async function handleXuatExcelBangKe() {
    const khTen = khachHangList.find((k) => k.id === khachHangIdChon);

    const columns: ExcelColumn[] = [
      { header: "No", key: "no", width: 5 },
      { header: "Charge Descriptions", key: "dienGiai", width: 32 },
      { header: "Đơn giá", key: "donGia", width: 14, numFmt: "#,##0" },
      { header: "SL", key: "sl", width: 6 },
      { header: "Total", key: "total", width: 14, numFmt: "#,##0" },
      { header: "VAT (%)", key: "vat", width: 8 },
      { header: "Tiền VAT", key: "tienVat", width: 14, numFmt: "#,##0" },
      { header: "Total (sau VAT)", key: "tongSauVat", width: 16, numFmt: "#,##0" },
      { header: "Ghi chú", key: "ghiChu", width: 14 },
    ];

    const rows = chiTietBangKe.map((r, i) => [
      i + 1,
      r.dienGiai,
      r.donGia,
      r.soLuong,
      r.thanhTien,
      r.vatPercent || "",
      r.tienVat || "",
      r.tongSauVat,
      r.ghiChu,
    ]);

    const totalRow = [
      "",
      "TỔNG CỘNG",
      "",
      "",
      chiTietBangKe.reduce((s, r) => s + r.thanhTien, 0),
      "",
      chiTietBangKe.reduce((s, r) => s + r.tienVat, 0),
      chiTietBangKe.reduce((s, r) => s + r.tongSauVat, 0),
      "",
    ];

    // Dong "Don hang" o khung thong tin chung: 1 don duoc chon thi ghi ro so + ngay,
    // con xem gop nhieu don thi liet ke danh sach so don hang lien quan.
    const donHangLienQuan = donHangChon
      ? `Đơn hàng: ${donHangChon.so_don_hang}  ·  Ngày lên đơn: ${donHangChon.ngay_len_don}`
      : (() => {
          const soDon = Array.from(new Set(chiTietBangKe.map((r) => donHangMap.get(r.donHangId)?.so_don_hang).filter(Boolean)));
          return soDon.length > 0 ? `Đơn hàng: ${soDon.join(", ")}` : "";
        })();

    // Cac thong tin rieng theo don hang (chi hien khi dang xem 1 don cu the,
    // vi khi gop nhieu don thi cac gia tri nay khac nhau giua tung don).
    const donHangChiTietLines = donHangChon
      ? [
          `Loại hàng: ${one(donHangChon.hang_hoa)?.ten ?? ""}`,
          `Kích cỡ / SL: ${donHangChon.so_luong ?? 1}${donHangChon.dvt ? ` ${donHangChon.dvt}` : ""}${donHangChon.loai_kich_co ? ` ${donHangChon.loai_kich_co}` : ""}`,
          `Ngày vận chuyển: ${donHangChon.ngay_van_chuyen ?? ""}`,
          `Số BL/BK: ${donHangChon.so_bl_bk ?? ""}    Số lô: ${donHangChon.so_lo ?? ""}`,
          `Số tờ khai: ${donHangChon.so_to_khai?.join(", ") ?? ""}`,
          `Biển kiểm soát: ${donHangChon.bien_so?.join(", ") ?? ""}`,
        ]
      : [];

    const ten = (khTen?.ten_viet_tat || khTen?.ten_day_du || "khach-hang").replace(/[^\p{L}\p{N}]+/gu, "-");
    const donSuffix = donHangChon ? `-${donHangChon.so_don_hang}` : "";
    const logo = await taiLogoCongTy();
    await xuatExcelKeO(`bang-ke-${ten}${donSuffix}.xlsx`, {
      sheetName: "Bảng kê",
      logo: logo ? { ...logo, cols: 2 } : undefined,
      headerLines: [
        // Cot C tro di (sau logo 2 cot A-B), hang 1-5
        ...CONG_TY_HEADER_LINES,
        "", // dong 6 trang
        // Cot B tro di, tu hang 7
        { text: "DEBIT NOTE", bold: true, color: "FFDC2626", size: 16, col: 2, align: "center" },
        "", // dong 8 trang
        { text: `Khách hàng: ${khachHangChiTiet?.ten_day_du ?? khTen?.ten_day_du ?? ""}`, col: 2 },
        { text: `Địa chỉ: ${khachHangChiTiet?.dia_chi ?? ""}`, col: 2 },
        {
          text: `MST: ${khachHangChiTiet?.ma_so_thue ?? ""}    Người liên hệ: ${khachHangChiTiet?.nguoi_lien_he ?? ""}    SĐT: ${khachHangChiTiet?.dien_thoai ?? ""}`,
          col: 2,
        },
        donHangLienQuan ? { text: donHangLienQuan, col: 2 } : "",
        ...donHangChiTietLines.map((text) => ({ text, col: 2 })),
      ],
      columns,
      rows,
      totalRow,
    });
  }

  async function handleXuatHoaDon() {
    if (!khachHangIdChon) return;
    const chiPhiIds = chiPhiRows.filter((r) => chonChiPhi.has(r.id)).map((r) => r.id);
    const phuThuIds = phuThuRows.filter((r) => chonPhuThu.has(r.id)).map((r) => r.id);
    if (chiPhiIds.length === 0 && phuThuIds.length === 0) {
      window.alert("Chưa chọn dòng nào để xuất hóa đơn.");
      return;
    }
    if (!window.confirm(`Xuất hóa đơn với tổng cộng ${tongCong.toLocaleString("en-US")}?`)) return;

    setDangXuat(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: nv } = await supabase.from("nhan_vien").select("id").eq("auth_user_id", user?.id).single();

    const { data: hoaDon, error } = await supabase
      .from("hoa_don_xuat")
      .insert({
        khach_hang_id: khachHangIdChon,
        so_hoa_don: soHoaDon || null,
        ngay_xuat: new Date().toISOString().slice(0, 10),
        tong_tien_truoc_thue: tongTruocThue,
        vat_percent: vatPercent ? Number(vatPercent) : null,
        tien_vat: tienVat,
        tien_chi_ho: tongChiHo || null,
        nguoi_tao_id: nv?.id,
      })
      .select()
      .single();

    if (error || !hoaDon) {
      window.alert(error?.message ?? "Lỗi tạo hóa đơn.");
      setDangXuat(false);
      return;
    }

    if (chiPhiIds.length > 0) {
      await supabase.from("phat_sinh_chi_phi").update({ hoa_don_id: hoaDon.id }).in("id", chiPhiIds);
    }
    if (phuThuIds.length > 0) {
      await supabase.from("phu_thu").update({ hoa_don_id: hoaDon.id }).in("id", phuThuIds);
    }

    const donHangIds = Array.from(
      new Set([
        ...chiPhiRows.filter((r) => chonChiPhi.has(r.id)).map((r) => r.don_hang_id),
        ...phuThuRows.filter((r) => chonPhuThu.has(r.id)).map((r) => r.don_hang_id),
      ])
    );
    if (donHangIds.length > 0) {
      await supabase.from("hoa_don_don_hang").insert(donHangIds.map((donHangId) => ({ hoa_don_id: hoaDon.id, don_hang_id: donHangId })));
    }

    setDangXuat(false);
    router.push("/khach-hang/hoa-don");
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="mb-4 text-xl font-semibold text-slate-900">Bảng kê chi phí khách hàng</h1>

      <div className="mb-6 flex flex-wrap gap-4">
        <div className="w-full sm:w-80">
          <label className="mb-1 block text-sm font-medium text-slate-700">Khách hàng</label>
          <SearchableSelect options={khOptions} value={khachHangIdChon} onChange={chonKhachHang} placeholder="-- Chọn khách hàng --" />
        </div>
        {khachHangIdChon && (
          <div className="w-full sm:w-80">
            <label className="mb-1 block text-sm font-medium text-slate-700">Đơn hàng (tùy chọn)</label>
            <SearchableSelect
              options={donHangOptions}
              value={donHangFilter}
              onChange={setDonHangFilter}
              placeholder="-- Tất cả đơn hàng --"
            />
          </div>
        )}
      </div>

      {!khachHangIdChon && <p className="text-sm text-slate-400">Chọn khách hàng để xem bảng kê chi phí chưa xuất hóa đơn.</p>}

      {khachHangIdChon && (
        <>
          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Bảng kê chi tiết{donHangChon ? ` — Đơn ${donHangChon.so_don_hang}` : " — Tất cả đơn hàng chưa xuất hóa đơn"}
                </h2>
                {donHangChon && (
                  <p className="text-xs text-slate-500">
                    Ngày: {donHangChon.ngay_len_don}
                    {donHangChon.loai_kich_co ? ` · Khối lượng: ${donHangChon.so_luong ?? 1} x ${donHangChon.loai_kich_co}` : ""}
                  </p>
                )}
              </div>
              <button onClick={handleXuatExcelBangKe} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
                Xuất Excel bảng kê
              </button>
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-100">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    {["No", "Charge Descriptions", "Đơn hàng", "Đơn giá", "SL", "Total", "VAT (%)", "Tiền VAT", "Total (sau VAT)", "Ghi chú"].map((h) => (
                      <th key={h} className="px-3 py-2 font-medium whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {chiTietBangKe.map((r, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="px-3 py-2">{i + 1}</td>
                      <td className="px-3 py-2">{r.dienGiai}</td>
                      <td className="px-3 py-2">{r.donHang}</td>
                      <td className="px-3 py-2">{r.donGia.toLocaleString("en-US")}</td>
                      <td className="px-3 py-2">{r.soLuong}</td>
                      <td className="px-3 py-2">{r.thanhTien.toLocaleString("en-US")}</td>
                      <td className="px-3 py-2">{r.vatPercent || ""}</td>
                      <td className="px-3 py-2">{r.tienVat ? r.tienVat.toLocaleString("en-US") : ""}</td>
                      <td className="px-3 py-2 font-medium">{r.tongSauVat.toLocaleString("en-US")}</td>
                      <td className="px-3 py-2 text-xs text-slate-500">{r.ghiChu}</td>
                    </tr>
                  ))}
                  {chiTietBangKe.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-3 py-6 text-center text-slate-400">
                        Không có dòng nào.
                      </td>
                    </tr>
                  )}
                </tbody>
                {chiTietBangKe.length > 0 && (
                  <tfoot>
                    <tr className="border-t border-slate-200 bg-slate-50 font-semibold">
                      <td className="px-3 py-2" colSpan={5}>
                        TỔNG CỘNG
                      </td>
                      <td className="px-3 py-2">{chiTietBangKe.reduce((s, r) => s + r.thanhTien, 0).toLocaleString("en-US")}</td>
                      <td className="px-3 py-2"></td>
                      <td className="px-3 py-2">{chiTietBangKe.reduce((s, r) => s + r.tienVat, 0).toLocaleString("en-US")}</td>
                      <td className="px-3 py-2">{chiTietBangKe.reduce((s, r) => s + r.tongSauVat, 0).toLocaleString("en-US")}</td>
                      <td className="px-3 py-2"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Nhập VAT % ở khung &quot;Tạo hóa đơn&quot; bên dưới để bảng này tự tính lại tiền VAT cho các dòng &quot;Xuất HĐ&quot;
              (dòng &quot;Chi hộ&quot; không tính VAT).
            </p>
          </div>

          <Section title={`Chi hộ (thu lại đúng số tiền, không VAT) — ${dongChiHo.length} dòng`}>
            {dongChiHo.map((r) => (
              <RowItem
                key={r.id}
                checked={chonChiPhi.has(r.id)}
                onToggleCheck={() => toggle(chonChiPhi, r.id, setChonChiPhi)}
                label={`${one(r.loai_chi_phi)?.ten ?? "—"} · Đơn ${one(r.don_hang)?.so_don_hang ?? "—"}`}
                amount={r.gia_von_buy ?? 0}
                actionLabel="Chuyển sang Giá bán"
                onAction={() => toggleChiHo(r)}
              />
            ))}
            {dongChiHo.length === 0 && <p className="text-sm text-slate-400">Không có dòng chi hộ nào.</p>}
          </Section>

          <Section title={`Giá bán / dịch vụ nội bộ (chịu VAT) — ${dongGiaBan.length + phuThuRows.length} dòng`}>
            {dongGiaBan.map((r) => (
              <RowItem
                key={r.id}
                checked={chonChiPhi.has(r.id)}
                onToggleCheck={() => toggle(chonChiPhi, r.id, setChonChiPhi)}
                label={`${one(r.loai_chi_phi)?.ten ?? "—"} · Đơn ${one(r.don_hang)?.so_don_hang ?? "—"}`}
                amount={r.gia_ban_sell ?? 0}
                actionLabel="Chuyển sang Chi hộ"
                onAction={() => toggleChiHo(r)}
              />
            ))}
            {phuThuRows.map((r) => (
              <RowItem
                key={r.id}
                checked={chonPhuThu.has(r.id)}
                onToggleCheck={() => toggle(chonPhuThu, r.id, setChonPhuThu)}
                label={`Phụ thu: ${r.loai_phu_thu ?? "—"} · Đơn ${one(r.don_hang)?.so_don_hang ?? "—"}`}
                amount={r.thanh_tien ?? 0}
              />
            ))}
            {dongGiaBan.length === 0 && phuThuRows.length === 0 && <p className="text-sm text-slate-400">Không có dòng giá bán nào.</p>}
          </Section>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Tạo hóa đơn từ các dòng đã chọn</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Số hóa đơn</label>
                <input
                  value={soHoaDon}
                  onChange={(e) => setSoHoaDon(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">VAT %</label>
                <input
                  type="number"
                  step="any"
                  value={vatPercent}
                  onChange={(e) => setVatPercent(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-4 space-y-1 text-sm text-slate-600">
              <p>Tổng giá bán trước thuế: <strong>{tongTruocThue.toLocaleString("en-US")}</strong></p>
              <p>Tiền VAT: <strong>{tienVat.toLocaleString("en-US")}</strong></p>
              <p>Tổng chi hộ: <strong>{tongChiHo.toLocaleString("en-US")}</strong></p>
              <p className="text-base font-semibold text-slate-900">Tổng cộng hóa đơn: {tongCong.toLocaleString("en-US")}</p>
            </div>

            <button
              onClick={handleXuatHoaDon}
              disabled={dangXuat}
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
            >
              {dangXuat ? "Đang xuất..." : "Xuất hóa đơn"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-slate-900">{title}</h2>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function RowItem({
  checked,
  onToggleCheck,
  label,
  amount,
  actionLabel,
  onAction,
}: {
  checked: boolean;
  onToggleCheck: () => void;
  label: string;
  amount: number;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 p-2 text-sm">
      <label className="flex flex-1 items-center gap-2">
        <input type="checkbox" checked={checked} onChange={onToggleCheck} />
        <span className="text-slate-700">{label}</span>
      </label>
      <span className="font-medium text-slate-900">{amount.toLocaleString("en-US")}</span>
      {onAction && (
        <button type="button" onClick={onAction} className="text-xs font-medium text-blue-600 underline">
          {actionLabel}
        </button>
      )}
    </div>
  );
}
