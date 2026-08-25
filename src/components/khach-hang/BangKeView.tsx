"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import SearchableSelect from "@/components/common/SearchableSelect";

interface KhachHang {
  id: string;
  ten_day_du: string;
  ten_viet_tat: string | null;
}
interface ChiPhiRow {
  id: string;
  don_hang_id: string;
  gia_von_buy: number | null;
  gia_ban_sell: number | null;
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
  chiPhiRows: initialChiPhi,
  phuThuRows: initialPhuThu,
}: {
  khachHangList: KhachHang[];
  khachHangIdChon: string;
  chiPhiRows: ChiPhiRow[];
  phuThuRows: PhuThuRow[];
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [chiPhiRows, setChiPhiRows] = useState<ChiPhiRow[]>(initialChiPhi);
  const [phuThuRows] = useState<PhuThuRow[]>(initialPhuThu);
  const [chonChiPhi, setChonChiPhi] = useState<Set<string>>(new Set(initialChiPhi.map((r) => r.id)));
  const [chonPhuThu, setChonPhuThu] = useState<Set<string>>(new Set(initialPhuThu.map((r) => r.id)));
  const [vatPercent, setVatPercent] = useState("");
  const [soHoaDon, setSoHoaDon] = useState("");
  const [dangXuat, setDangXuat] = useState(false);

  const khOptions = khachHangList.map((k) => ({ value: k.id, label: k.ten_viet_tat || k.ten_day_du }));

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
  const tienVat = Math.round((tongTruocThue * (Number(vatPercent) || 0)) / 100);
  const tongCong = tongTruocThue + tienVat + tongChiHo;

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

      <div className="mb-6 w-full sm:w-80">
        <label className="mb-1 block text-sm font-medium text-slate-700">Khách hàng</label>
        <SearchableSelect options={khOptions} value={khachHangIdChon} onChange={chonKhachHang} placeholder="-- Chọn khách hàng --" />
      </div>

      {!khachHangIdChon && <p className="text-sm text-slate-400">Chọn khách hàng để xem bảng kê chi phí chưa xuất hóa đơn.</p>}

      {khachHangIdChon && (
        <>
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
