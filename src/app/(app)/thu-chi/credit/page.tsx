import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import CreditView from "@/components/thu-chi/CreditView";

export default async function CreditPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const allowed = user && (user.phong_ban === "Chứng từ" || user.phong_ban === "Kế toán" || user.phong_ban === "Giám đốc");
  if (!allowed) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10 text-center">
        <p className="text-slate-600">Bạn không có quyền truy cập mục này.</p>
      </div>
    );
  }

  const [{ data: soDuRaw }, { data: giaoDichRaw }, { data: khachHangRaw }, { data: ncRaw }, { data: hoaDonXuatMoRaw }, { data: hoaDonDauVaoMoRaw }] = await Promise.all([
    supabase.from("so_du_credit").select("id, doi_tuong, khach_hang_id, nha_cung_cap_id, so_du, updated_at").gt("so_du", 0),
    supabase
      .from("credit_giao_dich")
      .select(
        "id, doi_tuong, khach_hang_id, nha_cung_cap_id, loai, so_tien, so_du_sau, phuong_thuc, ly_do, created_at, nguoi_thuc_hien:nguoi_thuc_hien_id(ho_ten), hoa_don_xuat:hoa_don_xuat_id(so_hoa_don), hoa_don_dau_vao:hoa_don_dau_vao_id(so_hoa_don)",
      )
      .order("created_at", { ascending: false })
      .limit(500),
    supabase.from("khach_hang").select("id, ten_day_du, ten_viet_tat"),
    supabase.from("nha_cung_cap").select("id, ten"),
    supabase
      .from("hoa_don_xuat")
      .select("id, khach_hang_id, so_hoa_don, tong_tien, so_tien_da_thu")
      .eq("trang_thai", "Đã phát hành")
      .neq("trang_thai_thanh_toan", "Đã thu đủ"),
    supabase
      .from("hoa_don_dau_vao")
      .select("id, nha_cung_cap_id, so_hoa_don, tong_tien_thanh_toan, so_tien_da_thanh_toan")
      .eq("dang_hoat_dong", true)
      .neq("tinh_trang_thanh_toan", "Đã đủ"),
  ]);

  return (
    <CreditView
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      soDuList={(soDuRaw ?? []) as any[]}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      giaoDichList={(giaoDichRaw ?? []) as any[]}
      khachHangList={khachHangRaw ?? []}
      ncList={ncRaw ?? []}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      hoaDonXuatMoList={(hoaDonXuatMoRaw ?? []) as any[]}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      hoaDonDauVaoMoList={(hoaDonDauVaoMoRaw ?? []) as any[]}
      phongBan={user.phong_ban}
    />
  );
}
