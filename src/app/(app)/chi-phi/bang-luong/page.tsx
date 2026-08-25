import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import BangLuongView from "@/components/chi-phi/BangLuongView";

export default async function BangLuongPage() {
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

  const [
    { data: nhanVienList },
    { data: chiPhiGiaoNhanList },
    { data: donHangList },
    { data: chiPhiList },
    { data: phuThuList },
    { data: thueNgoaiList },
    { data: dinhPhiList },
    { data: luongDaTraList },
  ] = await Promise.all([
    supabase
      .from("nhan_vien")
      .select("id, ho_ten, luong_co_dinh, muc_dong_bhxh, dang_lam_viec, phong_ban:phong_ban_id(ten)")
      .eq("dang_lam_viec", true)
      .order("ho_ten"),
    supabase.from("chi_phi_giao_nhan").select("nhan_vien_id, thanh_tien, created_at"),
    supabase.from("don_hang").select("id, ngay_len_don, sale_phu_trach_id"),
    supabase
      .from("phat_sinh_chi_phi")
      .select("don_hang_id, gia_von_buy, gia_ban_sell, noi_bo, trang_thai"),
    supabase.from("phu_thu").select("don_hang_id, thanh_tien"),
    supabase.from("don_thue_ngoai").select("don_hang_id, gia_von_buy, gia_ban_sell"),
    supabase.from("dinh_phi_thang").select("thang_nam, so_tien"),
    supabase.from("luong_da_tra").select("*"),
  ]);

  return (
    <BangLuongView
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      nhanVienList={(nhanVienList ?? []) as any[]}
      chiPhiGiaoNhanList={chiPhiGiaoNhanList ?? []}
      donHangList={donHangList ?? []}
      chiPhiList={chiPhiList ?? []}
      phuThuList={phuThuList ?? []}
      thueNgoaiList={thueNgoaiList ?? []}
      dinhPhiList={dinhPhiList ?? []}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      luongDaTraList={(luongDaTraList ?? []) as any[]}
    />
  );
}
