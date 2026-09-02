import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import BangGiaView from "@/components/khach-hang/BangGiaView";

export default async function BangGiaKhachHangPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const [{ data }, { data: khachHangList }, { data: loaiChiPhiList }, { data: hangHoaList }] = await Promise.all([
    supabase.from("bang_gia_khach_hang").select("*").order("created_at", { ascending: false }),
    supabase
      .from("khach_hang")
      .select("id, ten_day_du, ten_viet_tat, nhom_khach_hang:nhom_khach_hang_id(ten)")
      .eq("dang_hoat_dong", true)
      .order("ten_day_du"),
    supabase.from("loai_chi_phi").select("id, ten").eq("dang_hoat_dong", true).order("ten"),
    supabase.from("hang_hoa").select("id, ten").eq("dang_hoat_dong", true).order("ten"),
  ]);

  const canEdit = user?.phong_ban === "Sale" || user?.phong_ban === "Kế toán" || user?.phong_ban === "Giám đốc";

  return (
    <BangGiaView
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initialRows={(data ?? []) as any[]}
      khachHangList={(khachHangList ?? []).map((k) => {
        const nhom = Array.isArray(k.nhom_khach_hang) ? k.nhom_khach_hang[0] : k.nhom_khach_hang;
        return { id: k.id, ten_day_du: k.ten_day_du, ten_viet_tat: k.ten_viet_tat, nhom_khach_hang_ten: nhom?.ten ?? null };
      })}
      loaiChiPhiList={loaiChiPhiList ?? []}
      hangHoaList={hangHoaList ?? []}
      canEdit={canEdit}
    />
  );
}
