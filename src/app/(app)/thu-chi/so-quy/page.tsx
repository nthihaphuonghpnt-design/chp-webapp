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

  const [{ data: rows }, { data: nhanVienList }, { data: donHangList }, { data: chotList }] = await Promise.all([
    supabase.from("so_quy").select("*").order("ngay", { ascending: false }),
    supabase.from("nhan_vien").select("id, ho_ten").eq("dang_lam_viec", true).order("ho_ten"),
    supabase.from("don_hang").select("id, so_don_hang").order("created_at", { ascending: false }).limit(300),
    // P1 muc 6 (2026-11-26): moc "chot so du dau ky" — xem giai thich trong
    // SoQuyView (tinhTonDauKy) ve ly do can co bang nay thay vi cong don tu
    // dau thoi gian.
    supabase
      .from("chot_so_du_dau_ky")
      .select("id, doi_tuong_loai, ngay_ap_dung, so_du, ghi_chu, created_at")
      .in("doi_tuong_loai", ["so_quy_tien_mat", "so_quy_tai_khoan_cong_ty"])
      .order("ngay_ap_dung", { ascending: false }),
  ]);

  // Rieng giao dich xuat phat tu Tam ung & Giai chi: lay them thong tin doi
  // tuong de hien ngay trong bang, khong bat Ke toan phai doan qua "Noi dung".
  // nguon_bang/nguon_id la lien ket kieu "polymorphic", khong phai FK that
  // trong Postgres nen phai truy van rieng roi ghep tay.
  const tamUngIds = (rows ?? []).filter((r) => r.nguon_bang === "tam_ung_giai_chi").map((r) => r.nguon_id);
  const { data: tamUngDetails } =
    tamUngIds.length > 0
      ? await supabase
          .from("tam_ung_giai_chi")
          .select("id, loai, doi_tuong, nhan_vien:nhan_vien_id(ho_ten), ten_tai_xe, khach_hang:khach_hang_id(ten_day_du), don_hang_id, don_hang:don_hang_id(so_don_hang)")
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
  // F (28/11/2026): dong Tam ung/Giai chi (Tien mat) truoc gio KHONG hien duoc
  // cot "Don hang" tren So quy du chinh tam_ung_giai_chi.don_hang_id da co san
  // — chi thieu ghep vao donHangMap (bo sot khi lam rieng map nay cho 4 nguon
  // kia, xem khoi phia tren).
  for (const r of (tamUngDetails ?? []) as LienKetDonHang[]) {
    const dh = Array.isArray(r.don_hang) ? r.don_hang[0] : r.don_hang;
    if (r.don_hang_id && dh) donHangMap[r.id] = { id: r.don_hang_id, so_don_hang: dh.so_don_hang };
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

  // Dong thu tu hoa don: hien so hoa don + khach thay vi chi "Thu tien hoa don".
  const hdIds = (rows ?? []).filter((r) => r.nguon_bang === "hoa_don_xuat").map((r) => r.nguon_id);
  const { data: hdRows } =
    hdIds.length > 0
      ? await supabase.from("hoa_don_xuat").select("id, so_hoa_don, tong_tien, khach_hang:khach_hang_id(ten_day_du, ten_viet_tat)").in("id", hdIds)
      : { data: [] };
  const hoaDonDetailMap: Record<string, string> = {};
  for (const h of hdRows ?? []) {
    const kh = (Array.isArray(h.khach_hang) ? h.khach_hang[0] : h.khach_hang) as { ten_day_du: string; ten_viet_tat: string | null } | null;
    hoaDonDetailMap[h.id] = `HĐ ${h.so_hoa_don || "(chưa có số)"} · ${kh?.ten_viet_tat || kh?.ten_day_du || "—"} · tổng HĐ ${Number(h.tong_tien).toLocaleString("en-US")}`;
  }

  // C2 (27/11/2026): dong "thu gop nhieu hoa don" ghi tay — chi tiet phan bo
  // tung hoa don luu rieng o thu_gop_chi_tiet (xem migration 0134), vi
  // so_quy.nguon_id chi tro duoc ve 1 ban ghi, khong gom het ca nhom hoa don.
  const thuGopIds = (rows ?? []).filter((r) => r.nguon_bang === "thu_gop_thu_cong").map((r) => r.id);
  const { data: thuGopChiTietRows } =
    thuGopIds.length > 0
      ? await supabase
          .from("thu_gop_chi_tiet")
          .select("so_quy_id, so_tien, hoa_don:hoa_don_id(so_hoa_don, khach_hang:khach_hang_id(ten_day_du, ten_viet_tat))")
          .in("so_quy_id", thuGopIds)
      : { data: [] };
  type ThuGopChiTietRow = {
    so_quy_id: string;
    so_tien: number;
    hoa_don: { so_hoa_don: string | null; khach_hang: { ten_day_du: string; ten_viet_tat: string | null } | { ten_day_du: string; ten_viet_tat: string | null }[] | null } | { so_hoa_don: string | null; khach_hang: unknown }[] | null;
  };
  const thuGopChiTietMap: Record<string, { soHoaDon: string; khach: string; soTien: number }[]> = {};
  for (const r of (thuGopChiTietRows ?? []) as ThuGopChiTietRow[]) {
    const hd = Array.isArray(r.hoa_don) ? r.hoa_don[0] : r.hoa_don;
    const kh = hd ? (Array.isArray(hd.khach_hang) ? hd.khach_hang[0] : hd.khach_hang) as { ten_day_du: string; ten_viet_tat: string | null } | null : null;
    (thuGopChiTietMap[r.so_quy_id] ??= []).push({
      soHoaDon: hd?.so_hoa_don || "(chưa có số)",
      khach: kh?.ten_viet_tat || kh?.ten_day_du || "—",
      soTien: Number(r.so_tien),
    });
  }

  return (
    <SoQuyView
      hoaDonDetailMap={hoaDonDetailMap}
      thuGopChiTietMap={thuGopChiTietMap}
      initialRows={rows ?? []}
      tamUngDetailMap={tamUngDetailMap}
      donHangMap={donHangMap}
      tkNoMap={tkNoMap}
      canEdit={user.phong_ban === "Kế toán"}
      nhanVienList={nhanVienList ?? []}
      donHangOptions={donHangList ?? []}
      chotList={chotList ?? []}
    />
  );
}
