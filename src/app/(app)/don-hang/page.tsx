import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import DonHangList from "@/components/don-hang/DonHangList";

export default async function DonHangPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const { data } = await supabase
    .from("don_hang")
    .select("*, khach_hang:khach_hang_id(ten_day_du, ten_viet_tat)")
    .order("created_at", { ascending: false });

  const canCreate = user?.phong_ban === "Sale";

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

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <DonHangList initialRows={(data ?? []) as any[]} />
    </div>
  );
}
