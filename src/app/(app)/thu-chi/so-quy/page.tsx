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

  return <SoQuyView initialRows={rows ?? []} tamUngDetailMap={tamUngDetailMap} />;
}
