import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { canManageDonHang } from "@/lib/permissions";
import DonHangList from "@/components/don-hang/DonHangList";
import DonHangExcelTools from "@/components/don-hang/DonHangExcelTools";

export default async function DonHangPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const [
    { data: rows },
    { data: khachHang },
    { data: loaiContainer },
    { data: hangHoa },
    { data: diaDiem },
  ] = await Promise.all([
    supabase
      .from("don_hang")
      .select(
        "*, khach_hang:khach_hang_id(ten_day_du, ten_viet_tat), loai_cont_hang:loai_cont_hang_id(ten), hang_hoa:hang_hoa_id(ten), noi_lay:noi_lay_cont_hang_id(ten), noi_dong:noi_dong_giao_id(ten), noi_ha:noi_ha_tra_rong_id(ten)"
      )
      .order("created_at", { ascending: false }),
    supabase.from("khach_hang").select("id, ten_day_du, ten_viet_tat").eq("dang_hoat_dong", true).order("ten_day_du"),
    supabase.from("loai_container").select("id, ten").eq("dang_hoat_dong", true).order("ten"),
    supabase.from("hang_hoa").select("id, ten").eq("dang_hoat_dong", true).order("ten"),
    supabase.from("dia_diem").select("id, ten").eq("dang_hoat_dong", true).order("ten"),
  ]);

  const canCreate = canManageDonHang(user?.phong_ban);

  const exportRows = (rows ?? []).map((r) => {
    const one = <T,>(v: T | T[] | null) => (Array.isArray(v) ? v[0] : v);
    const kh = one(r.khach_hang) as { ten_day_du: string; ten_viet_tat: string | null } | null;
    return {
      ...r,
      khach_hang_label: kh?.ten_viet_tat || kh?.ten_day_du || "",
      loai_cont_hang_label: one(r.loai_cont_hang as unknown as { ten: string }[] | { ten: string } | null)?.ten ?? "",
      hang_hoa_label: one(r.hang_hoa as unknown as { ten: string }[] | { ten: string } | null)?.ten ?? "",
      noi_lay_cont_hang_label: one(r.noi_lay as unknown as { ten: string }[] | { ten: string } | null)?.ten ?? "",
      noi_dong_giao_label: one(r.noi_dong as unknown as { ten: string }[] | { ten: string } | null)?.ten ?? "",
      noi_ha_tra_rong_label: one(r.noi_ha as unknown as { ten: string }[] | { ten: string } | null)?.ten ?? "",
    };
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Đơn hàng</h1>
        {canCreate && (
          <Link
            href="/don-hang/moi"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm active:bg-blue-700"
          >
            + Nhập lô hàng mới
          </Link>
        )}
      </div>

      <DonHangExcelTools
        rows={exportRows}
        masterData={{
          khachHang: khachHang ?? [],
          loaiContainer: loaiContainer ?? [],
          hangHoa: hangHoa ?? [],
          diaDiem: diaDiem ?? [],
        }}
        canImport={canCreate}
      />

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <DonHangList initialRows={(rows ?? []) as any[]} />
    </div>
  );
}
