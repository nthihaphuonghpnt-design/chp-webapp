"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import SearchableSelect from "@/components/common/SearchableSelect";
import { danhSachNgay, laNgayCanChamCong, homNayVN, CHAM_CONG_COLOR, TRANG_THAI_CHAM_CONG, type TrangThaiChamCong } from "@/lib/chamCong";

interface NhanVien {
  id: string;
  ho_ten: string;
  loai_nhan_su: string;
}

interface ChamCongRow {
  id: string;
  nhan_vien_id: string;
  ngay: string;
  trang_thai: string;
  ghi_chu: string | null;
  nguoi_dieu_chinh_id: string | null;
  ly_do_dieu_chinh: string | null;
  thoi_gian_dieu_chinh: string | null;
  nguoi_dieu_chinh?: { ho_ten: string } | { ho_ten: string }[] | null;
}

function one<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? v[0] ?? null : v ?? null;
}

export default function ChamCongAdminView({
  thangNam,
  nhanVienList,
  initialRows,
  currentNhanVienId,
}: {
  thangNam: string;
  nhanVienList: NhanVien[];
  initialRows: ChamCongRow[];
  currentNhanVienId?: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [rows, setRows] = useState<ChamCongRow[]>(initialRows);
  const [nhanVienIdChon, setNhanVienIdChon] = useState("");
  const [editingNgay, setEditingNgay] = useState<string | null>(null);
  const [form, setForm] = useState({ trang_thai: "Đi làm", ly_do_dieu_chinh: "" });
  const [saving, setSaving] = useState(false);

  const [y, m] = thangNam.split("-").map(Number);
  const soNgayTrongThang = new Date(y, m, 0).getDate();
  const homNay = homNayVN();
  const cacNgayTrongThang = danhSachNgay(`${thangNam}-01`, `${thangNam}-${String(soNgayTrongThang).padStart(2, "0")}`);

  const nvOptions = nhanVienList.map((n) => ({ value: n.id, label: `${n.ho_ten}${n.loai_nhan_su === "Outsource" ? " (Outsource)" : ""}` }));

  function rowsCuaNhanVien(nvId: string) {
    return rows.filter((r) => r.nhan_vien_id === nvId);
  }

  const tongHop = nhanVienList.map((nv) => {
    const rs = rowsCuaNhanVien(nv.id);
    const dem: Record<string, number> = {};
    for (const t of TRANG_THAI_CHAM_CONG) dem[t] = 0;
    let thieu = 0;
    for (const ngay of cacNgayTrongThang) {
      if (ngay >= homNay) continue;
      if (!laNgayCanChamCong(ngay)) continue;
      const r = rs.find((x) => x.ngay === ngay);
      if (r) dem[r.trang_thai] = (dem[r.trang_thai] ?? 0) + 1;
      else thieu += 1;
    }
    return { nv, dem, thieu };
  });

  function changeThang(thangMoi: string) {
    router.push(`/cham-cong?thang=${thangMoi}`);
  }

  async function handleLuu(nvId: string, ngay: string) {
    setSaving(true);
    const existing = rows.find((r) => r.nhan_vien_id === nvId && r.ngay === ngay);
    const payload = {
      nhan_vien_id: nvId,
      ngay,
      trang_thai: form.trang_thai,
      nguoi_dieu_chinh_id: currentNhanVienId ?? null,
      ly_do_dieu_chinh: form.ly_do_dieu_chinh.trim() || null,
      thoi_gian_dieu_chinh: new Date().toISOString(),
    };
    if (existing) {
      const { data, error } = await supabase
        .from("cham_cong")
        .update(payload)
        .eq("id", existing.id)
        .select("*, nguoi_dieu_chinh:nguoi_dieu_chinh_id(ho_ten)")
        .single();
      setSaving(false);
      if (error) {
        window.alert(error.message);
        return;
      }
      setRows((prev) => prev.map((r) => (r.id === existing.id ? (data as ChamCongRow) : r)));
    } else {
      const { data, error } = await supabase
        .from("cham_cong")
        .insert(payload)
        .select("*, nguoi_dieu_chinh:nguoi_dieu_chinh_id(ho_ten)")
        .single();
      setSaving(false);
      if (error) {
        window.alert(error.message);
        return;
      }
      setRows((prev) => [...prev, data as ChamCongRow]);
    }
    setEditingNgay(null);
    setForm({ trang_thai: "Đi làm", ly_do_dieu_chinh: "" });
  }

  const cls = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";

  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-900">Quản lý chấm công (Kế toán / Giám đốc)</h2>
        <input
          type="month"
          value={thangNam}
          onChange={(e) => changeThang(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
              <th className="py-2 pr-2">Nhân viên</th>
              {TRANG_THAI_CHAM_CONG.map((t) => (
                <th key={t} className="px-2 py-2 text-center">{t}</th>
              ))}
              <th className="px-2 py-2 text-center">Thiếu chấm công</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {tongHop.map(({ nv, dem, thieu }) => (
              <tr key={nv.id} className="border-b border-slate-100">
                <td className="py-2 pr-2 font-medium text-slate-800">
                  {nv.ho_ten}
                  {nv.loai_nhan_su === "Outsource" && <span className="ml-1 text-xs font-normal text-slate-400">(Outsource)</span>}
                </td>
                {TRANG_THAI_CHAM_CONG.map((t) => (
                  <td key={t} className="px-2 py-2 text-center text-slate-600">{dem[t] || ""}</td>
                ))}
                <td className={`px-2 py-2 text-center font-medium ${thieu > 0 ? "text-amber-600" : "text-slate-300"}`}>{thieu || ""}</td>
                <td className="px-2 py-2 text-right">
                  <button onClick={() => setNhanVienIdChon(nv.id)} className="text-xs font-medium text-blue-600">
                    Chi tiết / Điều chỉnh
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {nhanVienIdChon && (
        <div className="mt-5 border-t border-slate-100 pt-4">
          <div className="mb-3 w-full sm:w-72">
            <SearchableSelect options={nvOptions} value={nhanVienIdChon} onChange={setNhanVienIdChon} placeholder="Chọn nhân viên..." />
          </div>
          <div className="flex flex-col gap-1">
            {cacNgayTrongThang.map((ngay) => {
              const row = rows.find((r) => r.nhan_vien_id === nhanVienIdChon && r.ngay === ngay);
              const laThieu = !row && ngay < homNay && laNgayCanChamCong(ngay);
              const trangThai: TrangThaiChamCong | null = row ? (row.trang_thai as TrangThaiChamCong) : laThieu ? "Thiếu chấm công" : null;
              const nguoiDc = row ? one(row.nguoi_dieu_chinh) : null;
              return (
                <div key={ngay} className="rounded-lg border border-slate-100 p-2 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-slate-600">{ngay}</span>
                    <div className="flex items-center gap-2">
                      {trangThai && (
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CHAM_CONG_COLOR[trangThai]}`}>{trangThai}</span>
                      )}
                      {!trangThai && <span className="text-xs text-slate-300">—</span>}
                      <button
                        onClick={() => {
                          setEditingNgay(ngay);
                          setForm({ trang_thai: row?.trang_thai ?? "Đi làm", ly_do_dieu_chinh: "" });
                        }}
                        className="text-xs font-medium text-blue-600"
                      >
                        Sửa
                      </button>
                    </div>
                  </div>
                  {row?.nguoi_dieu_chinh_id && (
                    <p className="mt-1 text-xs text-slate-400">
                      Đã điều chỉnh bởi {nguoiDc?.ho_ten ?? "—"}
                      {row.thoi_gian_dieu_chinh ? ` lúc ${new Date(row.thoi_gian_dieu_chinh).toLocaleString("vi-VN")}` : ""}
                      {row.ly_do_dieu_chinh ? ` — Lý do: ${row.ly_do_dieu_chinh}` : ""}
                    </p>
                  )}
                  {editingNgay === ngay && (
                    <div className="mt-2 flex flex-col gap-2 rounded-lg bg-slate-50 p-2">
                      <select value={form.trang_thai} onChange={(e) => setForm((p) => ({ ...p, trang_thai: e.target.value }))} className={cls}>
                        {TRANG_THAI_CHAM_CONG.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                      <input
                        value={form.ly_do_dieu_chinh}
                        onChange={(e) => setForm((p) => ({ ...p, ly_do_dieu_chinh: e.target.value }))}
                        placeholder="Lý do điều chỉnh (bắt buộc)"
                        className={cls}
                      />
                      <div className="flex gap-2">
                        <button onClick={() => setEditingNgay(null)} className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700">
                          Hủy
                        </button>
                        <button
                          disabled={saving || !form.ly_do_dieu_chinh.trim()}
                          onClick={() => handleLuu(nhanVienIdChon, ngay)}
                          className="flex-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
                        >
                          {saving ? "Đang lưu..." : "Lưu"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
