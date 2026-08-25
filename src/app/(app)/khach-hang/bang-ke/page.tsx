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

  const { data: khachHangList } = await supabase
    .from("khach_hang")
    .select("id, ten_day_du, ten_viet_tat")
    .eq("dang_hoat_dong", true)
    .order("ten_day_du");

  let donHangIds: string[] = [];
  let donHangList: unknown[] = [];
  let chiPhiRows: unknown[] = [];
  let phuThuRows: unknown[] = [];

  if (khach_hang) {
    const { data: donHang } = await supabase
      .from("don_hang")
      .select("id, so_don_hang, ngay_len_don, loai_kich_co, so_luong")
      .eq("khach_hang_id", khach_hang)
      .order("ngay_len_don", { ascending: false });
    donHangList = donHang ?? [];
    donHangIds = (donHang ?? []).map((d) => d.id);

    if (donHangIds.length > 0) {
      const [{ data: cp }, { data: pt }] = await Promise.all([
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
      ]);
      chiPhiRows = cp ?? [];
      phuThuRows = pt ?? [];
    }
  }

  return (
    <BangKeView
      khachHangList={khachHangList ?? []}
      khachHangIdChon={khach_hang ?? ""}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      donHangList={donHangList as any[]}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      chiPhiRows={chiPhiRows as any[]}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      phuThuRows={phuThuRows as any[]}
    />
  );
}
