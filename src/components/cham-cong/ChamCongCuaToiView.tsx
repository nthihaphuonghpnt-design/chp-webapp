"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { homNayVN, trangThaiHienThi, danhSachNgay, CHAM_CONG_COLOR, type TrangThaiChamCong } from "@/lib/chamCong";

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
  initialRows,
  ngayLeList = [],
  soNgayLichSu = 30,
}: {
  nhanVienId?: string;
  initialRows: ChamCongRow[];
  ngayLeList?: string[];
  soNgayLichSu?: number;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<ChamCongRow[]>(initialRows);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ngayLeSet = useMemo(() => new Set(ngayLeList), [ngayLeList]);

  const homNay = homNayVN();
  const rowHomNay = rows.find((r) => r.ngay === homNay);
  const homNayLaNgayLe = ngayLeSet.has(homNay);

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
    setRows((prev) => [data as ChamCongRow, ...prev]);
  }

  const ngayBatDau = danhSachNgay(
    new Date(new Date(homNay).getTime() - soNgayLichSu * 86400000).toISOString().slice(0, 10),
    homNay
  ).reverse();

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

      <details className="mt-4">
        <summary className="cursor-pointer text-xs font-medium text-blue-600">Xem lịch sử chấm công gần đây</summary>
        <div className="mt-2 flex flex-col gap-1">
          {ngayBatDau.map((ngay) => {
            const row = rows.find((r) => r.ngay === ngay);
            const trangThai = trangThaiHienThi(ngay, row, ngayLeSet, homNay);
            if (!trangThai) return null;
            return (
              <div key={ngay} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-1.5 text-sm">
                <span className="text-slate-600">{ngay}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CHAM_CONG_COLOR[trangThai]}`}>{trangThai}</span>
              </div>
            );
          })}
        </div>
      </details>
    </div>
  );
}
