import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import HopDongView from "@/components/khach-hang/HopDongView";

export default async function HopDongPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const allowed = user && ["Sale", "Chứng từ", "Kế toán", "Giám đốc"].includes(user.phong_ban);
  if (!allowed) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10 text-center">
        <p className="text-slate-600">Bạn không có quyền truy cập mục này.</p>
      </div>
    );
  }

  const [{ data: rows }, { data: khachHangList }, { data: dinhKemRows }] = await Promise.all([
    supabase
      .from("hop_dong_khach_hang")
      .select("*, khach_hang:khach_hang_id(ten_day_du, ten_viet_tat)")
      .order("created_at", { ascending: false }),
    supabase.from("khach_hang").select("id, ten_day_du, ten_viet_tat").eq("dang_hoat_dong", true).order("ten_day_du"),
    supabase.from("dinh_kem").select("*").not("hop_dong_id", "is", null).order("thoi_gian_upload", { ascending: false }),
  ]);

  const canEdit = user?.phong_ban === "Chứng từ" || user?.phong_ban === "Kế toán";
  const canDelete = user?.phong_ban === "Kế toán";

  return (
    <HopDongView
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initialRows={(rows ?? []) as any[]}
      khachHangList={khachHangList ?? []}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dinhKemRows={(dinhKemRows ?? []) as any[]}
      canEdit={canEdit}
      canDelete={canDelete}
      currentUserId={user?.id}
    />
  );
}
