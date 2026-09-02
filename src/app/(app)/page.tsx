import Image from "next/image";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CONG_TY } from "@/lib/excel";
import { homNayVN } from "@/lib/chamCong";
import { trongCuaSoNhacCuoiThang } from "@/lib/nhacViec";

function loiChao() {
  const gio = new Date().getHours();
  if (gio < 11) return "Chào buổi sáng";
  if (gio < 13) return "Chào buổi trưa";
  if (gio < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

interface CongViecMuc {
  nhan: string;
  href: string;
  items: string[];
}

export default async function HomePage() {
  const user = await getCurrentUser();
  const homNay = homNayVN();

  let daChamCongHomNay = true;
  const lichSapToi: { noi_dung: string; ngay_du_kien: string; qua_han: boolean }[] = [];
  const congViecMucs: CongViecMuc[] = [];

  if (user) {
    const supabase = await createClient();

    const { data: cc } = await supabase
      .from("cham_cong")
      .select("id")
      .eq("nhan_vien_id", user.id)
      .eq("ngay", homNay)
      .maybeSingle();
    daChamCongHomNay = !!cc;

    const { data: lnn } = await supabase
      .from("lich_nhac_nho")
      .select("noi_dung, ngay_du_kien")
      .eq("nguoi_phu_trach_id", user.id)
      .eq("trang_thai", "Chưa thực hiện")
      .order("ngay_du_kien")
      .limit(5);
    for (const r of lnn ?? []) {
      lichSapToi.push({ noi_dung: r.noi_dung, ngay_du_kien: r.ngay_du_kien, qua_han: r.ngay_du_kien < homNay });
    }

    if (trongCuaSoNhacCuoiThang(homNay)) {
      const isKtGd = ["Kế toán", "Giám đốc"].includes(user.phong_ban);
      const isChungTu = user.phong_ban === "Chứng từ" || isKtGd;

      if (user.phong_ban === "Sale") {
        const { data } = await supabase
          .from("don_hang")
          .select("so_don_hang")
          .eq("sale_phu_trach_id", user.id)
          .neq("trang_thai", "Hoàn tất");
        if (data && data.length > 0) {
          congViecMucs.push({ nhan: "Đơn hàng chưa Hoàn tất", href: "/don-hang", items: data.map((d) => d.so_don_hang) });
        }
      }

      const [{ data: cp }, { data: tn }] = await Promise.all([
        supabase
          .from("phat_sinh_chi_phi")
          .select("don_hang:don_hang_id(so_don_hang)")
          .eq("nguoi_nhap_id", user.id)
          .eq("trang_thai", "Chờ duyệt"),
        supabase
          .from("don_thue_ngoai")
          .select("don_hang:don_hang_id(so_don_hang)")
          .eq("nguoi_nhap_id", user.id)
          .eq("trang_thai", "Chờ duyệt"),
      ]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tenChiPhi = [...(cp ?? []), ...(tn ?? [])].map((r: any) => {
        const dh = Array.isArray(r.don_hang) ? r.don_hang[0] : r.don_hang;
        return dh?.so_don_hang ?? "—";
      });
      if (tenChiPhi.length > 0) {
        congViecMucs.push({ nhan: "Chi phí / thuê ngoài chờ duyệt", href: "/don-hang", items: tenChiPhi });
      }

      if (isKtGd) {
        const trongVong30Ngay = new Date(new Date(`${homNay}T00:00:00`).getTime() + 30 * 86400000).toISOString().slice(0, 10);
        const hopDongCot = "so_hop_dong, khach_hang:khach_hang_id(ten_day_du), nha_cung_cap:nha_cung_cap_id(ten), trang_thai_hop_dong, ngay_het_han";
        const [{ data: hdChuaCo }, { data: hdSapHetHan }] = await Promise.all([
          supabase.from("hop_dong_khach_hang").select(hopDongCot).eq("trang_thai_hop_dong", "Chưa có hợp đồng"),
          supabase
            .from("hop_dong_khach_hang")
            .select(hopDongCot)
            .eq("trang_thai_hop_dong", "Đã có hợp đồng")
            .not("ngay_het_han", "is", null)
            .lte("ngay_het_han", trongVong30Ngay)
            .gte("ngay_het_han", homNay),
        ]);
        const hd = [...(hdChuaCo ?? []), ...(hdSapHetHan ?? [])];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tenHopDong = hd.map((r: any) => {
          const kh = Array.isArray(r.khach_hang) ? r.khach_hang[0] : r.khach_hang;
          const ncc = Array.isArray(r.nha_cung_cap) ? r.nha_cung_cap[0] : r.nha_cung_cap;
          const ten = kh?.ten_day_du ?? ncc?.ten ?? "—";
          return r.trang_thai_hop_dong === "Chưa có hợp đồng" ? `${ten} (chưa có HĐ)` : `${ten} (sắp hết hạn ${r.ngay_het_han})`;
        });
        if (tenHopDong.length > 0) {
          congViecMucs.push({ nhan: "Hợp đồng chưa có / sắp hết hạn", href: "/khach-hang/hop-dong", items: tenHopDong });
        }
      }

      if (isChungTu) {
        const { data: tk } = await supabase
          .from("to_khai_hai_quan")
          .select("so_to_khai, don_hang:don_hang_id(so_don_hang)")
          .neq("trang_thai", "Đã thông quan")
          .neq("trang_thai", "Giải phóng hàng");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tenTk = (tk ?? []).map((r: any) => {
          const dh = Array.isArray(r.don_hang) ? r.don_hang[0] : r.don_hang;
          return `${dh?.so_don_hang ?? "—"}${r.so_to_khai ? ` — TK ${r.so_to_khai}` : " — chưa có số TK"}`;
        });
        if (tenTk.length > 0) {
          congViecMucs.push({ nhan: "Tờ khai hải quan chưa hoàn tất", href: "/don-hang", items: tenTk });
        }
      }
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {!daChamCongHomNay && (
        <Link
          href="/cham-cong"
          className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm font-medium text-amber-800 shadow-sm"
        >
          <span>⏰ Bạn chưa chấm công hôm nay — bấm để chấm công ngay.</span>
          <span className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white">Chấm công</span>
        </Link>
      )}

      {congViecMucs.length > 0 && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-800">
            ⚠️ Sắp cuối tháng — bạn còn công việc chưa hoàn thành cần xử lý:
          </p>
          <div className="mt-2 flex flex-col gap-2">
            {congViecMucs.map((m) => (
              <Link key={m.nhan} href={m.href} className="block rounded-lg bg-white/70 p-2 text-sm hover:bg-white">
                <span className="font-medium text-red-700">{m.nhan} ({m.items.length}):</span>{" "}
                <span className="text-slate-600">{m.items.slice(0, 6).join(", ")}{m.items.length > 6 ? "..." : ""}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {lichSapToi.length > 0 && (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">📅 Lịch nhắc nhở sắp tới</p>
            <Link href="/lich-nhac-nho" className="text-xs font-medium text-blue-600">Xem tất cả</Link>
          </div>
          <div className="flex flex-col gap-1.5">
            {lichSapToi.map((l, i) => (
              <div key={i} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-slate-700">{l.noi_dung}</span>
                <span className={`shrink-0 text-xs font-medium ${l.qua_han ? "text-red-600" : "text-slate-400"}`}>
                  {l.qua_han ? "Quá hạn " : ""}
                  {l.ngay_du_kien}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-6 flex flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white p-6 text-center sm:flex-row sm:text-left">
        <Image
          src="/logo-chp.jpg"
          alt="Châu Hoàng Phát"
          width={80}
          height={80}
          className="rounded-xl"
          priority
        />
        <div>
          <p className="text-sm font-bold tracking-wide text-blue-900">{CONG_TY.tenViet}</p>
          <p className="text-xs italic text-blue-600">{CONG_TY.tenAnh}</p>
        </div>
      </div>

      <h1 className="text-xl font-semibold text-slate-900">
        {loiChao()}, {user?.ho_ten ?? ""} 👋
      </h1>
      <p className="mt-1 text-sm text-slate-500">Phòng ban: {user?.phong_ban}</p>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
        <p className="text-sm font-medium text-slate-700">Thông tin công ty</p>
        <dl className="mt-2 space-y-1 text-sm text-slate-600">
          <div className="flex flex-wrap gap-1">
            <dt className="text-slate-400">MST:</dt>
            <dd>{CONG_TY.mst}</dd>
          </div>
          <div className="flex flex-wrap gap-1">
            <dt className="text-slate-400">Địa chỉ:</dt>
            <dd>{CONG_TY.diaChi}</dd>
          </div>
          <div className="flex flex-wrap gap-1">
            <dt className="text-slate-400">Email:</dt>
            <dd>{CONG_TY.email}</dd>
          </div>
        </dl>
      </div>

      <p className="mt-6 text-center text-xs text-slate-400">
        Dùng menu bên (hoặc nút &quot;Menu&quot; trên điện thoại) để vào các mục quản lý.
      </p>
    </div>
  );
}
