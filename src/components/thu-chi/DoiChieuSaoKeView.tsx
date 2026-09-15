"use client";

import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface UngVien {
  bang: "phat_sinh_chi_phi" | "don_thue_ngoai" | "hoa_don_dau_vao" | "hoa_don_xuat";
  id: string;
  nhan: string;
  conLai: number;
}

interface DongSaoKe {
  stt: number;
  ngay: string;
  noiDung: string;
  loaiGiaoDich: "Thu" | "Chi";
  soTien: number;
  ungVien: UngVien[];
  daChon: string; // "bang:id" hoac "" (bo qua)
}

const TEMPLATE_COLUMNS = ["Ngày (yyyy-mm-dd)", "Nội dung", "Loại (Thu/Chi)", "Số tiền"];

export default function DoiChieuSaoKeView({ loaiSo, onXong }: { loaiSo: "Tiền mặt" | "Tài khoản công ty"; onXong: () => void }) {
  const router = useRouter();
  const supabase = createClient();
  const [dongList, setDongList] = useState<DongSaoKe[]>([]);
  const [dangTai, setDangTai] = useState(false);
  const [dangApDung, setDangApDung] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleDownloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_COLUMNS]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mẫu sao kê");
    XLSX.writeFile(wb, "mau-sao-ke-doi-chieu.xlsx");
  }

  async function timUngVien(loaiGiaoDich: "Thu" | "Chi", soTien: number): Promise<UngVien[]> {
    const ketQua: UngVien[] = [];

    if (loaiGiaoDich === "Chi") {
      const [{ data: psc }, { data: dtn }, { data: hddv }] = await Promise.all([
        supabase
          .from("phat_sinh_chi_phi")
          .select("id, tong_tien, so_tien_da_thanh_toan, ngay_phat_sinh, ghi_chu, tinh_trang_thanh_toan, nguon_thanh_toan, don_hang:don_hang_id(so_don_hang)")
          .neq("tinh_trang_thanh_toan", "Đã đủ")
          // Khoan da gan nguon "Tạm ứng nhân viên" phai quyet toan qua Phieu
          // quyet toan tam ung, KHONG doi chieu qua sao ke ngan hang — neu
          // khong se lam sai lech: ghi nhan "da thanh toan qua ngan hang"
          // trong khi thuc te la nhan vien tu ung tien, khien nhan vien
          // khong bao gio duoc hoan ung.
          .or("nguon_thanh_toan.is.null,nguon_thanh_toan.neq.Tạm ứng nhân viên"),
        supabase
          .from("don_thue_ngoai")
          .select("id, so_tien_da_chi, so_tien_da_thanh_toan, ngay_thue, noi_dung, tinh_trang_thanh_toan, nguon_thanh_toan, don_hang:don_hang_id(so_don_hang)")
          .neq("tinh_trang_thanh_toan", "Đã đủ")
          .or("nguon_thanh_toan.is.null,nguon_thanh_toan.neq.Tạm ứng nhân viên"),
        supabase
          .from("hoa_don_dau_vao")
          .select("id, tong_tien_thanh_toan, so_tien_da_thanh_toan, ngay_hoa_don, khoan_muc, tinh_trang_thanh_toan")
          .neq("tinh_trang_thanh_toan", "Đã đủ"),
      ]);
      for (const r of psc ?? []) {
        const conLai = (r.tong_tien ?? 0) - (r.so_tien_da_thanh_toan ?? 0);
        if (Math.abs(conLai - soTien) < 1) {
          const dh = Array.isArray(r.don_hang) ? r.don_hang[0] : r.don_hang;
          ketQua.push({ bang: "phat_sinh_chi_phi", id: r.id, nhan: `Chi phí ${dh?.so_don_hang ?? ""} — ${r.ghi_chu ?? "(không ghi chú)"} — ${r.ngay_phat_sinh}`, conLai });
        }
      }
      for (const r of dtn ?? []) {
        const conLai = (r.so_tien_da_chi ?? 0) - (r.so_tien_da_thanh_toan ?? 0);
        if (Math.abs(conLai - soTien) < 1) {
          const dh = Array.isArray(r.don_hang) ? r.don_hang[0] : r.don_hang;
          ketQua.push({ bang: "don_thue_ngoai", id: r.id, nhan: `Thuê ngoài ${dh?.so_don_hang ?? ""} — ${r.noi_dung ?? ""} — ${r.ngay_thue}`, conLai });
        }
      }
      for (const r of hddv ?? []) {
        const conLai = (r.tong_tien_thanh_toan ?? 0) - (r.so_tien_da_thanh_toan ?? 0);
        if (Math.abs(conLai - soTien) < 1) {
          ketQua.push({ bang: "hoa_don_dau_vao", id: r.id, nhan: `Hóa đơn đầu vào — ${r.khoan_muc} — ${r.ngay_hoa_don}`, conLai });
        }
      }
    } else {
      const { data: hdx } = await supabase
        .from("hoa_don_xuat")
        .select("id, tong_tien, so_tien_da_thu, so_hoa_don, ngay_xuat, trang_thai_thanh_toan, khach_hang:khach_hang_id(ten_day_du)")
        .neq("trang_thai_thanh_toan", "Đã thu đủ");
      for (const r of hdx ?? []) {
        const conLai = (r.tong_tien ?? 0) - (r.so_tien_da_thu ?? 0);
        if (Math.abs(conLai - soTien) < 1) {
          const kh = Array.isArray(r.khach_hang) ? r.khach_hang[0] : r.khach_hang;
          ketQua.push({ bang: "hoa_don_xuat", id: r.id, nhan: `Hóa đơn ${r.so_hoa_don ?? ""} — ${kh?.ten_day_du ?? ""} — ${r.ngay_xuat}`, conLai });
        }
      }
    }
    return ketQua;
  }

  async function handleImportFile(file: File) {
    setDangTai(true);
    setError(null);
    const buf = await file.arrayBuffer();
    // KHONG dung cellDates:true — sheet_to_json() tu tao lai Date object cho o
    // ngay theo 1 duong khac voi luc doc cell truc tiep, va tru di lech mui
    // gio cua may nguoi dung khoi gia tri dung (da kiem chung: doc 1 o ngay
    // 10/9/2026 tra ve Date "2026-09-09T17:00:00Z" thay vi dung
    // "2026-09-10T00:00:00Z" tren may UTC+7) — sai theo tung may, khong on
    // dinh. Doc RAW (raw:true) de o ngay tra ve dung SO SERIAL EXCEL (vd
    // 46275), roi tu tay quy doi bang XLSX.SSF.parse_date_code() — ham nay
    // tinh thuan tren con so serial, KHONG dinh gi den JS Date/timezone nen
    // luon dung bat ke may nguoi dung o mui gio nao.
    const wb = XLSX.read(buf, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: true });

    function excelDate(v: unknown): string {
      if (typeof v === "number") {
        const { y, m, d } = XLSX.SSF.parse_date_code(v);
        return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      }
      return String(v ?? "").trim();
    }

    const dong: DongSaoKe[] = [];
    let stt = 1;
    for (const rawRow of raw) {
      const n: Record<string, unknown> = {};
      for (const key of Object.keys(rawRow)) n[key.trim().toLowerCase()] = rawRow[key];
      const soTien = Number(n["số tiền"] || 0);
      const loai = String(n["loại (thu/chi)"] ?? "").trim();
      if (!soTien || (loai !== "Thu" && loai !== "Chi")) continue;
      const ungVien = await timUngVien(loai as "Thu" | "Chi", soTien);
      dong.push({
        stt: stt++,
        ngay: excelDate(n["ngày (yyyy-mm-dd)"]) || new Date().toISOString().slice(0, 10),
        noiDung: String(n["nội dung"] ?? "").trim(),
        loaiGiaoDich: loai as "Thu" | "Chi",
        soTien,
        ungVien,
        daChon: ungVien.length === 1 ? `${ungVien[0].bang}:${ungVien[0].id}` : "",
      });
    }
    setDongList(dong);
    setDangTai(false);
  }

  function chonUngVien(stt: number, value: string) {
    setDongList((prev) => prev.map((d) => (d.stt === stt ? { ...d, daChon: value } : d)));
  }

  async function xacNhanTatCa() {
    setDangApDung(true);
    setError(null);
    const phuongThuc = loaiSo;
    let thanhCong = 0;
    let boQuaDaXuLy = 0;
    const loiTungDong: string[] = [];
    // stt cua cac dong da xu ly xong (thanh cong HOAC phat hien da duoc xu ly
    // tu truoc) — dung de loc khoi dongList sau vong lap, tranh viec bam lai
    // "Xac nhan" (vd sau khi 1 vai dong loi, retry) se cong tien THEM LAN NUA
    // cho cac dong da ap dung thanh cong tu lan truoc.
    const daXongStt = new Set<number>();

    for (const d of dongList) {
      if (!d.daChon) continue;
      const [bang, id] = d.daChon.split(":");
      const ungVien = d.ungVien.find((u) => u.bang === bang && u.id === id);
      if (!ungVien) continue;

      if (bang === "hoa_don_xuat") {
        const { data: hd } = await supabase.from("hoa_don_xuat").select("trang_thai_thanh_toan").eq("id", id).single();
        if (hd?.trang_thai_thanh_toan === "Đã thu đủ") {
          // Da duoc doi chieu/thu du tu truoc (vd bam Xac nhan 2 lan, hoac
          // nguoi khac vua ap dung) — bo qua, KHONG cong tien them lan nua.
          boQuaDaXuLy++;
          daXongStt.add(d.stt);
          continue;
        }
        // Tu migration 0099: khong con UPDATE thang duoc nua, phai qua RPC
        // thu_tien_hoa_don_xuat — RPC tu co guard nguyen tu rieng (kiem tra
        // lai trang_thai_thanh_toan duoi khoa FOR UPDATE), an toan y het co
        // che .neq(...) truoc day ke ca khi 2 request chay gan dong thoi.
        // ungVien chi duoc goi y khi conLai === d.soTien nen thua_thanh_credit
        // se luon la 0 qua duong nay — khong can xu ly UI rieng cho phan thua.
        const { error: err } = await supabase.rpc("thu_tien_hoa_don_xuat", {
          p_hoa_don_id: id,
          p_so_tien: d.soTien,
          p_phuong_thuc: phuongThuc,
          p_ghi_chu: "Đối chiếu sao kê",
        });
        if (err) {
          if (err.message?.includes("đã") && err.message?.includes("Đã thu đủ")) {
            boQuaDaXuLy++;
            daXongStt.add(d.stt);
          } else {
            loiTungDong.push(`Dòng ${d.stt} (${d.noiDung}): ${err.message}`);
          }
        } else {
          thanhCong++;
          daXongStt.add(d.stt);
        }
      } else if (bang === "hoa_don_dau_vao") {
        const { data: hd } = await supabase.from("hoa_don_dau_vao").select("tinh_trang_thanh_toan").eq("id", id).single();
        if (hd?.tinh_trang_thanh_toan === "Đã đủ") {
          boQuaDaXuLy++;
          daXongStt.add(d.stt);
          continue;
        }
        // Tu migration 0099: khong con UPDATE thang duoc nua, phai qua RPC
        // thanh_toan_hoa_don_dau_vao — cung nguyen tac guard nhu nhanh
        // hoa_don_xuat o tren.
        const { error: err } = await supabase.rpc("thanh_toan_hoa_don_dau_vao", {
          p_hoa_don_id: id,
          p_so_tien: d.soTien,
          p_phuong_thuc: phuongThuc,
          p_ghi_chu: "Đối chiếu sao kê",
        });
        if (err) {
          if (err.message?.includes("đã") && err.message?.includes("Đã đủ")) {
            boQuaDaXuLy++;
            daXongStt.add(d.stt);
          } else {
            loiTungDong.push(`Dòng ${d.stt} (${d.noiDung}): ${err.message}`);
          }
        } else {
          thanhCong++;
          daXongStt.add(d.stt);
        }
      } else {
        // Ung vien chi duoc goi y khi conLai === d.soTien (trong sai so 1 don
        // vi tien te), nen sau khi ap dung khoan nay se luon vua du — khong
        // can tinh lai "Mot phan" o day. phat_sinh_chi_phi/don_thue_ngoai
        // chua bi khoa GRANT nhu hoa_don_xuat/hoa_don_dau_vao nen van ghi
        // truc tiep duoc — khong nam trong pham vi trả thừa/credit lan nay
        // (xem bao cao nghiem thu).
        const { data: hienTai } = await supabase.from(bang).select("so_tien_da_thanh_toan, tinh_trang_thanh_toan").eq("id", id).single();
        const hienTaiRow = hienTai as { so_tien_da_thanh_toan?: number; tinh_trang_thanh_toan?: string } | null;
        if (hienTaiRow?.tinh_trang_thanh_toan === "Đã đủ") {
          boQuaDaXuLy++;
          daXongStt.add(d.stt);
          continue;
        }
        const daTraMoi = (hienTaiRow?.so_tien_da_thanh_toan ?? 0) + d.soTien;
        // Cung dung .neq(...) lam guard nguyen tu nhu nhanh hoa_don_xuat o tren.
        const { data: updated, error: err } = await supabase
          .from(bang)
          .update({ so_tien_da_thanh_toan: daTraMoi, tinh_trang_thanh_toan: "Đã đủ", phuong_thuc_thanh_toan: phuongThuc })
          .eq("id", id)
          .neq("tinh_trang_thanh_toan", "Đã đủ")
          .select("id");
        if (err) {
          loiTungDong.push(`Dòng ${d.stt} (${d.noiDung}): ${err.message}`);
        } else if (updated && updated.length > 0) {
          thanhCong++;
          daXongStt.add(d.stt);
        } else {
          boQuaDaXuLy++;
          daXongStt.add(d.stt);
        }
      }
    }
    setDangApDung(false);
    // Loai cac dong da xong (thanh cong hoac da-xu-ly-tu-truoc) khoi danh
    // sach — chi giu lai dong loi that su de nguoi dung sua/thu lai, tranh
    // bam "Xac nhan" lan nua ap dung trung cac dong da xong.
    setDongList((prev) => prev.filter((d) => !daXongStt.has(d.stt)));
    if (thanhCong === 0 && boQuaDaXuLy === 0 && loiTungDong.length === 0) {
      setError("Không có dòng nào được xác nhận khớp — chưa áp dụng gì.");
      return;
    }
    if (loiTungDong.length > 0) {
      setError(
        `Đã xác nhận ${thanhCong} dòng${boQuaDaXuLy > 0 ? `, bỏ qua ${boQuaDaXuLy} dòng đã xử lý từ trước` : ""}, còn ${loiTungDong.length} dòng lỗi (có thể bấm "Xác nhận" lại để thử lại các dòng này):\n${loiTungDong.join("\n")}`,
      );
    }
    router.refresh();
    if (loiTungDong.length === 0) onXong();
  }

  return (
    <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50/40 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-700">
          Đối chiếu sao kê — Sổ &quot;{loaiSo}&quot; (gợi ý khớp theo số tiền còn lại, anh xác nhận từng dòng trước khi lưu)
        </p>
        <div className="flex gap-2">
          <button onClick={handleDownloadTemplate} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700">
            Tải mẫu Excel
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={dangTai}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-60"
          >
            {dangTai ? "Đang tìm khớp..." : "Nhập Excel sao kê"}
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
          <button onClick={onXong} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs">
            Đóng
          </button>
        </div>
      </div>

      {dongList.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-2 py-1.5 font-medium">Ngày</th>
                  <th className="px-2 py-1.5 font-medium">Nội dung</th>
                  <th className="px-2 py-1.5 font-medium">Loại</th>
                  <th className="px-2 py-1.5 text-right font-medium">Số tiền</th>
                  <th className="px-2 py-1.5 font-medium">Khớp với khoản chưa thanh toán</th>
                </tr>
              </thead>
              <tbody>
                {dongList.map((d) => (
                  <tr key={d.stt} className="border-t border-slate-100">
                    <td className="px-2 py-1.5">{d.ngay}</td>
                    <td className="px-2 py-1.5">{d.noiDung}</td>
                    <td className="px-2 py-1.5">{d.loaiGiaoDich}</td>
                    <td className="px-2 py-1.5 text-right">{Math.round(d.soTien).toLocaleString("en-US")}</td>
                    <td className="px-2 py-1.5">
                      <select value={d.daChon} onChange={(e) => chonUngVien(d.stt, e.target.value)} className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs">
                        <option value="">— Không khớp / bỏ qua —</option>
                        {d.ungVien.map((u) => (
                          <option key={`${u.bang}:${u.id}`} value={`${u.bang}:${u.id}`}>
                            {u.nhan} (còn {Math.round(u.conLai).toLocaleString("en-US")})
                          </option>
                        ))}
                      </select>
                      {d.ungVien.length === 0 && <p className="mt-0.5 text-xs text-amber-600">Không tìm thấy khoản nào còn lại đúng số tiền này.</p>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {error && <p className="mt-2 whitespace-pre-line text-sm text-red-600">{error}</p>}
          <button
            onClick={xacNhanTatCa}
            disabled={dangApDung}
            className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {dangApDung ? "Đang lưu..." : "Xác nhận các dòng đã chọn"}
          </button>
        </>
      )}
    </div>
  );
}
