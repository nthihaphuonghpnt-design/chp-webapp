import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import PhieuQuyetToanView from "@/components/tam-ung-giai-chi/PhieuQuyetToanView";

export default async function PhieuQuyetToanPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  const isKeToanOrGiamDoc = user?.phong_ban === "Kế toán" || user?.phong_ban === "Giám đốc";

  const [{ data: phieuList }, { data: nhanVienList }] = await Promise.all([
    supabase
      .from("phieu_quyet_toan_tam_ung")
      .select(
        "*, nhan_vien:nhan_vien_id(ho_ten), nguoi_duyet:nguoi_duyet_id(ho_ten), chi_tiet:phieu_quyet_toan_chi_tiet(don_hang:don_hang_id(id, so_don_hang))"
      )
      .order("created_at", { ascending: false }),
    isKeToanOrGiamDoc
      ? supabase.from("nhan_vien").select("id, ho_ten").eq("dang_lam_viec", true).order("ho_ten")
      : Promise.resolve({ data: [] as { id: string; ho_ten: string }[] }),
  ]);

  return (
    <PhieuQuyetToanView
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initialPhieuList={(phieuList ?? []) as any[]}
      nhanVienList={nhanVienList ?? []}
      currentUserId={user?.id}
      isKeToanOrGiamDoc={isKeToanOrGiamDoc}
    />
  );
}
