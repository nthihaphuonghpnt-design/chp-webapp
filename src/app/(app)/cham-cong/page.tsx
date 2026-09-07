import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { homNayVN, laNhanVienVanPhong } from "@/lib/chamCong";
import ChamCongCuaToiView from "@/components/cham-cong/ChamCongCuaToiView";
import ChamCongAdminView from "@/components/cham-cong/ChamCongAdminView";
import DonNghiPhepView from "@/components/cham-cong/DonNghiPhepView";
import DonNghiPhepAdminView from "@/components/cham-cong/DonNghiPhepAdminView";

export default async function ChamCongPage({
  searchParams,
}: {
  searchParams: Promise<{ thang?: string }>;
}) {
  const { thang } = await searchParams;
  const supabase = await createClient();
  const user = await getCurrentUser();

  const now = new Date();
  const thangNam = thang && /^\d{4}-\d{2}$/.test(thang) ? thang : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [thangY, thangM] = thangNam.split("-").map(Number);
  const thangBatDau = `${thangNam}-01`;
  const thangKetThuc = new Date(Date.UTC(thangY, thangM, 1)).toISOString().slice(0, 10);
  const homNay = homNayVN();

  const isAdmin = user && ["Kế toán", "Giám đốc"].includes(user.phong_ban);
  const isVanPhong = laNhanVienVanPhong(user?.phong_ban);

  const [{ data: homNayRow }, { data: choMinhThang }, { data: ngayLeList }, { data: donCuaToi }, adminData] = await Promise.all([
    user && isVanPhong
      ? supabase.from("cham_cong").select("*").eq("nhan_vien_id", user.id).eq("ngay", homNay).maybeSingle()
      : Promise.resolve({ data: null }),
    user && isVanPhong
      ? supabase.from("cham_cong").select("*").eq("nhan_vien_id", user.id).gte("ngay", thangBatDau).lt("ngay", thangKetThuc)
      : Promise.resolve({ data: [] }),
    supabase.from("lich_nghi_le").select("ngay").eq("dang_hoat_dong", true),
    user && isVanPhong
      ? supabase.from("don_xin_nghi_phep").select("*").eq("nhan_vien_id", user.id).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    isAdmin
      ? Promise.all([
          supabase
            .from("nhan_vien")
            .select("id, ho_ten, loai_nhan_su, phong_ban:phong_ban_id(ten)")
            .eq("dang_lam_viec", true)
            .order("ho_ten"),
          supabase
            .from("cham_cong")
            .select("*, nguoi_dieu_chinh:nguoi_dieu_chinh_id(ho_ten)")
            .gte("ngay", thangBatDau)
            .lt("ngay", thangKetThuc),
          supabase
            .from("don_xin_nghi_phep")
            .select("*, nhan_vien:nhan_vien_id(ho_ten)")
            .order("created_at", { ascending: false })
            .limit(200),
        ])
      : Promise.resolve(null),
  ]);

  const ngayLe = (ngayLeList ?? []).map((r) => r.ngay as string);

  // Cham cong chi danh cho NVVP — loc bo Hien truong/Sale khoi danh sach
  // Ke toan/Giam doc quan ly, khong can theo doi cham cong cho ho.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nhanVienVanPhongList = ((adminData?.[0].data ?? []) as any[]).filter((nv) => {
    const pb = Array.isArray(nv.phong_ban) ? nv.phong_ban[0] : nv.phong_ban;
    return laNhanVienVanPhong(pb?.ten);
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="mb-4 text-xl font-semibold text-slate-900">Chấm công</h1>

      {isVanPhong ? (
        <>
          <ChamCongCuaToiView
            nhanVienId={user?.id}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            homNayRow={homNayRow as any}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            initialRowsThang={(choMinhThang ?? []) as any[]}
            thangNam={thangNam}
            ngayLeList={ngayLe}
          />

          <DonNghiPhepView
            nhanVienId={user?.id}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            initialRows={(donCuaToi ?? []) as any[]}
          />
        </>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
          Chấm công không áp dụng cho phòng ban của bạn.
        </div>
      )}

      {isAdmin && adminData && (
        <>
          <ChamCongAdminView
            thangNam={thangNam}
            nhanVienList={nhanVienVanPhongList}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            initialRows={(adminData[1].data ?? []) as any[]}
            ngayLeList={ngayLe}
            currentNhanVienId={user?.id}
          />
          <DonNghiPhepAdminView
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            initialRows={(adminData[2].data ?? []) as any[]}
            currentNhanVienId={user?.id}
          />
        </>
      )}
    </div>
  );
}
