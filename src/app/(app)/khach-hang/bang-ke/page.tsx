import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import BangKeView from "@/components/khach-hang/BangKeView";

export default async function BangKePage({
  searchParams,
}: {
  searchParams: Promise<{ khach_hang?: string }>;
}) {
  const { khach_hang } = await searchParams;
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (user?.phong_ban !== "Kế toán") {
    return (
      <div className="mx-auto max-w-xl px-4 py-10 text-center">
        <p className="text-slate-600">Chỉ Kế toán mới dùng được Bảng kê.</p>
      </div>
    );
  }

  const { data: khachHangRaw } = await supabase
    .from("khach_hang")
    .select("id, ten_day_du, ten_viet_tat, nhom_khach_hang:nhom_khach_hang_id(ten)")
    .eq("dang_hoat_dong", true)
    .order("ten_day_du");
  const khachHangList = (khachHangRaw ?? []).map((k) => {
    const nhom = Array.isArray(k.nhom_khach_hang) ? k.nhom_khach_hang[0] : k.nhom_khach_hang;
    return { id: k.id, ten_day_du: k.ten_day_du, ten_viet_tat: k.ten_viet_tat, nhom_khach_hang_ten: nhom?.ten ?? null };
  });

  let donHangIds: string[] = [];
  let donHangList: unknown[] = [];
  let chiPhiRows: unknown[] = [];
  let phuThuRows: unknown[] = [];
  let khachHangChiTiet: unknown = null;

  if (khach_hang) {
    const [{ data: donHang }, { data: khCT }] = await Promise.all([
      supabase
        .from("don_hang")
        .select(
          "id, so_don_hang, ngay_len_don, ngay_van_chuyen, loai_don_hang, loai_kich_co, dvt, so_luong, so_bl_bk, so_lo, hang_hoa:hang_hoa_id(ten)"
        )
        .eq("khach_hang_id", khach_hang)
        .order("ngay_len_don", { ascending: false }),
      supabase
        .from("khach_hang")
        .select("id, ten_day_du, ten_viet_tat, dia_chi, ma_so_thue, nguoi_lien_he, dien_thoai, email")
        .eq("id", khach_hang)
        .single(),
    ]);
    khachHangChiTiet = khCT ?? null;
    donHangIds = (donHang ?? []).map((d) => d.id);

    let bienSoMap: Record<string, string[]> = {};
    let toKhaiMap: Record<string, string[]> = {};
    let contMap: Record<string, string[]> = {};
    if (donHangIds.length > 0) {
      const [{ data: cp }, { data: pt }, { data: ctvc }, { data: tk }, { data: cont }] = await Promise.all([
        supabase
          .from("phat_sinh_chi_phi")
          .select("*, don_hang:don_hang_id(so_don_hang), loai_chi_phi:loai_chi_phi_id(ten)")
          .in("don_hang_id", donHangIds)
          .is("hoa_don_id", null)
          .neq("trang_thai", "Từ chối")
          .order("ngay_phat_sinh"),
        supabase
          .from("phu_thu")
          .select("*, don_hang:don_hang_id(so_don_hang)")
          .in("don_hang_id", donHangIds)
          .is("hoa_don_id", null)
          .order("created_at"),
        supabase
          .from("chi_tiet_van_chuyen")
          .select("don_hang_id, so_xe")
          .in("don_hang_id", donHangIds)
          .not("so_xe", "is", null),
        supabase
          .from("to_khai_hai_quan")
          .select("don_hang_id, so_to_khai")
          .in("don_hang_id", donHangIds)
          .not("so_to_khai", "is", null),
        supabase
          .from("don_hang_container")
          .select("don_hang_id, so_cont")
          .in("don_hang_id", donHangIds)
          .not("so_cont", "is", null),
      ]);
      chiPhiRows = cp ?? [];
      phuThuRows = pt ?? [];
      bienSoMap = {};
      for (const r of ctvc ?? []) {
        if (!r.so_xe) continue;
        (bienSoMap[r.don_hang_id] ??= []).push(r.so_xe);
      }
      toKhaiMap = {};
      for (const r of tk ?? []) {
        if (!r.so_to_khai) continue;
        (toKhaiMap[r.don_hang_id] ??= []).push(r.so_to_khai);
      }
      contMap = {};
      for (const r of cont ?? []) {
        if (!r.so_cont) continue;
        (contMap[r.don_hang_id] ??= []).push(r.so_cont);
      }
    }
    donHangList = (donHang ?? []).map((d) => ({
      ...d,
      bien_so: bienSoMap[d.id] ?? [],
      so_to_khai: toKhaiMap[d.id] ?? [],
      so_cont: contMap[d.id] ?? [],
    }));
  }

  return (
    <BangKeView
      // remount khi đổi khách hàng để state nội bộ (danh sách chi phí đã chọn, filter đơn hàng...) reset đúng
      key={khach_hang ?? "none"}
      khachHangList={khachHangList ?? []}
      khachHangIdChon={khach_hang ?? ""}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      khachHangChiTiet={khachHangChiTiet as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      donHangList={donHangList as any[]}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      chiPhiRows={chiPhiRows as any[]}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      phuThuRows={phuThuRows as any[]}
    />
  );
}
