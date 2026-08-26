import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import HopDongNhanVienView from "@/components/nhan-vien/HopDongNhanVienView";

export default async function HopDongNhanVienPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const allowed = user && ["Kế toán", "Giám đốc"].includes(user.phong_ban);
  if (!allowed) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10 text-center">
        <p className="text-slate-600">Bạn không có quyền truy cập mục này.</p>
      </div>
    );
  }

  const [{ data: rows }, { data: nhanVienList }, { data: dinhKemRows }] = await Promise.all([
    supabase
      .from("hop_dong_nhan_vien")
      .select("*, nhan_vien:nhan_vien_id(ho_ten)")
      .order("created_at", { ascending: false }),
    supabase.from("nhan_vien").select("id, ho_ten").eq("dang_lam_viec", true).order("ho_ten"),
    supabase.from("dinh_kem").select("*").not("hop_dong_nhan_vien_id", "is", null).order("thoi_gian_upload", { ascending: false }),
  ]);

  const canEdit = user?.phong_ban === "Kế toán";
  const canDelete = user?.phong_ban === "Kế toán";

  return (
    <HopDongNhanVienView
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initialRows={(rows ?? []) as any[]}
      nhanVienList={nhanVienList ?? []}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dinhKemRows={(dinhKemRows ?? []) as any[]}
      canEdit={canEdit}
      canDelete={canDelete}
      currentUserId={user?.id}
    />
  );
}
