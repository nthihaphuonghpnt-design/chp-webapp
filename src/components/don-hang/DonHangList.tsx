"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import StatusBadge from "./StatusBadge";
import { createClient } from "@/lib/supabase/client";

const CHUA_GAN = "__chua_gan__";

interface Person {
  id: string;
  ten: string;
}

interface KhachHangOption {
  id: string;
  ten_day_du: string;
  ten_viet_tat: string | null;
}

interface Row {
  id: string;
  so_don_hang: string;
  loai_don_hang: string | null;
  loai_kich_co: string | null;
  so_kien: number | null;
  so_kg: number | null;
  ngay_len_don: string;
  ngay_van_chuyen: string | null;
  trang_thai: string;
  ops_xac_nhan: boolean;
  cs_xac_nhan: boolean;
  khach_hang_id: string | null;
  sale_phu_trach_id: string | null;
  hien_truong_phu_trach_id: string | null;
  khach_hang: { ten_day_du: string; ten_viet_tat: string | null } | { ten_day_du: string; ten_viet_tat: string | null }[] | null;
  don_hang_container: { so_cont: string | null }[] | null;
}

const STATUSES = ["Tiếp nhận", "Làm thủ tục", "Thông quan", "Giao hàng", "Hoàn tất"];

function customerName(row: Row) {
  const kh = Array.isArray(row.khach_hang) ? row.khach_hang[0] : row.khach_hang;
  if (!kh) return "—";
  return kh.ten_viet_tat || kh.ten_day_du;
}

function cargoSummary(row: Row) {
  if (row.loai_kich_co === "Hàng lẻ") {
    const parts: string[] = [];
    if (row.so_kg) parts.push(`${row.so_kg} kg`);
    if (row.so_kien) parts.push(`${row.so_kien} kiện`);
    return parts.length > 0 ? parts.join(" · ") : "Hàng lẻ";
  }
  const containers = row.don_hang_container ?? [];
  if (containers.length === 0) return "Chưa có cont";
  if (containers.length === 1) return containers[0].so_cont || "1 cont";
  return `${containers.length} cont`;
}

// "Thiếu việc" = đơn chưa được cả OPS (hiện trường) lẫn CS xác nhận hoàn tất, và chưa ở trạng thái cuối.
function isPending(row: Row) {
  return row.trang_thai !== "Hoàn tất" && !(row.ops_xac_nhan && row.cs_xac_nhan);
}

export default function DonHangList({
  initialRows,
  khachHangList = [],
  saleList = [],
  hienTruongList = [],
  canBulkAssign = false,
}: {
  initialRows: Row[];
  khachHangList?: KhachHangOption[];
  saleList?: Person[];
  hienTruongList?: Person[];
  /** P2 muc 12 (2026-11-27): Sale/Chung tu/Giam doc — cung quyen voi
   * canManageDonHang, cho gan Sale hang loat cho cac don con "—". */
  canBulkAssign?: boolean;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState(initialRows);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [khachHangFilter, setKhachHangFilter] = useState("");
  const [saleFilter, setSaleFilter] = useState("");
  const [hienTruongFilter, setHienTruongFilter] = useState("");
  const [tuNgay, setTuNgay] = useState("");
  const [denNgay, setDenNgay] = useState("");
  const [onlyPending, setOnlyPending] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [ganSaleId, setGanSaleId] = useState("");
  const [dangGan, setDangGan] = useState(false);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    const result = rows.filter((r) => {
      if (statusFilter && r.trang_thai !== statusFilter) return false;
      if (khachHangFilter && r.khach_hang_id !== khachHangFilter) return false;
      if (saleFilter === CHUA_GAN ? !!r.sale_phu_trach_id : saleFilter && r.sale_phu_trach_id !== saleFilter) return false;
      if (hienTruongFilter && r.hien_truong_phu_trach_id !== hienTruongFilter) return false;
      if (tuNgay && r.ngay_len_don < tuNgay) return false;
      if (denNgay && r.ngay_len_don > denNgay) return false;
      if (onlyPending && !isPending(r)) return false;
      if (!q) return true;
      return (
        r.so_don_hang.toLowerCase().includes(q) ||
        customerName(r).toLowerCase().includes(q) ||
        (r.don_hang_container ?? []).some((c) => (c.so_cont ?? "").toLowerCase().includes(q))
      );
    });

    // Mặc định: đơn còn thiếu việc lên trước, rồi theo ngày lên đơn mới nhất.
    return [...result].sort((a, b) => {
      const pendingA = isPending(a) ? 0 : 1;
      const pendingB = isPending(b) ? 0 : 1;
      if (pendingA !== pendingB) return pendingA - pendingB;
      return b.ngay_len_don.localeCompare(a.ngay_len_don);
    });
  }, [rows, query, statusFilter, khachHangFilter, saleFilter, hienTruongFilter, tuNgay, denNgay, onlyPending]);

  const selectClass =
    "rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none";

  function toggleChon(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleGanSaleHangLoat() {
    if (!ganSaleId || selected.size === 0) return;
    setDangGan(true);
    const ids = Array.from(selected);
    // P2 muc 9 (2026-11-27): cho phep "Bo gan Sale" (vd don bi gan nham 1
    // nhan vien khong thuc su lam Sale) — gui null cho RPC thay vi bat buoc
    // phai chon 1 nguoi. Dung RPC rieng (khong UPDATE truc tiep) de khong
    // phai mo rong RLS UPDATE cua don_hang cho Ke toan — xem migration 0123.
    const saleIdMoi = ganSaleId === CHUA_GAN ? null : ganSaleId;
    const { error } = await supabase.rpc("gan_sale_hang_loat", { p_don_hang_ids: ids, p_sale_id: saleIdMoi });
    setDangGan(false);
    if (error) {
      window.alert(error.message);
      return;
    }
    setRows((prev) => prev.map((r) => (ids.includes(r.id) ? { ...r, sale_phu_trach_id: saleIdMoi } : r)));
    setSelected(new Set());
    setGanSaleId("");
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm theo số đơn, khách hàng, số cont..."
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectClass}>
            <option value="">Tất cả trạng thái</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-3">
          <select value={khachHangFilter} onChange={(e) => setKhachHangFilter(e.target.value)} className={selectClass}>
            <option value="">Tất cả khách hàng</option>
            {khachHangList.map((k) => (
              <option key={k.id} value={k.id}>
                {k.ten_viet_tat || k.ten_day_du}
              </option>
            ))}
          </select>
          <select value={saleFilter} onChange={(e) => setSaleFilter(e.target.value)} className={selectClass}>
            <option value="">Tất cả CS</option>
            <option value={CHUA_GAN}>— Chưa gán CS —</option>
            {saleList.map((p) => (
              <option key={p.id} value={p.id}>
                {p.ten}
              </option>
            ))}
          </select>
          <select value={hienTruongFilter} onChange={(e) => setHienTruongFilter(e.target.value)} className={selectClass}>
            <option value="">Tất cả Hiện trường</option>
            {hienTruongList.map((p) => (
              <option key={p.id} value={p.id}>
                {p.ten}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500">Từ ngày</label>
            <input
              type="date"
              value={tuNgay}
              onChange={(e) => setTuNgay(e.target.value)}
              className="rounded-lg border border-slate-300 px-2 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <label className="text-xs text-slate-500">Đến ngày</label>
            <input
              type="date"
              value={denNgay}
              onChange={(e) => setDenNgay(e.target.value)}
              className="rounded-lg border border-slate-300 px-2 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <label className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
            <input type="checkbox" checked={onlyPending} onChange={(e) => setOnlyPending(e.target.checked)} />
            Chỉ đơn còn thiếu việc
          </label>
        </div>
      </div>

      {canBulkAssign && selected.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg bg-blue-50 p-3 text-sm">
          <span>
            Đã chọn <strong>{selected.size}</strong> đơn —
          </span>
          <select value={ganSaleId} onChange={(e) => setGanSaleId(e.target.value)} className={selectClass}>
            <option value="">-- Chọn CS --</option>
            <option value={CHUA_GAN}>— Bỏ gán Sale (không ai) —</option>
            {saleList.map((p) => (
              <option key={p.id} value={p.id}>
                {p.ten}
              </option>
            ))}
          </select>
          <button
            onClick={handleGanSaleHangLoat}
            disabled={!ganSaleId || dangGan}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {dangGan ? "Đang gán..." : "Gán CS cho các đơn đã chọn"}
          </button>
          <button onClick={() => setSelected(new Set())} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            Bỏ chọn
          </button>
        </div>
      )}

      {/* Mobile: cards */}
      <div className="flex flex-col gap-3 sm:hidden">
        {filtered.map((row) => (
          <Link
            key={row.id}
            href={`/don-hang/${row.id}`}
            className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="mb-1 flex items-center justify-between">
              <span className="font-semibold text-slate-900">{row.so_don_hang}</span>
              <StatusBadge status={row.trang_thai} />
            </div>
            <p className="text-sm text-slate-600">{customerName(row)}</p>
            <p className="mt-1 text-xs text-slate-400">
              {row.loai_don_hang} · {cargoSummary(row)} · {row.ngay_len_don}
            </p>
            <div className="mt-2 flex gap-2 text-xs">
              <span className={row.ops_xac_nhan ? "text-green-600" : "text-slate-400"}>
                {row.ops_xac_nhan ? "✓" : "○"} OPS
              </span>
              <span className={row.cs_xac_nhan ? "text-green-600" : "text-slate-400"}>
                {row.cs_xac_nhan ? "✓" : "○"} CS
              </span>
            </div>
          </Link>
        ))}
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-400">Chưa có đơn hàng nào.</p>
        )}
      </div>

      {/* Desktop: table */}
      <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white sm:block">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              {canBulkAssign && <th className="px-2 py-3"></th>}
              <th className="sticky left-0 z-10 bg-slate-50 px-4 py-3 font-medium">Số đơn</th>
              <th className="sticky left-[112px] z-10 bg-slate-50 px-4 py-3 font-medium">Khách hàng</th>
              <th className="px-4 py-3 font-medium">Loại</th>
              <th className="px-4 py-3 font-medium">Hàng hóa</th>
              <th className="px-4 py-3 font-medium">Ngày lên đơn</th>
              <th className="px-4 py-3 font-medium">OPS</th>
              <th className="px-4 py-3 font-medium">CS</th>
              <th className="px-4 py-3 font-medium">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr
                key={row.id}
                className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
                onClick={() => router.push(`/don-hang/${row.id}`)}
              >
                {canBulkAssign && (
                  <td className="px-2 py-3" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.has(row.id)} onChange={() => toggleChon(row.id)} />
                  </td>
                )}
                <td className="sticky left-0 z-10 bg-white px-4 py-3 font-medium text-blue-600">{row.so_don_hang}</td>
                <td className="sticky left-[112px] z-10 bg-white px-4 py-3 text-slate-800">{customerName(row)}</td>
                <td className="px-4 py-3 text-slate-800">{row.loai_don_hang ?? "—"}</td>
                <td className="px-4 py-3 text-slate-800">{cargoSummary(row)}</td>
                <td className="px-4 py-3 text-slate-800">{row.ngay_len_don}</td>
                <td className="px-4 py-3">{row.ops_xac_nhan ? "✓" : "—"}</td>
                <td className="px-4 py-3">{row.cs_xac_nhan ? "✓" : "—"}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={row.trang_thai} />
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={canBulkAssign ? 9 : 8} className="px-4 py-8 text-center text-slate-400">
                  Chưa có đơn hàng nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
