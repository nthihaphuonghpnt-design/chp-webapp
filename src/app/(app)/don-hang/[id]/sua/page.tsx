import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { canManageDonHang } from "@/lib/permissions";
import DonHangForm from "@/components/don-hang/DonHangForm";
import type { DonHang } from "@/types/database";

export default async function DonHangSuaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!canManageDonHang(user?.phong_ban)) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10 text-center">
        <p className="text-slate-600">Bạn không có quyền sửa đơn hàng.</p>
      </div>
    );
  }

  const { data: phongBanSale } = await supabase.from("phong_ban").select("id").eq("ten", "Sale").single();

  const [{ data: order }, { data: khachHang }, { data: loaiContainer }, { data: hangHoa }, { data: diaDiem }, { data: saleList }] =
    await Promise.all([
      supabase.from("don_hang").select("*").eq("id", id).single(),
      supabase.from("khach_hang").select("id, ten_day_du, ten_viet_tat").eq("dang_hoat_dong", true).order("ten_day_du"),
      supabase.from("loai_container").select("id, ten").eq("dang_hoat_dong", true).order("ten"),
      supabase.from("hang_hoa").select("id, ten").eq("dang_hoat_dong", true).order("ten"),
      supabase.from("dia_diem").select("id, ten, ma_dia_diem, dia_chi, khu_vuc").eq("dang_hoat_dong", true).order("ten"),
      supabase
        .from("nhan_vien")
        .select("id, ten:ho_ten")
        .eq("phong_ban_id", phongBanSale?.id ?? "")
        .eq("dang_lam_viec", true)
        .order("ho_ten"),
    ]);

  if (!order) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="mb-4 text-xl font-semibold text-slate-900">Sửa đơn hàng {order.so_don_hang}</h1>
      <DonHangForm
        initial={order as DonHang}
        masterData={{
          khachHang: khachHang ?? [],
          loaiContainer: loaiContainer ?? [],
          hangHoa: hangHoa ?? [],
          diaDiem: diaDiem ?? [],
          saleList: saleList ?? [],
        }}
        currentUserId={user?.id}
        currentPhongBan={user?.phong_ban}
      />
    </div>
  );
}
