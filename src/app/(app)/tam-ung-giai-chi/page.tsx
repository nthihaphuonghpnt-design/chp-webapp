import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import TamUngGiaiChiView from "@/components/tam-ung-giai-chi/TamUngGiaiChiView";

export default async function TamUngGiaiChiPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const [{ data: rows }, { data: nhanVienList }, { data: donHangList }, { data: chiPhiRows }] = await Promise.all([
    supabase
      .from("tam_ung_giai_chi")
      .select("*, nhan_vien:nhan_vien_id(ho_ten), nguoi_de_nghi:nguoi_de_nghi_id(ho_ten), don_hang:don_hang_id(so_don_hang)")
      .order("ngay_thuc_hien", { ascending: false }),
    supabase.from("nhan_vien").select("id, ho_ten").eq("dang_lam_viec", true).order("ho_ten"),
    supabase.from("don_hang").select("id, so_don_hang").order("created_at", { ascending: false }).limit(300),
    supabase
      .from("phat_sinh_chi_phi")
      .select("nguoi_nhap_id, don_hang_id, gia_von_buy")
      .not("don_hang_id", "is", null)
      .not("nguoi_nhap_id", "is", null)
      .neq("trang_thai", "Từ chối"),
  ]);

  // Gop tong da chi theo tung nguoi + tung lo hang, de doi chieu voi tam ung
  const daChiTheoNguoiVaLo: Record<string, number> = {};
  for (const r of chiPhiRows ?? []) {
    const key = `${r.nguoi_nhap_id}:${r.don_hang_id}`;
    daChiTheoNguoiVaLo[key] = (daChiTheoNguoiVaLo[key] ?? 0) + (r.gia_von_buy ?? 0);
  }

  return (
    <TamUngGiaiChiView
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initialRows={(rows ?? []) as any[]}
      nhanVienList={nhanVienList ?? []}
      donHangList={donHangList ?? []}
      daChiTheoNguoiVaLo={daChiTheoNguoiVaLo}
      currentUserId={user?.id}
      currentPhongBan={user?.phong_ban ?? ""}
    />
  );
}
