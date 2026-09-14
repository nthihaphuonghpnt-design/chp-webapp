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

  const [{ data: pscRows }, { data: dtnRows }, { data: hddvRows }] = await Promise.all([
    pscIds.length > 0
      ? supabase.from("phat_sinh_chi_phi").select("id, don_hang_id, don_hang:don_hang_id(so_don_hang)").in("id", pscIds)
      : Promise.resolve({ data: [] }),
    dtnIds.length > 0
      ? supabase.from("don_thue_ngoai").select("id, don_hang_id, don_hang:don_hang_id(so_don_hang)").in("id", dtnIds)
      : Promise.resolve({ data: [] }),
    hddvIds.length > 0
      ? supabase.from("hoa_don_dau_vao").select("id, don_hang_id, tai_khoan_no, don_hang:don_hang_id(so_don_hang)").in("id", hddvIds)
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

  return <SoQuyView initialRows={rows ?? []} tamUngDetailMap={tamUngDetailMap} donHangMap={donHangMap} tkNoMap={tkNoMap} />;
}
