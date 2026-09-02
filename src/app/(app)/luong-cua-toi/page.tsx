import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import LuongCuaToiView from "@/components/luong/LuongCuaToiView";

export default async function LuongCuaToiPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10 text-center">
        <p className="text-slate-600">Không xác định được tài khoản.</p>
      </div>
    );
  }

  const [{ data: nvCoBan }, { data: chiPhiGiaoNhanList }, { data: donHangCuaToi }, { data: dinhPhiList }, { data: soLoRaw }, { data: luongDaTraList }] =
    await Promise.all([
      supabase.from("nhan_vien").select("id, ho_ten, so_nguoi_phu_thuoc, phong_ban:phong_ban_id(ten)").eq("id", user.id).single(),
      supabase.from("chi_phi_giao_nhan").select("nhan_vien_id, thanh_tien, created_at").eq("nhan_vien_id", user.id),
      supabase.from("don_hang").select("id, ngay_len_don, sale_phu_trach_id").eq("sale_phu_trach_id", user.id),
      supabase.from("dinh_phi_thang").select("thang_nam, so_tien"),
      supabase.from("don_hang").select("ngay_len_don"),
      supabase.from("luong_da_tra").select("*").eq("nhan_vien_id", user.id).order("thang_luong", { ascending: false }),
    ]);

  // luong_co_dinh/muc_dong_bhxh khong con select truc tiep tu bang nhan_vien
  // duoc nua (xem migration 0039) — lay qua RPC rieng cho chinh chu.
  const { data: luongRieng } = await supabase.rpc("luong_cua_nhan_vien", { p_nhan_vien_id: user.id });
  const luongCuaToi = (luongRieng as { luong_co_dinh: number | null; muc_dong_bhxh: number | null }[] | null)?.[0];
  const nv = nvCoBan ? { ...nvCoBan, luong_co_dinh: luongCuaToi?.luong_co_dinh ?? null, muc_dong_bhxh: luongCuaToi?.muc_dong_bhxh ?? null } : null;

  const donHangIds = (donHangCuaToi ?? []).map((d) => d.id);
  const [{ data: chiPhiList }, { data: phuThuList }, { data: thueNgoaiList }] =
    donHangIds.length > 0
      ? await Promise.all([
          supabase.from("phat_sinh_chi_phi").select("don_hang_id, gia_von_buy, gia_ban_sell, noi_bo, trang_thai").in("don_hang_id", donHangIds),
          supabase.from("phu_thu").select("don_hang_id, thanh_tien").in("don_hang_id", donHangIds),
          supabase.from("don_thue_ngoai").select("don_hang_id, gia_von_buy, gia_ban_sell").in("don_hang_id", donHangIds),
        ])
      : [{ data: [] }, { data: [] }, { data: [] }];

  return (
    <LuongCuaToiView
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      nv={nv as any}
      chiPhiGiaoNhanList={chiPhiGiaoNhanList ?? []}
      donHangCuaToi={donHangCuaToi ?? []}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      chiPhiList={(chiPhiList ?? []) as any[]}
      phuThuList={phuThuList ?? []}
      thueNgoaiList={thueNgoaiList ?? []}
      dinhPhiList={dinhPhiList ?? []}
      soLoTheoThangRaw={soLoRaw ?? []}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      luongDaTraList={(luongDaTraList ?? []) as any[]}
    />
  );
}
