import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import TamUngGiaiChiView from "@/components/tam-ung-giai-chi/TamUngGiaiChiView";

export default async function TamUngGiaiChiPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const [{ data: rows }, { data: nhanVienList }] = await Promise.all([
    supabase
      .from("tam_ung_giai_chi")
      .select("*, nhan_vien:nhan_vien_id(ho_ten), nguoi_de_nghi:nguoi_de_nghi_id(ho_ten)")
      .order("ngay_thuc_hien", { ascending: false }),
    supabase.from("nhan_vien").select("id, ho_ten").eq("dang_lam_viec", true).order("ho_ten"),
  ]);

  return (
    <TamUngGiaiChiView
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initialRows={(rows ?? []) as any[]}
      nhanVienList={nhanVienList ?? []}
      currentUserId={user?.id}
      currentPhongBan={user?.phong_ban ?? ""}
    />
  );
}
