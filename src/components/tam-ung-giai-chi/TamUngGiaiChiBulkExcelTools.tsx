"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/client";

interface DonHangOpt {
  id: string;
  so_don_hang: string;
}
interface NhanVienOpt {
  id: string;
  ho_ten: string;
}

const IMPORT_COLUMNS = [
  "Số đơn hàng *",
  "Ngày tạm ứng * (yyyy-mm-dd)",
  "Người nhận *",
  "Số tiền *",
  "Phương thức (Tiền mặt/Tài khoản công ty)",
  "Ghi chú",
] as const;

function findByName(list: NhanVienOpt[], name: string) {
  return list.find((o) => o.ho_ten.trim().toLowerCase() === name.trim().toLowerCase());
}

/**
 * Nhap hang loat nhieu dong Tam ung (loai='Tạm ứng', doi_tuong='Nhân viên')
 * thuoc NHIEU don hang khac nhau cung luc — dung cho du lieu lich su da duyet
 * tu truoc (vd lay lai tu bang doi chieu ngan hang cu), khong phai de nghi moi
 * can cho duyet. Noi theo cot "So don hang", dung y het khuon
 * ChiPhiPhatSinhBulkExcelTools.tsx.
 */
export default function TamUngGiaiChiBulkExcelTools({
  donHangList,
  nhanVienList,
  canImport,
}: {
  donHangList: DonHangOpt[];
  nhanVienList: NhanVienOpt[];
  canImport: boolean;
}) {
  const supabase = createClient();
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState<{ success: number; errors: string[] } | null>(null);

  if (!canImport) return null;

  function handleDownloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([[...IMPORT_COLUMNS]]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mẫu nhập tạm ứng lô cũ");

    const guideRows: (string | undefined)[][] = [["Cột", "Giá trị hợp lệ"]];
    guideRows.push(["Số đơn hàng", "Gõ đúng Số đơn hàng đã có trên hệ thống (VD: CHPNK2607008) — phải tạo đơn hàng trước ở file \"mau-nhap-don-hang\"."]);
    guideRows.push(["Người nhận", nhanVienList.map((n) => n.ho_ten).join(", ")]);
    guideRows.push(["Phương thức", "Tiền mặt hoặc Tài khoản công ty — để trống mặc định Tiền mặt."]);
    guideRows.push(["Nhiều dòng 1 lô", "1 lô hàng có nhiều lần tạm ứng thì tạo nhiều dòng, lặp lại cùng 1 Số đơn hàng."]);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(guideRows), "Hướng dẫn");

    XLSX.writeFile(wb, "mau-nhap-tam-ung-lo-cu.xlsx");
  }

  async function handleImportFile(file: File) {
    setImporting(true);
    setSummary(null);

    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array", cellDates: true });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

    const records: Record<string, unknown>[] = [];
    const errors: string[] = [];

    raw.forEach((rawRow, idx) => {
      const rowNum = idx + 2;
      const normalized: Record<string, unknown> = {};
      for (const key of Object.keys(rawRow)) normalized[key.trim().toLowerCase()] = rawRow[key];
      const get = (h: string) => {
        const v = normalized[h.toLowerCase()];
        return v instanceof Date ? v.toISOString().slice(0, 10) : String(v ?? "").trim();
      };

      const soDonHang = get("Số đơn hàng *") || get("Số đơn hàng");
      const donHang = donHangList.find((d) => d.so_don_hang.trim().toLowerCase() === soDonHang.toLowerCase());
      if (!donHang) {
        errors.push(`Dòng ${rowNum}: không tìm thấy đơn hàng "${soDonHang}".`);
        return;
      }

      const tenNguoiNhan = get("Người nhận *") || get("Người nhận");
      const nhanVien = findByName(nhanVienList, tenNguoiNhan);
      if (!nhanVien) {
        errors.push(`Dòng ${rowNum}: không tìm thấy nhân viên "${tenNguoiNhan}".`);
        return;
      }

      const soTien = get("Số tiền *") || get("Số tiền");
      if (!soTien) {
        errors.push(`Dòng ${rowNum}: thiếu Số tiền.`);
        return;
      }

      const ngay = get("Ngày tạm ứng * (yyyy-mm-dd)") || get("Ngày tạm ứng (yyyy-mm-dd)");
      if (!ngay) {
        errors.push(`Dòng ${rowNum}: thiếu Ngày tạm ứng.`);
        return;
      }

      const phuongThuc = get("Phương thức (Tiền mặt/Tài khoản công ty)") || get("Phương thức");

      records.push({
        loai: "Tạm ứng",
        doi_tuong: "Nhân viên",
        nhan_vien_id: nhanVien.id,
        don_hang_id: donHang.id,
        so_tien: Number(soTien),
        ngay_thuc_hien: ngay,
        phuong_thuc: phuongThuc === "Tài khoản công ty" ? "Tài khoản công ty" : "Tiền mặt",
        ghi_chu: get("Ghi chú") || null,
        nguoi_de_nghi_id: nhanVien.id,
        // Du lieu lo CU da duyet tu truoc — ghi nhan thang "Đã duyệt" luon,
        // khong qua "Đề nghị" nhu de nghi tam ung moi hang ngay.
        trang_thai: "Đã duyệt",
      });
    });

    if (records.length === 0) {
      setSummary({ success: 0, errors: errors.length ? errors : ["File không có dòng dữ liệu hợp lệ."] });
      setImporting(false);
      return;
    }

    const { data, error: err } = await supabase.from("tam_ung_giai_chi").insert(records).select();
    setImporting(false);

    if (err) {
      setSummary({ success: 0, errors: [...errors, `Lỗi khi lưu: ${err.message}`] });
      return;
    }

    setSummary({ success: data?.length ?? 0, errors });
  }

  return (
    <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="mb-2 text-sm font-semibold text-slate-900">Nhập tạm ứng cho nhiều lô hàng cũ</h2>
      <p className="mb-3 text-xs text-slate-400">
        Dùng cho các lần tạm ứng lịch sử đã khớp với giao dịch ngân hàng (đã duyệt) — mỗi dòng trong file là 1 lần tạm ứng, nối vào đúng lô qua cột &quot;Số đơn hàng&quot;.
      </p>
      <div className="flex flex-wrap gap-2">
        <button onClick={handleDownloadTemplate} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700">
          Tải mẫu Excel
        </button>
        <label className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700">
          {importing ? "Đang nhập..." : "Nhập từ Excel"}
          <input
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

      {summary && (
        <div
          className={`mt-3 rounded-lg border p-3 text-sm ${
            summary.errors.length > 0 ? "border-amber-300 bg-amber-50 text-amber-800" : "border-green-300 bg-green-50 text-green-800"
          }`}
        >
          <p className="font-medium">
            Đã nhập thành công {summary.success} dòng tạm ứng
            {summary.errors.length > 0 ? `, ${summary.errors.length} dòng lỗi:` : "."}
          </p>
          {summary.errors.length > 0 && (
            <ul className="mt-2 list-disc space-y-0.5 pl-5">
              {summary.errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
