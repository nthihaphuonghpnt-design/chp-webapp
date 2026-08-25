"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/client";
import SearchableSelect from "@/components/common/SearchableSelect";
import FileAttachSection from "@/components/common/FileAttachSection";
import MoneyInput from "@/components/common/MoneyInput";
import type { DinhKem } from "@/types/database";

interface KhachHang {
  id: string;
  ten_day_du: string;
  ten_viet_tat: string | null;
}
interface DonHangOpt {
  id: string;
  so_don_hang: string;
  khach_hang_id: string | null;
}
interface LienKet {
  hoa_don_id: string;
  don_hang_id: string;
}

interface Row {
  id: string;
  khach_hang_id: string;
  so_hoa_don: string | null;
  ngay_xuat: string;
  tong_tien_truoc_thue: number | null;
  vat_percent: number | null;
  tien_vat: number;
  tien_chi_ho: number | null;
  tong_tien: number;
  trang_thai_thanh_toan: "Chưa thu" | "Thu một phần" | "Đã thu đủ";
  so_tien_da_thu: number | null;
  phuong_thuc_thu: string | null;
  ghi_chu: string | null;
  khach_hang: KhachHang | KhachHang[] | null;
}

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? v[0] ?? null : v;
}
function khName(kh: KhachHang | null) {
  return kh ? kh.ten_viet_tat || kh.ten_day_du : "—";
}

const TT_THU: Row["trang_thai_thanh_toan"][] = ["Chưa thu", "Thu một phần", "Đã thu đủ"];
const TT_COLOR: Record<string, string> = {
  "Chưa thu": "bg-red-100 text-red-700",
  "Thu một phần": "bg-amber-100 text-amber-700",
  "Đã thu đủ": "bg-green-100 text-green-700",
};

export default function HoaDonView({
  initialRows,
  khachHangList,
  donHangList,
  lienKetAll,
  dinhKemRows,
  canEdit,
  canDelete,
  currentUserId,
}: {
  initialRows: Row[];
  khachHangList: KhachHang[];
  donHangList: DonHangOpt[];
  lienKetAll: LienKet[];
  dinhKemRows: DinhKem[];
  canEdit: boolean;
  canDelete: boolean;
  currentUserId?: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [lienKet, setLienKet] = useState<LienKet[]>(lienKetAll);
  const [khFilter, setKhFilter] = useState("");
  const [ttFilter, setTtFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);

  function donHangCuaHoaDon(hoaDonId: string) {
    const ids = lienKet.filter((l) => l.hoa_don_id === hoaDonId).map((l) => l.don_hang_id);
    return donHangList.filter((d) => ids.includes(d.id));
  }

  const filtered = rows
    .filter((r) => !khFilter || r.khach_hang_id === khFilter)
    .filter((r) => !ttFilter || r.trang_thai_thanh_toan === ttFilter);

  async function handleSave(values: Record<string, string>, selectedDonHang: string[]) {
    const payload: Record<string, unknown> = {
      khach_hang_id: values.khach_hang_id,
      so_hoa_don: values.so_hoa_don || null,
      ngay_xuat: values.ngay_xuat,
      tong_tien_truoc_thue: values.tong_tien_truoc_thue ? Number(values.tong_tien_truoc_thue) : null,
      vat_percent: values.vat_percent ? Number(values.vat_percent) : null,
      tien_chi_ho: values.tien_chi_ho ? Number(values.tien_chi_ho) : null,
      trang_thai_thanh_toan: values.trang_thai_thanh_toan || "Chưa thu",
      so_tien_da_thu: values.so_tien_da_thu ? Number(values.so_tien_da_thu) : null,
      phuong_thuc_thu: values.phuong_thuc_thu || null,
      ghi_chu: values.ghi_chu || null,
    };

    let hoaDonId = editing?.id;

    if (editing) {
      const { data, error } = await supabase
        .from("hoa_don_xuat")
        .update(payload)
        .eq("id", editing.id)
        .select("*, khach_hang:khach_hang_id(ten_day_du, ten_viet_tat)")
        .single();
      if (error) {
        window.alert(error.message);
        return;
      }
      setRows((prev) => prev.map((r) => (r.id === editing.id ? (data as Row) : r)));
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data: nv } = await supabase.from("nhan_vien").select("id").eq("auth_user_id", user?.id).single();

      const { data, error } = await supabase
        .from("hoa_don_xuat")
        .insert({ ...payload, nguoi_tao_id: nv?.id })
        .select("*, khach_hang:khach_hang_id(ten_day_du, ten_viet_tat)")
        .single();
      if (error) {
        window.alert(error.message);
        return;
      }
      hoaDonId = data.id;
      setRows((prev) => [data as Row, ...prev]);
    }

    if (hoaDonId) {
      await supabase.from("hoa_don_don_hang").delete().eq("hoa_don_id", hoaDonId);
      if (selectedDonHang.length > 0) {
        await supabase.from("hoa_don_don_hang").insert(selectedDonHang.map((donHangId) => ({ hoa_don_id: hoaDonId, don_hang_id: donHangId })));
      }
      setLienKet((prev) => [
        ...prev.filter((l) => l.hoa_don_id !== hoaDonId),
        ...selectedDonHang.map((donHangId) => ({ hoa_don_id: hoaDonId!, don_hang_id: donHangId })),
      ]);
    }

    setShowForm(false);
  }

  async function handleDelete(row: Row) {
    if (!window.confirm(`Xóa hóa đơn "${row.so_hoa_don ?? ""}"?`)) return;
    const { error } = await supabase.from("hoa_don_xuat").delete().eq("id", row.id);
    if (!error) {
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      setLienKet((prev) => prev.filter((l) => l.hoa_don_id !== row.id));
    }
  }

  function handleExportExcel() {
    const data = filtered.map((r) => ({
      "Khách hàng": khName(one(r.khach_hang)),
      "Số hóa đơn": r.so_hoa_don ?? "",
      "Ngày xuất": r.ngay_xuat,
      "Tổng trước thuế": r.tong_tien_truoc_thue ?? "",
      "VAT %": r.vat_percent ?? "",
      "Tiền chi hộ": r.tien_chi_ho ?? "",
      "Tiền VAT": r.tien_vat,
      "Tổng tiền": r.tong_tien,
      "Trạng thái thanh toán": r.trang_thai_thanh_toan,
      "Đã thu": r.so_tien_da_thu ?? "",
      "Đơn hàng liên quan": donHangCuaHoaDon(r.id)
        .map((d) => d.so_don_hang)
        .join(", "),
      "Ghi chú": r.ghi_chu ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Hóa đơn");
    XLSX.writeFile(wb, "hoa-don-xuat.xlsx");
  }

  const tongTien = filtered.reduce((s, r) => s + r.tong_tien, 0);
  const tongDaThu = filtered.reduce((s, r) => s + (r.so_tien_da_thu ?? 0), 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Hóa đơn xuất</h1>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleExportExcel} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            Xuất Excel
          </button>
          {canEdit && (
            <button
              onClick={() => {
                setEditing(null);
                setShowForm(true);
              }}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm"
            >
              + Thêm hóa đơn
            </button>
          )}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="w-56">
          <SearchableSelect
            options={khachHangList.map((k) => ({ value: k.id, label: k.ten_viet_tat || k.ten_day_du }))}
            value={khFilter}
            onChange={setKhFilter}
            placeholder="Tất cả khách hàng"
          />
        </div>
        <select value={ttFilter} onChange={(e) => setTtFilter(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm">
          <option value="">Tất cả trạng thái thu</option>
          {TT_THU.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </div>

      <p className="mb-4 text-sm text-slate-600">
        Tổng tiền: <strong>{tongTien.toLocaleString("en-US")}</strong> · Đã thu: <strong>{tongDaThu.toLocaleString("en-US")}</strong> · Còn phải thu:{" "}
        <strong>{(tongTien - tongDaThu).toLocaleString("en-US")}</strong>
      </p>

      <div className="flex flex-col gap-2">
        {filtered.map((row) => (
          <div key={row.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-slate-900">
                {row.so_hoa_don || "(chưa có số)"} · {khName(one(row.khach_hang))}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TT_COLOR[row.trang_thai_thanh_toan]}`}>{row.trang_thai_thanh_toan}</span>
            </div>
            <p className="text-slate-500">
              {row.ngay_xuat} · Tổng: {row.tong_tien.toLocaleString("en-US")}
              {row.vat_percent ? ` (gồm VAT ${row.vat_percent}%)` : ""}
              {row.tien_chi_ho ? ` (gồm chi hộ ${row.tien_chi_ho.toLocaleString("en-US")})` : ""}
              {row.so_tien_da_thu ? ` · Đã thu: ${row.so_tien_da_thu.toLocaleString("en-US")}` : ""}
            </p>
            {donHangCuaHoaDon(row.id).length > 0 && (
              <p className="text-slate-500">Đơn hàng: {donHangCuaHoaDon(row.id).map((d) => d.so_don_hang).join(", ")}</p>
            )}
            {row.ghi_chu && <p className="text-slate-500">{row.ghi_chu}</p>}
            <FileAttachSection
              parentField="hoa_don_id"
              parentId={row.id}
              pathPrefix="hoa-don"
              lienKetToi="Hóa đơn"
              initialRows={dinhKemRows.filter((d) => d.hoa_don_id === row.id)}
              canUpload={canEdit}
              currentUserId={currentUserId}
            />
            {canEdit && (
              <div className="mt-2 flex gap-3">
                <button
                  onClick={() => {
                    setEditing(row);
                    setShowForm(true);
                  }}
                  className="text-xs font-medium text-blue-600"
                >
                  Sửa
                </button>
                {canDelete && (
                  <button onClick={() => handleDelete(row)} className="text-xs font-medium text-red-600">
                    Xóa
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && <p className="py-8 text-center text-sm text-slate-400">Chưa có hóa đơn nào.</p>}
      </div>

      {showForm && (
        <HoaDonForm
          initial={editing}
          khachHangList={khachHangList}
          donHangList={donHangList}
          initialDonHangIds={editing ? donHangCuaHoaDon(editing.id).map((d) => d.id) : []}
          onCancel={() => setShowForm(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

function HoaDonForm({
  initial,
  khachHangList,
  donHangList,
  initialDonHangIds,
  onCancel,
  onSave,
}: {
  initial: Row | null;
  khachHangList: KhachHang[];
  donHangList: DonHangOpt[];
  initialDonHangIds: string[];
  onCancel: () => void;
  onSave: (values: Record<string, string>, selectedDonHang: string[]) => void;
}) {
  const [values, setValues] = useState({
    khach_hang_id: initial?.khach_hang_id ?? "",
    so_hoa_don: initial?.so_hoa_don ?? "",
    ngay_xuat: initial?.ngay_xuat ?? new Date().toISOString().slice(0, 10),
    tong_tien_truoc_thue: initial?.tong_tien_truoc_thue?.toString() ?? "",
    vat_percent: initial?.vat_percent?.toString() ?? "",
    tien_chi_ho: initial?.tien_chi_ho?.toString() ?? "",
    trang_thai_thanh_toan: initial?.trang_thai_thanh_toan ?? "Chưa thu",
    so_tien_da_thu: initial?.so_tien_da_thu?.toString() ?? "",
    phuong_thuc_thu: initial?.phuong_thuc_thu ?? "",
    ghi_chu: initial?.ghi_chu ?? "",
  });
  const [selectedDonHang, setSelectedDonHang] = useState<string[]>(initialDonHangIds);
  const [goiYTong, setGoiYTong] = useState<number | null>(null);
  const supabase = useMemo(() => createClient(), []);

  function set(key: keyof typeof values, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function toggleDonHang(id: string) {
    setSelectedDonHang((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  useEffect(() => {
    let cancelled = false;
    if (selectedDonHang.length === 0) {
      Promise.resolve().then(() => {
        if (!cancelled) setGoiYTong(null);
      });
    } else {
      supabase.rpc("tong_sell_khong_chi_ho", { p_don_hang_ids: selectedDonHang }).then(({ data }) => {
        if (!cancelled) setGoiYTong(typeof data === "number" ? data : null);
      });
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDonHang.join(",")]);

  const khOptions = khachHangList.map((k) => ({ value: k.id, label: k.ten_viet_tat || k.ten_day_du }));
  const donHangCuaKh = donHangList.filter((d) => !values.khach_hang_id || d.khach_hang_id === values.khach_hang_id);
  const cls = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(values, selectedDonHang);
        }}
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-lg sm:rounded-2xl"
      >
        <h2 className="mb-4 text-lg font-semibold text-slate-900">{initial ? "Sửa hóa đơn" : "Thêm hóa đơn"}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Khách hàng</label>
            <SearchableSelect options={khOptions} value={values.khach_hang_id} onChange={(v) => set("khach_hang_id", v)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Số hóa đơn</label>
            <input value={values.so_hoa_don} onChange={(e) => set("so_hoa_don", e.target.value)} className={cls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Ngày xuất</label>
            <input required type="date" value={values.ngay_xuat} onChange={(e) => set("ngay_xuat", e.target.value)} className={cls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Tổng tiền trước thuế</label>
            <MoneyInput value={values.tong_tien_truoc_thue} onChange={(v) => set("tong_tien_truoc_thue", v)} className={cls} />
            {goiYTong !== null && (
              <p className="mt-1 text-xs text-blue-600">
                Gợi ý (đã bán cho khách, không gồm chi hộ): {goiYTong.toLocaleString("en-US")}
                {values.tong_tien_truoc_thue !== String(goiYTong) && (
                  <button type="button" onClick={() => set("tong_tien_truoc_thue", String(goiYTong))} className="ml-2 underline">
                    Dùng số này
                  </button>
                )}
              </p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">VAT %</label>
            <input type="number" step="any" value={values.vat_percent} onChange={(e) => set("vat_percent", e.target.value)} className={cls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Tiền chi hộ</label>
            <MoneyInput value={values.tien_chi_ho} onChange={(v) => set("tien_chi_ho", v)} className={cls} />
            <p className="mt-1 text-xs text-slate-400">Khoản thu hộ đúng số tiền, không tính VAT</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Trạng thái thanh toán</label>
            <select value={values.trang_thai_thanh_toan} onChange={(e) => set("trang_thai_thanh_toan", e.target.value)} className={cls}>
              {TT_THU.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Đã thu</label>
            <MoneyInput value={values.so_tien_da_thu} onChange={(v) => set("so_tien_da_thu", v)} className={cls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Phương thức thu</label>
            <select value={values.phuong_thuc_thu} onChange={(e) => set("phuong_thuc_thu", e.target.value)} className={cls}>
              <option value="">-- Chọn --</option>
              <option value="Tiền mặt">Tiền mặt</option>
              <option value="Tài khoản công ty">Tài khoản công ty</option>
            </select>
          </div>
        </div>

        <div className="mt-3">
          <label className="mb-1 block text-sm font-medium text-slate-700">Đơn hàng liên quan (có thể chọn nhiều)</label>
          <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 p-2">
            {donHangCuaKh.length === 0 && <p className="text-xs text-slate-400">Chọn khách hàng để xem đơn hàng.</p>}
            {donHangCuaKh.map((d) => (
              <label key={d.id} className="flex items-center gap-2 py-1 text-sm">
                <input type="checkbox" checked={selectedDonHang.includes(d.id)} onChange={() => toggleDonHang(d.id)} />
                {d.so_don_hang}
              </label>
            ))}
          </div>
        </div>

        <div className="mt-3">
          <label className="mb-1 block text-sm font-medium text-slate-700">Ghi chú</label>
          <textarea rows={2} value={values.ghi_chu} onChange={(e) => set("ghi_chu", e.target.value)} className={cls} />
        </div>

        <div className="mt-6 flex gap-3">
          <button type="button" onClick={onCancel} className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700">
            Hủy
          </button>
          <button type="submit" className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white">
            Lưu
          </button>
        </div>
      </form>
    </div>
  );
}
