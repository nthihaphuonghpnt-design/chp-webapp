"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import StatusBadge from "./StatusBadge";

interface Row {
  id: string;
  so_don_hang: string;
  loai_don_hang: string | null;
  so_cont: string | null;
  ngay_len_don: string;
  ngay_van_chuyen: string | null;
  trang_thai: string;
  ops_xac_nhan: boolean;
  cs_xac_nhan: boolean;
  khach_hang: { ten_day_du: string; ten_viet_tat: string | null } | { ten_day_du: string; ten_viet_tat: string | null }[] | null;
}

const STATUSES = ["Tiếp nhận", "Làm thủ tục", "Thông quan", "Giao hàng", "Hoàn tất"];

function customerName(row: Row) {
  const kh = Array.isArray(row.khach_hang) ? row.khach_hang[0] : row.khach_hang;
  if (!kh) return "—";
  return kh.ten_viet_tat || kh.ten_day_du;
}

export default function DonHangList({ initialRows }: { initialRows: Row[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const filtered = initialRows.filter((r) => {
    if (statusFilter && r.trang_thai !== statusFilter) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      r.so_don_hang.toLowerCase().includes(q) ||
      customerName(r).toLowerCase().includes(q) ||
      (r.so_cont ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm theo số đơn, khách hàng, số cont..."
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">Tất cả trạng thái</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

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
              {row.loai_don_hang} · {row.so_cont || "chưa có số cont"} · {row.ngay_len_don}
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
              <th className="px-4 py-3 font-medium">Số đơn</th>
              <th className="px-4 py-3 font-medium">Khách hàng</th>
              <th className="px-4 py-3 font-medium">Loại</th>
              <th className="px-4 py-3 font-medium">Số cont</th>
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
                <td className="px-4 py-3 font-medium text-blue-600">{row.so_don_hang}</td>
                <td className="px-4 py-3 text-slate-800">{customerName(row)}</td>
                <td className="px-4 py-3 text-slate-800">{row.loai_don_hang ?? "—"}</td>
                <td className="px-4 py-3 text-slate-800">{row.so_cont ?? "—"}</td>
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
                <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
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
