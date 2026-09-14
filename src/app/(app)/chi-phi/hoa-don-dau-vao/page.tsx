import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import HoaDonDauVaoView, { type HoaDonDauVao } from "@/components/chi-phi/HoaDonDauVaoView";

export default async function HoaDonDauVaoPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const allowed = user && (user.phong_ban === "Kế toán" || user.phong_ban === "Giám đốc");
  if (!allowed) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10 text-center">
        <p className="text-slate-600">Bạn không có quyền truy cập mục này.</p>
      </div>
    );
  }

  const [{ data: rows }, { data: nhaCungCapList }] = await Promise.all([
    supabase.from("hoa_don_dau_vao").select("*").order("ngay_hoa_don", { ascending: false }),
    supabase.from("nha_cung_cap").select("id, ten, ma_so_thue, dia_chi").order("ten"),
  ]);

  return (
    <div>
      <div className="mx-auto max-w-7xl px-4 pt-4">
        <Link href="/chi-phi/bang-luong" className="text-sm font-medium text-blue-600 underline">
          → Xem Bảng lương (tính lương + BHXH + thuế TNCN từng nhân viên)
        </Link>
      </div>
      <HoaDonDauVaoView
        initialRows={(rows ?? []) as HoaDonDauVao[]}
        nhaCungCapList={nhaCungCapList ?? []}
        canEdit={user.phong_ban === "Kế toán"}
      />
    </div>
  );
}
