import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import VatBaoCaoView from "@/components/bao-cao/VatBaoCaoView";

export default async function BaoCaoVatPage() {
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

  const [{ data: hoaDonXuatRaw }, { data: hoaDonDauVaoRaw }] = await Promise.all([
    supabase
      .from("hoa_don_xuat")
      .select("id, so_hoa_don, ngay_xuat, trang_thai, loai_hoa_don, ky_ke_khai, tien_vat, khach_hang:khach_hang_id(ten_day_du, ten_viet_tat)")
      .order("ngay_xuat", { ascending: false }),
    supabase
      .from("hoa_don_dau_vao")
      .select("id, so_hoa_don, ngay_hoa_don, ky_ke_khai, dieu_kien_khau_tru, chi_ho, tien_thue_gtgt, nha_cung_cap:nha_cung_cap_id(ten)")
      .order("ngay_hoa_don", { ascending: false }),
  ]);

  function one<T>(v: T | T[] | null): T | null {
    return Array.isArray(v) ? (v[0] ?? null) : v;
  }

  const hoaDonXuatList = (hoaDonXuatRaw ?? []).map((h) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const kh = one(h.khach_hang as any);
    return { ...h, khach_hang_ten: kh?.ten_viet_tat || kh?.ten_day_du || "—" };
  });
  const hoaDonDauVaoList = (hoaDonDauVaoRaw ?? []).map((h) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nc = one(h.nha_cung_cap as any);
    return { ...h, nha_cung_cap_ten: nc?.ten || "—" };
  });

  return (
    <Suspense>
      <VatBaoCaoView
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        hoaDonXuatList={hoaDonXuatList as any[]}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        hoaDonDauVaoList={hoaDonDauVaoList as any[]}
      />
    </Suspense>
  );
}
