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
    { data: chamCongList },
    { data: ngayLeList },
  ] = await Promise.all([
    supabase
      .from("nhan_vien")
      .select("id, ho_ten, dang_lam_viec, so_nguoi_phu_thuoc, loai_nhan_su, ngay_vao_lam, phong_ban:phong_ban_id(ten)")
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
    supabase.from("cham_cong").select("nhan_vien_id, ngay, trang_thai"),
    supabase.from("lich_nghi_le").select("ngay").eq("dang_hoat_dong", true),
  ]);

  // luong_co_dinh/muc_dong_bhxh khong con select truc tiep tu bang nhan_vien
  // duoc nua (xem migration 0039) — lay qua RPC rieng, chi Ke toan/Giam doc
  // hoac chinh chu moi goi duoc.
  const { data: luongList } = await supabase.rpc("luong_cua_nhan_vien");
  const luongMap = new Map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((luongList ?? []) as any[]).map((l) => [l.id as string, l as { luong_co_dinh: number | null; muc_dong_bhxh: number | null }])
  );
  const nhanVienDayDu = (nhanVienList ?? []).map((nv) => ({
    ...nv,
    luong_co_dinh: luongMap.get(nv.id)?.luong_co_dinh ?? null,
    muc_dong_bhxh: luongMap.get(nv.id)?.muc_dong_bhxh ?? null,
  }));

  return (
    <BangLuongView
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      nhanVienList={nhanVienDayDu as any[]}
      chiPhiGiaoNhanList={chiPhiGiaoNhanList ?? []}
      donHangList={donHangList ?? []}
      chiPhiList={chiPhiList ?? []}
      phuThuList={phuThuList ?? []}
      thueNgoaiList={thueNgoaiList ?? []}
      dinhPhiList={dinhPhiList ?? []}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      luongDaTraList={(luongDaTraList ?? []) as any[]}
      chamCongList={chamCongList ?? []}
      ngayLeList={(ngayLeList ?? []).map((r) => r.ngay)}
    />
  );
}
