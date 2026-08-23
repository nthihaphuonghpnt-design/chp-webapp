import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import DonHangForm from "@/components/don-hang/DonHangForm";

export default async function DonHangMoiPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (user?.phong_ban !== "Sale") {
    return (
      <div className="mx-auto max-w-xl px-4 py-10 text-center">
        <p className="text-slate-600">Chỉ Sale mới được tạo đơn hàng mới.</p>
      </div>
    );
  }

  const [{ data: khachHang }, { data: loaiContainer }, { data: hangHoa }, { data: diaDiem }] = await Promise.all([
    supabase.from("khach_hang").select("id, ten_day_du, ten_viet_tat").eq("dang_hoat_dong", true).order("ten_day_du"),
    supabase.from("loai_container").select("id, ten").eq("dang_hoat_dong", true).order("ten"),
    supabase.from("hang_hoa").select("id, ten").eq("dang_hoat_dong", true).order("ten"),
    supabase.from("dia_diem").select("id, ten").eq("dang_hoat_dong", true).order("ten"),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="mb-4 text-xl font-semibold text-slate-900">Nhập lô hàng mới</h1>
      <DonHangForm
        masterData={{
          khachHang: khachHang ?? [],
          loaiContainer: loaiContainer ?? [],
          hangHoa: hangHoa ?? [],
          diaDiem: diaDiem ?? [],
        }}
      />
    </div>
  );
}
