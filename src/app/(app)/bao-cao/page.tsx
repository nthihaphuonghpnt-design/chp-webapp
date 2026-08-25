import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import BaoCaoView from "@/components/bao-cao/BaoCaoView";

export default async function BaoCaoPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const allowed = user && ["Sale", "Kế toán", "Giám đốc"].includes(user.phong_ban);
  if (!allowed) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10 text-center">
        <p className="text-slate-600">Bạn không có quyền truy cập mục này.</p>
      </div>
    );
  }

  const isKeToanOrGiamDoc = user.phong_ban === "Kế toán" || user.phong_ban === "Giám đốc";

  const [
    { data: donHangList },
    { data: chiPhiList },
    { data: phuThuList },
    { data: thueNgoaiList },
    { data: hoaDonList },
    { data: hoaDonDonHangList },
    { data: dinhPhiList },
    { data: nhaCungCapList },
    { data: doiTacList },
    { data: loaiChiPhiList },
    { data: khachHangList },
    { data: nhanVienList },
  ] = await Promise.all([
    supabase.from("don_hang").select("id, so_don_hang, ngay_len_don, trang_thai, sale_phu_trach_id, khach_hang_id"),
    isKeToanOrGiamDoc
      ? supabase
          .from("phat_sinh_chi_phi")
          .select("don_hang_id, loai_chi_phi_id, nha_cung_cap_id, doi_tac_thue_ngoai_id, gia_von_buy, gia_ban_sell, chi_ho, noi_bo, ngay_phat_sinh, tinh_trang_thanh_toan, so_tien_da_thanh_toan, trang_thai")
      : Promise.resolve({ data: [] }),
    supabase.from("phu_thu").select("don_hang_id, thanh_tien"),
    isKeToanOrGiamDoc
      ? supabase.from("don_thue_ngoai").select("don_hang_id, doi_tac_thue_ngoai_id, gia_von_buy, gia_ban_sell, so_tien_da_thanh_toan, ngay_thue")
      : Promise.resolve({ data: [] }),
    isKeToanOrGiamDoc
      ? supabase.from("hoa_don_xuat").select("id, khach_hang_id, so_hoa_don, ngay_xuat, tong_tien, tien_chi_ho, so_tien_da_thu, trang_thai_thanh_toan")
      : Promise.resolve({ data: [] }),
    isKeToanOrGiamDoc ? supabase.from("hoa_don_don_hang").select("hoa_don_id, don_hang_id") : Promise.resolve({ data: [] }),
    supabase.from("dinh_phi_thang").select("thang_nam, so_tien"),
    supabase.from("nha_cung_cap").select("id, ten"),
    supabase.from("doi_tac_thue_ngoai").select("id, ten"),
    supabase.from("loai_chi_phi").select("id, ten"),
    supabase.from("khach_hang").select("id, ten_day_du, ten_viet_tat"),
    supabase.from("nhan_vien").select("id, ho_ten"),
  ]);

  return (
    <BaoCaoView
      donHangList={donHangList ?? []}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      chiPhiList={(chiPhiList ?? []) as any[]}
      phuThuList={phuThuList ?? []}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      thueNgoaiList={(thueNgoaiList ?? []) as any[]}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      hoaDonList={(hoaDonList ?? []) as any[]}
      hoaDonDonHangList={hoaDonDonHangList ?? []}
      dinhPhiList={dinhPhiList ?? []}
      nhaCungCapList={nhaCungCapList ?? []}
      doiTacList={doiTacList ?? []}
      loaiChiPhiList={loaiChiPhiList ?? []}
      khachHangList={khachHangList ?? []}
      nhanVienList={nhanVienList ?? []}
      currentUserId={user.id}
      currentPhongBan={user.phong_ban}
    />
  );
}
