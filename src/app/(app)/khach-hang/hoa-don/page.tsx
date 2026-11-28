import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import HoaDonView from "@/components/khach-hang/HoaDonView";
import { ghepGiaBanChiPhi } from "@/lib/giaBan";

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
      supabase
        .from("khach_hang")
        .select("id, ten_day_du, ten_viet_tat, ma_so_thue, nhom_khach_hang_id, nhom_khach_hang:nhom_khach_hang_id(ten)")
        .eq("dang_hoat_dong", true)
        .order("ten_day_du"),
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
            .select("id, hoa_don_id, don_hang_id, chi_ho, so_tien_da_chi, vat_percent, don_hang:don_hang_id(so_don_hang), loai_chi_phi:loai_chi_phi_id(ten)")
            .in("hoa_don_id", hoaDonIds),
          supabase
            .from("phu_thu")
            .select("id, hoa_don_id, don_hang_id, loai_phu_thu, thanh_tien, don_hang:don_hang_id(so_don_hang)")
            .in("hoa_don_id", hoaDonIds),
        ])
      : [{ data: [] }, { data: [] }];

  const canEdit = user?.phong_ban === "Chứng từ" || user?.phong_ban === "Kế toán";
  const canHuy = user?.phong_ban === "Kế toán" || user?.phong_ban === "Giám đốc";

  // gia_ban_sell khong con doc truc tiep duoc tu 0061 — ghep lai qua RPC rieng.
  const chiPhiRowsDayDu = await ghepGiaBanChiPhi(supabase, chiPhiRows ?? []);

  // P1 muc 5c/5d (2026-11-26): rieng cho "Rà soát hóa đơn ↔ lô bất thường" —
  // can TOAN BO chi phi/phu thu cua tung lo (khong loc theo hoa_don_id, khac
  // voi chiPhiRows/phuThuRows o tren vi nhieu lo co hoa don gan qua wizard
  // khong set hoa_don_id tung dong) de so sanh dung tong gia ban/chi ho thuc
  // te cua lo voi tong tien hoa don dang gan.
  const donHangIdsCanRaSoat = Array.from(new Set((lienKetAll ?? []).map((l) => l.don_hang_id)));
  const [{ data: chiPhiRaSoatRaw }, { data: phuThuRaSoat }] =
    donHangIdsCanRaSoat.length > 0
      ? await Promise.all([
          supabase
            .from("phat_sinh_chi_phi")
            .select("id, don_hang_id, chi_ho, so_tien_da_chi, vat_percent")
            .in("don_hang_id", donHangIdsCanRaSoat)
            .neq("trang_thai", "Từ chối"),
          supabase.from("phu_thu").select("don_hang_id, thanh_tien").in("don_hang_id", donHangIdsCanRaSoat),
        ])
      : [{ data: [] }, { data: [] }];
  // gia_ban_sell cung khong doc truc tiep duoc o day (xem comment chiPhiRowsDayDu).
  const chiPhiRaSoat = await ghepGiaBanChiPhi(supabase, chiPhiRaSoatRaw ?? []);

  // Truy van rieng de trang van chay khi chua chay migration 0129 (loi -> null).
  // nhat_ky_thao_tac chi Ke toan/Giam doc doc duoc (RLS) — phong khac nhan ve rong.
  const [{ data: nhomList }, { data: donDichVuRieng }, { data: nhatKyHuy }] = await Promise.all([
    supabase.from("nhom_khach_hang").select("*").order("ten"),
    supabase.from("don_hang").select("id, khach_hang_dich_vu_id").not("khach_hang_dich_vu_id", "is", null),
    supabase
      .from("nhat_ky_thao_tac")
      .select("dong_id, ly_do, created_at, nguoi:nguoi_thuc_hien_id(ho_ten)")
      .eq("bang", "hoa_don_xuat")
      .eq("hanh_dong", "huy_hoa_don_xuat"),
  ]);
  const dichVuRiengMap = new Map((donDichVuRieng ?? []).map((d) => [d.id, d.khach_hang_dich_vu_id as string]));

  // C2 (27/11/2026): ngay_xuat la ngay PHAT HANH hoa don, khong phai ngay
  // THU TIEN thuc te — hien dung ngay (tu so_quy, qua 2 duong: thu truc tiep
  // tung hoa don (nguon_bang='hoa_don_xuat') hoac thu gop nhieu hoa don ghi
  // tay (thu_gop_chi_tiet, xem migration 0134)) de tranh hieu nham kieu
  // "Da thu du ngay 05/11" trong khi tien thuc nhan vao mot ngay khac han.
  const [{ data: soQuyThuTrucTiep }, { data: thuGopChiTietCuaHd }] = await Promise.all([
    hoaDonIds.length > 0
      ? supabase.from("so_quy").select("nguon_id, ngay").eq("nguon_bang", "hoa_don_xuat").in("nguon_id", hoaDonIds)
      : Promise.resolve({ data: [] }),
    hoaDonIds.length > 0
      ? supabase.from("thu_gop_chi_tiet").select("hoa_don_id, so_quy:so_quy_id(ngay)").in("hoa_don_id", hoaDonIds)
      : Promise.resolve({ data: [] }),
  ]);
  const ngayThuMap: Record<string, string> = {};
  const capNhatNgay = (hoaDonId: string, ngay: string | undefined | null) => {
    if (!ngay) return;
    if (!ngayThuMap[hoaDonId] || ngay > ngayThuMap[hoaDonId]) ngayThuMap[hoaDonId] = ngay;
  };
  for (const r of soQuyThuTrucTiep ?? []) capNhatNgay(r.nguon_id, r.ngay);
  for (const r of thuGopChiTietCuaHd ?? []) {
    const sq = Array.isArray(r.so_quy) ? r.so_quy[0] : r.so_quy;
    capNhatNgay(r.hoa_don_id, sq?.ngay);
  }

  return (
    <HoaDonView
      ngayThuMap={ngayThuMap}
      nhomList={nhomList ?? []}
      thongTinHuy={(nhatKyHuy ?? []).map((n) => {
        const nguoi = (Array.isArray(n.nguoi) ? n.nguoi[0] : n.nguoi) as { ho_ten: string } | null;
        return { hoa_don_id: n.dong_id as string, ly_do: n.ly_do as string | null, luc: n.created_at as string, nguoi: nguoi?.ho_ten ?? null };
      })}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initialRows={(rows ?? []) as any[]}
      khachHangList={(khachHangList ?? []).map((k) => {
        const nhom = Array.isArray(k.nhom_khach_hang) ? k.nhom_khach_hang[0] : k.nhom_khach_hang;
        return { id: k.id, ten_day_du: k.ten_day_du, ten_viet_tat: k.ten_viet_tat, ma_so_thue: k.ma_so_thue, nhom_khach_hang_id: k.nhom_khach_hang_id, nhom_khach_hang_ten: nhom?.ten ?? null };
      })}
      donHangList={(donHangList ?? []).map((d) => ({ ...d, khach_hang_dich_vu_id: dichVuRiengMap.get(d.id) ?? null }))}
      lienKetAll={lienKetAll ?? []}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dinhKemRows={(dinhKemRows ?? []) as any[]}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      chiPhiRows={chiPhiRowsDayDu as any[]}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      phuThuRows={(phuThuRows ?? []) as any[]}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      chiPhiRaSoat={chiPhiRaSoat as any[]}
      phuThuRaSoat={phuThuRaSoat ?? []}
      canEdit={canEdit}
      canHuy={canHuy}
      currentUserId={user?.id}
    />
  );
}
