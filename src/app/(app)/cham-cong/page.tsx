import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import ChamCongCuaToiView from "@/components/cham-cong/ChamCongCuaToiView";
import ChamCongAdminView from "@/components/cham-cong/ChamCongAdminView";

export default async function ChamCongPage({
  searchParams,
}: {
  searchParams: Promise<{ thang?: string }>;
}) {
  const { thang } = await searchParams;
  const supabase = await createClient();
  const user = await getCurrentUser();

  const now = new Date();
  const thangNam = thang && /^\d{4}-\d{2}$/.test(thang) ? thang : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [thangY, thangM] = thangNam.split("-").map(Number);
  const thangBatDau = `${thangNam}-01`;
  const thangKetThuc = new Date(Date.UTC(thangY, thangM, 1)).toISOString().slice(0, 10);

  const ngay30TruocIso = new Date(now.getTime() - 32 * 86400000).toISOString().slice(0, 10);

  const isAdmin = user && ["Kế toán", "Giám đốc"].includes(user.phong_ban);

  const [{ data: choMinh }, adminData] = await Promise.all([
    user
      ? supabase.from("cham_cong").select("*").eq("nhan_vien_id", user.id).gte("ngay", ngay30TruocIso).order("ngay", { ascending: false })
      : Promise.resolve({ data: [] }),
    isAdmin
      ? Promise.all([
          supabase.from("nhan_vien").select("id, ho_ten, loai_nhan_su").eq("dang_lam_viec", true).order("ho_ten"),
          supabase
            .from("cham_cong")
            .select("*, nguoi_dieu_chinh:nguoi_dieu_chinh_id(ho_ten)")
            .gte("ngay", thangBatDau)
            .lt("ngay", thangKetThuc),
        ])
      : Promise.resolve(null),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="mb-4 text-xl font-semibold text-slate-900">Chấm công</h1>

      <ChamCongCuaToiView
        nhanVienId={user?.id}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        initialRows={(choMinh ?? []) as any[]}
      />

      {isAdmin && adminData && (
        <ChamCongAdminView
          thangNam={thangNam}
          nhanVienList={adminData[0].data ?? []}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          initialRows={(adminData[1].data ?? []) as any[]}
          currentNhanVienId={user?.id}
        />
      )}
    </div>
  );
}
