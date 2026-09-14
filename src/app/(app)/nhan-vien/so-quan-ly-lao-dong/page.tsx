import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import SoQuanLyLaoDongView, { type DongLaoDong } from "@/components/nhan-vien/SoQuanLyLaoDongView";

export default async function SoQuanLyLaoDongPage() {
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

  const namHienTai = new Date().getFullYear();
  const dauNam = `${namHienTai}-01-01`;
  const cuoiNam = `${namHienTai}-12-31`;

  const [
    { data: nhanVienList, error: loi1 },
    { data: hopDongList, error: loi2 },
    { data: luongList, error: loi3 },
    { data: chamCongList, error: loi4 },
  ] = await Promise.all([
    supabase
      .from("nhan_vien")
      .select(
        "id, ho_ten, gioi_tinh, ngay_sinh, quoc_tich, noi_cu_tru, so_cccd, trinh_do_chuyen_mon, ngay_vao_lam, dang_lam_viec, ngay_nghi_viec, ly_do_nghi_viec, phong_ban:phong_ban_id(ten)"
      )
      .order("ho_ten"),
    supabase.from("hop_dong_nhan_vien").select("nhan_vien_id, loai_hop_dong, created_at").order("created_at", { ascending: false }),
    supabase.rpc("luong_cua_nhan_vien"),
    supabase.from("cham_cong").select("nhan_vien_id, trang_thai").gte("ngay", dauNam).lte("ngay", cuoiNam).in("trang_thai", ["Nghỉ phép", "Nghỉ không phép", "Nghỉ khác"]),
  ]);

  if (loi1 || loi2 || loi3 || loi4) {
    return (
      <pre className="mx-auto max-w-3xl overflow-x-auto whitespace-pre-wrap px-4 py-10 text-xs text-red-600">
        DEBUG LOI TRUY VAN:{"\n"}
        loi1 (nhan_vien): {JSON.stringify(loi1, null, 2)}
        {"\n"}loi2 (hop_dong_nhan_vien): {JSON.stringify(loi2, null, 2)}
        {"\n"}loi3 (rpc luong_cua_nhan_vien): {JSON.stringify(loi3, null, 2)}
        {"\n"}loi4 (cham_cong): {JSON.stringify(loi4, null, 2)}
      </pre>
    );
  }

  const hopDongMoiNhatMap = new Map<string, string | null>();
  for (const h of hopDongList ?? []) {
    if (!hopDongMoiNhatMap.has(h.nhan_vien_id)) hopDongMoiNhatMap.set(h.nhan_vien_id, h.loai_hop_dong);
  }

  const luongMap = new Map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((luongList ?? []) as any[]).map((l) => [l.id as string, l as { luong_co_dinh: number | null; muc_dong_bhxh: number | null }])
  );

  const ngayNghiMap = new Map<string, number>();
  for (const c of chamCongList ?? []) {
    ngayNghiMap.set(c.nhan_vien_id, (ngayNghiMap.get(c.nhan_vien_id) ?? 0) + 1);
  }

  const rows: DongLaoDong[] = (nhanVienList ?? []).map((nv) => {
    const phongBan = Array.isArray(nv.phong_ban) ? nv.phong_ban[0] : nv.phong_ban;
    const luong = luongMap.get(nv.id);
    return {
      id: nv.id,
      ho_ten: nv.ho_ten,
      gioi_tinh: nv.gioi_tinh,
      ngay_sinh: nv.ngay_sinh,
      quoc_tich: nv.quoc_tich,
      noi_cu_tru: nv.noi_cu_tru,
      so_cccd: nv.so_cccd,
      trinh_do_chuyen_mon: nv.trinh_do_chuyen_mon,
      phong_ban: phongBan?.ten ?? "—",
      loai_hop_dong: hopDongMoiNhatMap.get(nv.id) ?? null,
      ngay_vao_lam: nv.ngay_vao_lam,
      co_dong_bhxh: (luong?.muc_dong_bhxh ?? 0) > 0,
      luong_co_dinh: luong?.luong_co_dinh ?? null,
      so_ngay_nghi_trong_nam: ngayNghiMap.get(nv.id) ?? 0,
      dang_lam_viec: nv.dang_lam_viec,
      ngay_nghi_viec: nv.ngay_nghi_viec,
      ly_do_nghi_viec: nv.ly_do_nghi_viec,
    };
  });

  return <SoQuanLyLaoDongView rows={rows} namHienTai={namHienTai} />;
}
