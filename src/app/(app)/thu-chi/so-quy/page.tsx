import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import SoQuyView from "@/components/thu-chi/SoQuyView";

export default async function SoQuyPage() {
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

  const { data: rows } = await supabase.from("so_quy").select("*").order("ngay", { ascending: false });

  // Rieng giao dich xuat phat tu Tam ung & Giai chi: lay them thong tin doi
  // tuong de hien ngay trong bang, khong bat Ke toan phai doan qua "Noi dung".
  // nguon_bang/nguon_id la lien ket kieu "polymorphic", khong phai FK that
  // trong Postgres nen phai truy van rieng roi ghep tay.
  const tamUngIds = (rows ?? []).filter((r) => r.nguon_bang === "tam_ung_giai_chi").map((r) => r.nguon_id);
  const { data: tamUngDetails } =
    tamUngIds.length > 0
      ? await supabase
          .from("tam_ung_giai_chi")
          .select("id, loai, doi_tuong, nhan_vien:nhan_vien_id(ho_ten), ten_tai_xe, khach_hang:khach_hang_id(ten_day_du)")
          .in("id", tamUngIds)
      : { data: [] };

  const tamUngDetailMap: Record<string, string> = {};
  for (const r of tamUngDetails ?? []) {
    const nv = Array.isArray(r.nhan_vien) ? r.nhan_vien[0] : r.nhan_vien;
    const kh = Array.isArray(r.khach_hang) ? r.khach_hang[0] : r.khach_hang;
    const ten = r.doi_tuong === "Tài xế" ? r.ten_tai_xe : r.doi_tuong === "Khách hàng" ? kh?.ten_day_du : nv?.ho_ten;
    tamUngDetailMap[r.id] = `${r.loai} · ${ten ?? "—"}`;
  }

  // Don hang lien quan: chi phat_sinh_chi_phi/don_thue_ngoai/hoa_don_dau_vao
  // co cot don_hang_id — lay them de hien "Chi cho don hang nao" tren So quy
  // (kieu polymorphic join, giong tam_ung_giai_chi o tren, vi nguon_bang/
  // nguon_id khong phai FK that trong Postgres).
  const pscIds = (rows ?? []).filter((r) => r.nguon_bang === "phat_sinh_chi_phi").map((r) => r.nguon_id);
  const dtnIds = (rows ?? []).filter((r) => r.nguon_bang === "don_thue_ngoai").map((r) => r.nguon_id);
  const hddvIds = (rows ?? []).filter((r) => r.nguon_bang === "hoa_don_dau_vao").map((r) => r.nguon_id);
  const pqtIds = (rows ?? []).filter((r) => r.nguon_bang === "phieu_quyet_toan_tam_ung").map((r) => r.nguon_id);

  const [{ data: pscRows }, { data: dtnRows }, { data: hddvRows }, { data: pqtChiTietRows }] = await Promise.all([
    pscIds.length > 0
      ? supabase.from("phat_sinh_chi_phi").select("id, don_hang_id, don_hang:don_hang_id(so_don_hang)").in("id", pscIds)
      : Promise.resolve({ data: [] }),
    dtnIds.length > 0
      ? supabase.from("don_thue_ngoai").select("id, don_hang_id, don_hang:don_hang_id(so_don_hang)").in("id", dtnIds)
      : Promise.resolve({ data: [] }),
    hddvIds.length > 0
      ? supabase.from("hoa_don_dau_vao").select("id, don_hang_id, tai_khoan_no, don_hang:don_hang_id(so_don_hang)").in("id", hddvIds)
      : Promise.resolve({ data: [] }),
    // 1 phieu quyet toan co the gom nhieu don hang (phieu_quyet_toan_chi_tiet) —
    // khac voi cac nguon con lai (chi 1 don_hang_id/dong), nen truy van rieng.
    pqtIds.length > 0
      ? supabase.from("phieu_quyet_toan_chi_tiet").select("phieu_id, don_hang:don_hang_id(id, so_don_hang)").in("phieu_id", pqtIds)
      : Promise.resolve({ data: [] }),
  ]);

  const donHangMap: Record<string, { id: string; so_don_hang: string }> = {};
  const tkNoMap: Record<string, string> = {};
  type LienKetDonHang = { id: string; don_hang_id: string | null; don_hang: { so_don_hang: string } | { so_don_hang: string }[] | null; tai_khoan_no?: string | null };
  for (const r of [...(pscRows ?? []), ...(dtnRows ?? []), ...(hddvRows ?? [])] as LienKetDonHang[]) {
    const dh = Array.isArray(r.don_hang) ? r.don_hang[0] : r.don_hang;
    if (r.don_hang_id && dh) donHangMap[r.id] = { id: r.don_hang_id, so_don_hang: dh.so_don_hang };
    if (r.tai_khoan_no) tkNoMap[r.id] = r.tai_khoan_no;
  }
  type PhieuChiTiet = { phieu_id: string; don_hang: { id: string; so_don_hang: string } | { id: string; so_don_hang: string }[] | null };
  const pqtDonHangList: Record<string, { id: string; so_don_hang: string }[]> = {};
  for (const r of (pqtChiTietRows ?? []) as PhieuChiTiet[]) {
    const dh = Array.isArray(r.don_hang) ? r.don_hang[0] : r.don_hang;
    if (!dh) continue;
    (pqtDonHangList[r.phieu_id] ??= []).push(dh);
  }
  for (const [phieuId, list] of Object.entries(pqtDonHangList)) {
    if (list.length === 0) continue;
    const nhan = list.length > 1 ? `${list[0].so_don_hang} (+${list.length - 1} đơn khác)` : list[0].so_don_hang;
    donHangMap[phieuId] = { id: list[0].id, so_don_hang: nhan };
  }

  return (
    <SoQuyView
      initialRows={rows ?? []}
      tamUngDetailMap={tamUngDetailMap}
      donHangMap={donHangMap}
      tkNoMap={tkNoMap}
      canEdit={user.phong_ban === "Kế toán"}
    />
  );
}
