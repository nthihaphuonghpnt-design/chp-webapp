"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/client";

interface DonHangOpt {
  id: string;
  so_don_hang: string;
  ngay_len_don: string;
}
interface LoaiChiPhiOpt {
  id: string;
  ten: string;
}

const IMPORT_COLUMNS = [
  "Số đơn hàng *",
  "Loại chi phí *",
  "Giá vốn (buy) *",
  "Giá bán (sell)",
  "Chi hộ (Có/Không)",
  "Ngày phát sinh (yyyy-mm-dd)",
  "Ghi chú",
] as const;

function findByName(list: LoaiChiPhiOpt[], name: string) {
  return list.find((o) => o.ten.trim().toLowerCase() === name.trim().toLowerCase());
}

/**
 * Nhap hang loat nhieu dong Chi phi phat sinh thuoc NHIEU don hang khac nhau
 * cung luc (khac voi "Nhap nhanh nhieu chi phi" trong ChiPhiGopSection — cai
 * do chi nhap duoc cho 1 don dang mo). Dung de bo sung lai gia mua/gia ban
 * cho cac lo hang CU da nhap truoc do (qua "Tai mau Excel" cua trang Don
 * hang), noi theo cot "So don hang".
 */
export default function ChiPhiPhatSinhBulkExcelTools({
  donHangList,
  loaiChiPhiList,
  canImport,
}: {
  donHangList: DonHangOpt[];
  loaiChiPhiList: LoaiChiPhiOpt[];
  canImport: boolean;
}) {
  const supabase = createClient();
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState<{ success: number; errors: string[] } | null>(null);

  if (!canImport) return null;

  function handleDownloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([[...IMPORT_COLUMNS]]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mẫu nhập chi phí lô cũ");

    const guideRows: (string | undefined)[][] = [["Cột", "Giá trị hợp lệ"]];
    guideRows.push(["Số đơn hàng", "Gõ đúng Số đơn hàng đã có trên hệ thống (VD: CHPNK2607008) — phải tạo đơn hàng trước ở file \"mau-nhap-don-hang\"."]);
    guideRows.push(["Loại chi phí", loaiChiPhiList.map((l) => l.ten).join(", ")]);
    guideRows.push(["Chi hộ", "Để trống hoặc \"Không\" = chi phí nội bộ (tính lãi/lỗ). Gõ \"Có\" = chi hộ khách (thu đúng bằng chi, không tính lãi/lỗ)."]);
    guideRows.push(["Ngày phát sinh", "Để trống thì hệ thống tự lấy theo Ngày lên đơn của lô đó."]);
    guideRows.push(["Nhiều dòng 1 lô", "1 lô hàng có nhiều khoản chi phí thì tạo nhiều dòng, lặp lại cùng 1 Số đơn hàng."]);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(guideRows), "Hướng dẫn");

    XLSX.writeFile(wb, "mau-nhap-chi-phi-lo-cu.xlsx");
  }

  async function handleImportFile(file: File) {
    setImporting(true);
    setSummary(null);

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

      const loaiTen = get("Loại chi phí *") || get("Loại chi phí");
      const loai = findByName(loaiChiPhiList, loaiTen);
      if (!loai) {
        errors.push(`Dòng ${rowNum}: không tìm thấy loại chi phí "${loaiTen}".`);
        return;
      }

      const giaVon = get("Giá vốn (buy) *") || get("Giá vốn (buy)");
      if (!giaVon) {
        errors.push(`Dòng ${rowNum}: thiếu Giá vốn (buy).`);
        return;
      }

      const ngay = get("Ngày phát sinh (yyyy-mm-dd)") || donHang.ngay_len_don;

      records.push({
        don_hang_id: donHang.id,
        loai_chi_phi_id: loai.id,
        so_tien_da_chi: Number(giaVon),
        gia_ban_sell: get("Giá bán (sell)") ? Number(get("Giá bán (sell)")) : null,
        chi_ho: get("Chi hộ (Có/Không)").toLowerCase() === "có",
        noi_bo: get("Chi hộ (Có/Không)").toLowerCase() !== "có",
        ngay_phat_sinh: ngay,
        ghi_chu: get("Ghi chú") || null,
        nguoi_nhap_id: nv?.id,
        // Du lieu lo CU da hoan tat tu truoc — ghi nhan thang "Da duyet" luon,
        // khong qua "Cho duyet" nhu nhap moi hang ngay.
        trang_thai: "Đã duyệt",
      });
    });

    if (records.length === 0) {
      setSummary({ success: 0, errors: errors.length ? errors : ["File không có dòng dữ liệu hợp lệ."] });
      setImporting(false);
      return;
    }

    const { data, error: err } = await supabase.from("phat_sinh_chi_phi").insert(records).select();
    setImporting(false);

    if (err) {
      setSummary({ success: 0, errors: [...errors, `Lỗi khi lưu: ${err.message}`] });
      return;
    }

    setSummary({ success: data?.length ?? 0, errors });
  }

  return (
    <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="mb-2 text-sm font-semibold text-slate-900">Nhập chi phí (giá mua/giá bán) cho nhiều lô hàng cũ</h2>
      <p className="mb-3 text-xs text-slate-400">
        Dùng sau khi đã tạo xong các đơn hàng cũ (ở nút &quot;Nhập từ Excel&quot; phía trên) — mỗi dòng trong file này là 1 khoản chi phí, nối vào đúng lô qua cột &quot;Số đơn hàng&quot;.
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
            Đã nhập thành công {summary.success} dòng chi phí
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
