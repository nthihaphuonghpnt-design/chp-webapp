import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { canManageDonHang } from "@/lib/permissions";
import DonHangList from "@/components/don-hang/DonHangList";
import DonHangExcelTools from "@/components/don-hang/DonHangExcelTools";

export default async function DonHangPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const [{ data: phongBanSale }, { data: phongBanHienTruong }, { data: phongBanChungTu }] = await Promise.all([
    supabase.from("phong_ban").select("id").eq("ten", "Sale").single(),
    supabase.from("phong_ban").select("id").eq("ten", "Hiện trường").single(),
    supabase.from("phong_ban").select("id").eq("ten", "Chứng từ").single(),
  ]);

  const [
    { data: rows },
    { data: khachHang },
    { data: loaiContainer },
    { data: hangHoa },
    { data: diaDiem },
    { data: saleList },
    { data: hienTruongList },
    { data: chungTuList },
  ] = await Promise.all([
    supabase
      .from("don_hang")
      .select(
        "*, khach_hang:khach_hang_id(ten_day_du, ten_viet_tat), hang_hoa:hang_hoa_id(ten), noi_lay:noi_lay_cont_hang_id(ten), noi_dong:noi_dong_giao_id(ten), noi_ha:noi_ha_tra_rong_id(ten), don_hang_container(so_cont), sale_phu_trach:sale_phu_trach_id(ho_ten), hien_truong_phu_trach:hien_truong_phu_trach_id(ho_ten), chung_tu_phu_trach:chung_tu_phu_trach_id(ho_ten)"
      )
      .order("created_at", { ascending: false }),
    supabase.from("khach_hang").select("id, ten_day_du, ten_viet_tat").eq("dang_hoat_dong", true).order("ten_day_du"),
    supabase.from("loai_container").select("id, ten").eq("dang_hoat_dong", true).order("ten"),
    supabase.from("hang_hoa").select("id, ten").eq("dang_hoat_dong", true).order("ten"),
    supabase.from("dia_diem").select("id, ten").eq("dang_hoat_dong", true).order("ten"),
    supabase
      .from("nhan_vien")
      .select("id, ten:ho_ten")
      .eq("phong_ban_id", phongBanSale?.id ?? "")
      .eq("dang_lam_viec", true)
      .order("ho_ten"),
    supabase
      .from("nhan_vien")
      .select("id, ten:ho_ten")
      .eq("phong_ban_id", phongBanHienTruong?.id ?? "")
      .eq("dang_lam_viec", true)
      .order("ho_ten"),
    supabase
      .from("nhan_vien")
      .select("id, ten:ho_ten")
      .eq("phong_ban_id", phongBanChungTu?.id ?? "")
      .eq("dang_lam_viec", true)
      .order("ho_ten"),
  ]);

  const canCreate = canManageDonHang(user?.phong_ban);

  const exportRows = (rows ?? []).map((r) => {
    const one = <T,>(v: T | T[] | null) => (Array.isArray(v) ? v[0] : v);
    const kh = one(r.khach_hang) as { ten_day_du: string; ten_viet_tat: string | null } | null;
    const containers = (r.don_hang_container ?? []) as { so_cont: string | null }[];
    return {
      ...r,
      khach_hang_label: kh?.ten_viet_tat || kh?.ten_day_du || "",
      hang_hoa_label: one(r.hang_hoa as unknown as { ten: string }[] | { ten: string } | null)?.ten ?? "",
      noi_lay_cont_hang_label: one(r.noi_lay as unknown as { ten: string }[] | { ten: string } | null)?.ten ?? "",
      noi_dong_giao_label: one(r.noi_dong as unknown as { ten: string }[] | { ten: string } | null)?.ten ?? "",
      noi_ha_tra_rong_label: one(r.noi_ha as unknown as { ten: string }[] | { ten: string } | null)?.ten ?? "",
      so_cont_label: containers.map((c) => c.so_cont).filter(Boolean).join(", "),
      sale_phu_trach_label: one(r.sale_phu_trach as unknown as { ho_ten: string }[] | { ho_ten: string } | null)?.ho_ten ?? "",
      hien_truong_phu_trach_label: one(r.hien_truong_phu_trach as unknown as { ho_ten: string }[] | { ho_ten: string } | null)?.ho_ten ?? "",
      chung_tu_phu_trach_label: one(r.chung_tu_phu_trach as unknown as { ho_ten: string }[] | { ho_ten: string } | null)?.ho_ten ?? "",
    };
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Đơn hàng</h1>
        {canCreate && (
          <Link
            href="/don-hang/moi"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm active:bg-blue-700"
          >
            + Nhập lô hàng mới
          </Link>
        )}
      </div>

      <DonHangExcelTools
        rows={exportRows}
        masterData={{
          khachHang: khachHang ?? [],
          loaiContainer: loaiContainer ?? [],
          hangHoa: hangHoa ?? [],
          diaDiem: diaDiem ?? [],
          saleList: saleList ?? [],
          hienTruongList: hienTruongList ?? [],
          chungTuList: chungTuList ?? [],
        }}
        canImport={canCreate}
      />

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <DonHangList initialRows={(rows ?? []) as any[]} />
    </div>
  );
}
