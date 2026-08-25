import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import HoaDonView from "@/components/khach-hang/HoaDonView";

export default async function HoaDonPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const allowed = user && ["Sale", "Chứng từ", "Kế toán", "Giám đốc"].includes(user.phong_ban);
  if (!allowed) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10 text-center">
        <p className="text-slate-600">Bạn không có quyền truy cập mục này.</p>
      </div>
    );
  }

  const [{ data: rows }, { data: khachHangList }, { data: donHangList }, { data: lienKetAll }, { data: dinhKemRows }] =
    await Promise.all([
      supabase
        .from("hoa_don_xuat")
        .select("*, khach_hang:khach_hang_id(ten_day_du, ten_viet_tat)")
        .order("ngay_xuat", { ascending: false }),
      supabase.from("khach_hang").select("id, ten_day_du, ten_viet_tat").eq("dang_hoat_dong", true).order("ten_day_du"),
      supabase.from("don_hang").select("id, so_don_hang, khach_hang_id").order("created_at", { ascending: false }).limit(500),
      supabase.from("hoa_don_don_hang").select("hoa_don_id, don_hang_id"),
      supabase.from("dinh_kem").select("*").not("hoa_don_id", "is", null).order("thoi_gian_upload", { ascending: false }),
    ]);

  const hoaDonIds = (rows ?? []).map((r) => r.id);
  const [{ data: chiPhiRows }, { data: phuThuRows }] =
    hoaDonIds.length > 0
      ? await Promise.all([
          supabase
            .from("phat_sinh_chi_phi")
            .select("id, hoa_don_id, don_hang_id, chi_ho, gia_von_buy, gia_ban_sell, vat_percent, don_hang:don_hang_id(so_don_hang), loai_chi_phi:loai_chi_phi_id(ten)")
            .in("hoa_don_id", hoaDonIds),
          supabase
            .from("phu_thu")
            .select("id, hoa_don_id, don_hang_id, loai_phu_thu, thanh_tien, don_hang:don_hang_id(so_don_hang)")
            .in("hoa_don_id", hoaDonIds),
        ])
      : [{ data: [] }, { data: [] }];

  const canEdit = user?.phong_ban === "Chứng từ" || user?.phong_ban === "Kế toán";
  const canDelete = user?.phong_ban === "Kế toán";

  return (
    <HoaDonView
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initialRows={(rows ?? []) as any[]}
      khachHangList={khachHangList ?? []}
      donHangList={donHangList ?? []}
      lienKetAll={lienKetAll ?? []}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dinhKemRows={(dinhKemRows ?? []) as any[]}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      chiPhiRows={(chiPhiRows ?? []) as any[]}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      phuThuRows={(phuThuRows ?? []) as any[]}
      canEdit={canEdit}
      canDelete={canDelete}
      currentUserId={user?.id}
    />
  );
}
