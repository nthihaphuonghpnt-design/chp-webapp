import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import TamUngGiaiChiView from "@/components/tam-ung-giai-chi/TamUngGiaiChiView";
import TamUngGiaiChiBulkExcelTools from "@/components/tam-ung-giai-chi/TamUngGiaiChiBulkExcelTools";
import { taiHetDong } from "@/lib/taiHetDong";

export default async function TamUngGiaiChiPage({
  searchParams,
}: {
  searchParams: Promise<{ don_hang_id?: string }>;
}) {
  const { don_hang_id: autoProposeDonHangId } = await searchParams;
  const supabase = await createClient();
  const user = await getCurrentUser();

  const [{ data: rows }, { data: nhanVienList }, { data: donHangList }, { data: khachHangList }, { data: chiPhiRows }, { data: soQuyRows }, { data: chotList }] = await Promise.all([
    supabase
      .from("tam_ung_giai_chi")
      .select("*, nhan_vien:nhan_vien_id(ho_ten), nguoi_de_nghi:nguoi_de_nghi_id(ho_ten), don_hang:don_hang_id(so_don_hang), khach_hang:khach_hang_id(ten_day_du)")
      .order("ngay_thuc_hien", { ascending: false }),
    supabase.from("nhan_vien").select("id, ho_ten").eq("dang_lam_viec", true).order("ho_ten"),
    supabase.from("don_hang").select("id, so_don_hang").order("created_at", { ascending: false }).limit(300),
    supabase
      .from("khach_hang")
      .select("id, ten_day_du, nhom_khach_hang:nhom_khach_hang_id(ten)")
      .eq("dang_hoat_dong", true)
      .order("ten_day_du"),
    taiHetDong(() =>
      supabase
        .from("phat_sinh_chi_phi")
        .select("nguoi_nhap_id, don_hang_id, so_tien_da_chi")
        .not("don_hang_id", "is", null)
        .not("nguoi_nhap_id", "is", null)
        .neq("trang_thai", "Từ chối")
        .order("id"),
    ),
    // nguon_bang/nguon_id la lien ket kieu "polymorphic" (khong phai FK that
    // trong Postgres) nen phai truy van rieng roi ghep tay o phia component,
    // khong dung duoc cach Supabase tu join qua quan he FK.
    supabase.from("so_quy").select("id, loai_so, loai_giao_dich, so_tien, ngay, nguon_id").eq("nguon_bang", "tam_ung_giai_chi"),
    // P1 muc 7: moc "chot so du dau ky" rieng cho tung nhan vien, xem giai
    // thich trong TamUngGiaiChiView (tinhTienDauKy).
    supabase
      .from("chot_so_du_dau_ky")
      .select("id, nhan_vien_id, ngay_ap_dung, so_du, ghi_chu")
      .eq("doi_tuong_loai", "tam_ung_nhan_vien")
      .order("ngay_ap_dung", { ascending: false }),
  ]);

  // P1 muc 6 (2026-11-26): canh bao TRUOC khi duyet 1 khoan Tam ung (se tao
  // dong Chi trong So quy) neu lam so du am — can TOAN BO so_quy (khong loc
  // theo nguon_bang nhu soQuyRows o tren) + moc chot gan nhat de tinh dung
  // so du HIEN TAI theo tung loai so, giong het logic trong SoQuyView.
  const homNay = new Date().toISOString().slice(0, 10);
  const [{ data: soQuyToanBo }, { data: chotSoQuy }] = await Promise.all([
    supabase.from("so_quy").select("loai_so, loai_giao_dich, so_tien, ngay"),
    supabase
      .from("chot_so_du_dau_ky")
      .select("doi_tuong_loai, ngay_ap_dung, so_du")
      .in("doi_tuong_loai", ["so_quy_tien_mat", "so_quy_tai_khoan_cong_ty"])
      .order("ngay_ap_dung", { ascending: false }),
  ]);
  const tonHienTaiMap: Record<string, number> = {};
  for (const loaiSo of ["Tiền mặt", "Tài khoản công ty"] as const) {
    const loaiChot = loaiSo === "Tiền mặt" ? "so_quy_tien_mat" : "so_quy_tai_khoan_cong_ty";
    const chot = (chotSoQuy ?? []).find((c) => c.doi_tuong_loai === loaiChot && c.ngay_ap_dung <= homNay);
    const rowsCuaSo = (soQuyToanBo ?? []).filter((r) => r.loai_so === loaiSo && (!chot || r.ngay >= chot.ngay_ap_dung));
    tonHienTaiMap[loaiSo] = (chot?.so_du ?? 0) + rowsCuaSo.reduce((s, r) => s + (r.loai_giao_dich === "Thu" ? r.so_tien : -r.so_tien), 0);
  }

  // Gop tong da chi theo tung nguoi + tung lo hang, de doi chieu voi tam ung
  const daChiTheoNguoiVaLo: Record<string, number> = {};
  for (const r of chiPhiRows ?? []) {
    const key = `${r.nguoi_nhap_id}:${r.don_hang_id}`;
    daChiTheoNguoiVaLo[key] = (daChiTheoNguoiVaLo[key] ?? 0) + (r.so_tien_da_chi ?? 0);
  }

  const laKeToanHoacGiamDoc = user?.phong_ban === "Kế toán" || user?.phong_ban === "Giám đốc";

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6">
      <TamUngGiaiChiBulkExcelTools
        donHangList={donHangList ?? []}
        nhanVienList={nhanVienList ?? []}
        canImport={laKeToanHoacGiamDoc}
      />
      <TamUngGiaiChiView
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        initialRows={(rows ?? []) as any[]}
        nhanVienList={nhanVienList ?? []}
        donHangList={donHangList ?? []}
        khachHangList={(khachHangList ?? []).map((k) => {
          const nhom = Array.isArray(k.nhom_khach_hang) ? k.nhom_khach_hang[0] : k.nhom_khach_hang;
          return { id: k.id, ten_day_du: k.ten_day_du, nhom_khach_hang_ten: nhom?.ten ?? null };
        })}
        daChiTheoNguoiVaLo={daChiTheoNguoiVaLo}
        soQuyList={soQuyRows ?? []}
        chotList={chotList ?? []}
        tonHienTaiMap={tonHienTaiMap}
        currentUserId={user?.id}
        currentPhongBan={user?.phong_ban ?? ""}
        autoProposeDonHangId={autoProposeDonHangId}
      />
    </div>
  );
}
