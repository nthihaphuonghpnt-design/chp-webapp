import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import LichNhacNhoView from "@/components/lich-nhac-nho/LichNhacNhoView";

export default async function LichNhacNhoPage({
  searchParams,
}: {
  searchParams: Promise<{ thang?: string; phong_ban?: string }>;
}) {
  const { thang, phong_ban } = await searchParams;
  const supabase = await createClient();
  const user = await getCurrentUser();

  const now = new Date();
  const thangNam = thang && /^\d{4}-\d{2}$/.test(thang) ? thang : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [y, m] = thangNam.split("-").map(Number);
  const monthStart = `${thangNam}-01`;
  const monthEnd = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);

  let query = supabase
    .from("lich_nhac_nho")
    .select(
      "*, don_hang:don_hang_id(so_don_hang), nguoi_phu_trach:nguoi_phu_trach_id(ho_ten), phong_ban:phong_ban_id(ten)"
    )
    .gte("ngay_du_kien", monthStart)
    .lt("ngay_du_kien", monthEnd)
    .order("ngay_du_kien");

  if (phong_ban) query = query.eq("phong_ban_id", phong_ban);

  const [{ data: rows }, { data: phongBanList }, { data: nhanVienList }, { data: donHangList }] = await Promise.all([
    query,
    supabase.from("phong_ban").select("id, ten").order("ten"),
    supabase.from("nhan_vien").select("id, ho_ten").eq("dang_lam_viec", true).order("ho_ten"),
    supabase.from("don_hang").select("id, so_don_hang").order("created_at", { ascending: false }).limit(300),
  ]);

  return (
    <LichNhacNhoView
      thangNam={thangNam}
      phongBanFilter={phong_ban ?? ""}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initialRows={(rows ?? []) as any[]}
      phongBanList={phongBanList ?? []}
      nhanVienList={nhanVienList ?? []}
      donHangList={donHangList ?? []}
      currentUserId={user?.id}
    />
  );
}
