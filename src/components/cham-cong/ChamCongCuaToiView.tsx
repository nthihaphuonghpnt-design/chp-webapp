"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { homNayVN, trangThaiHienThi, danhSachNgay, ngayCuoiThang, CHAM_CONG_COLOR, type TrangThaiChamCong } from "@/lib/chamCong";

interface ChamCongRow {
  id: string;
  ngay: string;
  trang_thai: string;
  ghi_chu: string | null;
  nguoi_dieu_chinh_id: string | null;
  ly_do_dieu_chinh: string | null;
}

export default function ChamCongCuaToiView({
  nhanVienId,
  homNayRow,
  initialRowsThang,
  thangNam,
  ngayLeList = [],
}: {
  nhanVienId?: string;
  homNayRow: ChamCongRow | null;
  initialRowsThang: ChamCongRow[];
  thangNam: string;
  ngayLeList?: string[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [rowHomNay, setRowHomNay] = useState<ChamCongRow | null>(homNayRow);
  const [rowsThang, setRowsThang] = useState<ChamCongRow[]>(initialRowsThang);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ngayLeSet = useMemo(() => new Set(ngayLeList), [ngayLeList]);

  const homNay = homNayVN();
  const homNayLaNgayLe = ngayLeSet.has(homNay);
  const cacNgayTrongThang = danhSachNgay(`${thangNam}-01`, ngayCuoiThang(thangNam));

  async function handleChamCong() {
    if (!nhanVienId) return;
    setSaving(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("cham_cong")
      .insert({ nhan_vien_id: nhanVienId, ngay: homNay, trang_thai: "Đi làm" })
      .select()
      .single();
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setRowHomNay(data as ChamCongRow);
    if (homNay.slice(0, 7) === thangNam) {
      setRowsThang((prev) => [...prev, data as ChamCongRow]);
    }
  }

  function doiThang(thangMoi: string) {
    router.push(`/cham-cong?thang=${thangMoi}`);
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-slate-900">Chấm công</h2>

      {rowHomNay ? (
        <div className="mt-3 flex items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-sm font-medium ${CHAM_CONG_COLOR[rowHomNay.trang_thai as TrangThaiChamCong]}`}>
            {rowHomNay.trang_thai}
          </span>
          <span className="text-sm text-slate-500">Đã chấm công hôm nay ({homNay}).</span>
        </div>
      ) : (
        <div className="mt-3">
          {homNayLaNgayLe && (
            <p className="mb-2 text-xs text-purple-600">
              Hôm nay là ngày nghỉ lễ — không bắt buộc chấm công, trừ khi bạn có đi làm.
            </p>
          )}
          <button
            onClick={handleChamCong}
            disabled={saving || !nhanVienId}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
          >
            {saving ? "Đang lưu..." : "Chấm công hôm nay"}
          </button>
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        </div>
      )}

      <div className="mt-5 border-t border-slate-100 pt-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium text-slate-700">Bảng chấm công tháng</p>
          <input
            type="month"
            value={thangNam}
            onChange={(e) => doiThang(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          {cacNgayTrongThang.map((ngay) => {
            const row = rowsThang.find((r) => r.ngay === ngay);
            const trangThai = trangThaiHienThi(ngay, row, ngayLeSet, homNay);
            if (!trangThai) return null;
            return (
              <div key={ngay} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-1.5 text-sm">
                <span className="text-slate-600">{ngay}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CHAM_CONG_COLOR[trangThai]}`}>{trangThai}</span>
              </div>
            );
          })}
          {cacNgayTrongThang.every((ngay) => !trangThaiHienThi(ngay, rowsThang.find((r) => r.ngay === ngay), ngayLeSet, homNay)) && (
            <p className="py-4 text-center text-sm text-slate-400">Chưa có dữ liệu chấm công tháng này.</p>
          )}
        </div>
      </div>
    </div>
  );
}
