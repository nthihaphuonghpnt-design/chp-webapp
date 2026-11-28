import Image from "next/image";
import Link from "next/link";
import ChamCongNhanhCard from "@/components/cham-cong/ChamCongNhanhCard";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CONG_TY } from "@/lib/excel";
import { homNayVN, laNhanVienVanPhong } from "@/lib/chamCong";
import { trongCuaSoNhacCuoiThang } from "@/lib/nhacViec";
import { khachMeCua } from "@/lib/nhomKhach";
import { tinhSoDuHienTai } from "@/lib/soQuy";

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
  const tamUngChoDuyet: { ten: string; soTien: number; loai: string }[] = [];
  let soLieuNhanh: {
    soLoDangChay: number;
    loChoXuatHoaDon: number;
    tongPhaiThu: number;
    soHoaDonQuaHan: number;
    soDuQuy: number;
  } | null = null;

  if (user) {
    const supabase = await createClient();
    const trongCuaSo = trongCuaSoNhacCuoiThang(homNay);
    const isKtGd = ["Kế toán", "Giám đốc"].includes(user.phong_ban);
    const isChungTu = user.phong_ban === "Chứng từ" || isKtGd;
    const isSale = user.phong_ban === "Sale";
    const isVanPhong = laNhanVienVanPhong(user.phong_ban);
    const trongVong30Ngay = new Date(new Date(`${homNay}T00:00:00`).getTime() + 30 * 86400000).toISOString().slice(0, 10);
    const hopDongCot = "khach_hang_id, so_hop_dong, khach_hang:khach_hang_id(ten_day_du), nha_cung_cap:nha_cung_cap_id(ten), trang_thai_hop_dong, ngay_het_han";
    // Dung chung cho ca canh bao Hop dong (da co) lan To khai (them o day) —
    // chi nhac viec cho KHACH/LO con hoat dong gan day, tranh nhac viec cu tu
    // ca nam truoc (xem P2 muc 16 va yeu cau bo sung V4 phan C.1.6/E.1).
    const tuNgayLo = new Date(new Date(`${homNay}T00:00:00Z`).getTime() - 183 * 86400000).toISOString().slice(0, 10);

    // Chay song song toan bo truy van doc lap thay vi await tuan tu — trang
    // chu la trang tai dau tien moi lan dang nhap nen cang nhieu round-trip
    // noi tiep cang cam giac cham tren mang di dong.
    const [
      { data: cc },
      { data: lnn },
      { data: donHangSale },
      { data: cp },
      { data: tn },
      { data: hdChuaCo },
      { data: hdSapHetHan },
      { data: tk },
      { data: tamUng },
      { data: donHangTrangThai },
      { data: donHangHoanTatIds },
      { data: hoaDonDonHangLinks },
      { data: hoaDonXuatList },
      { data: soQuyRows },
      { data: chotSoDuList },
    ] = await Promise.all([
      isVanPhong
        ? supabase.from("cham_cong").select("id").eq("nhan_vien_id", user.id).eq("ngay", homNay).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("lich_nhac_nho")
        .select("noi_dung, ngay_du_kien")
        .eq("nguoi_phu_trach_id", user.id)
        .eq("trang_thai", "Chưa thực hiện")
        .order("ngay_du_kien")
        .limit(5),
      trongCuaSo && isSale
        ? supabase.from("don_hang").select("so_don_hang").eq("sale_phu_trach_id", user.id).neq("trang_thai", "Hoàn tất")
        : Promise.resolve({ data: null }),
      trongCuaSo
        ? supabase
            .from("phat_sinh_chi_phi")
            .select("don_hang:don_hang_id(so_don_hang)")
            .eq("nguoi_nhap_id", user.id)
            .eq("trang_thai", "Chờ duyệt")
        : Promise.resolve({ data: null }),
      trongCuaSo
        ? supabase
            .from("don_thue_ngoai")
            .select("don_hang:don_hang_id(so_don_hang)")
            .eq("nguoi_nhap_id", user.id)
            .eq("trang_thai", "Chờ duyệt")
        : Promise.resolve({ data: null }),
      // P2 muc 16 (2026-11-27): chi canh bao cho KHACH HANG thieu hop dong —
      // Nha cung cap mac dinh "Khong can hop dong" (xem migration 0124), neu
      // con gop ca NCC vao day se bao qua nhieu muc khong can thiet.
      trongCuaSo && isKtGd
        ? supabase.from("hop_dong_khach_hang").select(hopDongCot).eq("trang_thai_hop_dong", "Chưa có hợp đồng").not("khach_hang_id", "is", null)
        : Promise.resolve({ data: null }),
      trongCuaSo && isKtGd
        ? supabase
            .from("hop_dong_khach_hang")
            .select(hopDongCot)
            .eq("trang_thai_hop_dong", "Đã có hợp đồng")
            .not("ngay_het_han", "is", null)
            .lte("ngay_het_han", trongVong30Ngay)
            .gte("ngay_het_han", homNay)
        : Promise.resolve({ data: null }),
      trongCuaSo && isChungTu
        ? supabase
            .from("to_khai_hai_quan")
            .select("so_to_khai, don_hang:don_hang_id(so_don_hang, ngay_len_don)")
            .neq("trang_thai", "Đã thông quan")
            .neq("trang_thai", "Giải phóng hàng")
        : Promise.resolve({ data: null }),
      // Tam ung/giai chi cho duyet: luon hien cho Ke toan/Giam doc (khong
      // doi den cuoi thang), vi nguoi de nghi thuong can tien gap.
      isKtGd
        ? supabase
            .from("tam_ung_giai_chi")
            .select("loai, so_tien, doi_tuong, ten_tai_xe, nhan_vien:nhan_vien_id(ho_ten)")
            .eq("trang_thai", "Đề nghị")
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: null }),
      // Cac truy van sau chi phuc vu "So lieu nhanh" o trang chu — chi tai
      // cho Ke toan/Giam doc (du lieu tai chinh), khong tai cho phong ban khac
      // de khong lam cham trang chu cua ho mot cach khong can thiet.
      isKtGd ? supabase.from("don_hang").select("trang_thai") : Promise.resolve({ data: null }),
      isKtGd ? supabase.from("don_hang").select("id").eq("trang_thai", "Hoàn tất") : Promise.resolve({ data: null }),
      isKtGd
        ? supabase.from("hoa_don_don_hang").select("don_hang_id, hoa_don:hoa_don_id(trang_thai)")
        : Promise.resolve({ data: null }),
      isKtGd
        ? supabase
            .from("hoa_don_xuat")
            .select("tong_tien, so_tien_da_thu, trang_thai_thanh_toan, ngay_xuat")
            .eq("trang_thai", "Đã phát hành")
        : Promise.resolve({ data: null }),
      isKtGd ? supabase.from("so_quy").select("loai_so, loai_giao_dich, so_tien, ngay") : Promise.resolve({ data: null }),
      isKtGd
        ? supabase
            .from("chot_so_du_dau_ky")
            .select("doi_tuong_loai, ngay_ap_dung, so_du")
            .in("doi_tuong_loai", ["so_quy_tien_mat", "so_quy_tai_khoan_cong_ty"])
        : Promise.resolve({ data: null }),
    ]);

    daChamCongHomNay = !!cc;

    for (const r of lnn ?? []) {
      lichSapToi.push({ noi_dung: r.noi_dung, ngay_du_kien: r.ngay_du_kien, qua_han: r.ngay_du_kien < homNay });
    }

    if (donHangSale && donHangSale.length > 0) {
      congViecMucs.push({ nhan: "Đơn hàng chưa Hoàn tất", href: "/don-hang", items: donHangSale.map((d) => d.so_don_hang) });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tenChiPhi = [...(cp ?? []), ...(tn ?? [])].map((r: any) => {
      const dh = Array.isArray(r.don_hang) ? r.don_hang[0] : r.don_hang;
      return dh?.so_don_hang ?? "—";
    });
    if (tenChiPhi.length > 0) {
      congViecMucs.push({ nhan: "Chi phí / thuê ngoài chờ duyệt", href: "/don-hang", items: tenChiPhi });
    }

    // "Chua co hop dong": chi khach con phat sinh lo trong 6 thang; cong ty con
    // cua nhom co cong ty me thi hop dong dat o cong ty me.
    let chuaCoCanNhac = hdChuaCo ?? [];
    if (chuaCoCanNhac.length > 0) {
      const [{ data: loGanDay, error: loiLo }, { data: khachNhom }, { data: nhomAll }] = await Promise.all([
        supabase.from("don_hang").select("khach_hang_id").gte("ngay_len_don", tuNgayLo),
        supabase.from("khach_hang").select("id, nhom_khach_hang_id"),
        supabase.from("nhom_khach_hang").select("*"),
      ]);
      if (!loiLo) {
        const coLo = new Set((loGanDay ?? []).map((d) => d.khach_hang_id));
        // Cong ty me khong co lo rieng van can nhac neu cong ty con co lo.
        const meCoLo = new Set<string>();
        for (const id of coLo) {
          const me = id ? khachMeCua(id, khachNhom ?? [], nhomAll ?? []) : null;
          if (me) meCoLo.add(me);
        }
        chuaCoCanNhac = chuaCoCanNhac.filter((r) => {
          const id = r.khach_hang_id as string;
          if (khachMeCua(id, khachNhom ?? [], nhomAll ?? [])) return false;
          return coLo.has(id) || meCoLo.has(id);
        });
      }
    }

    const hd = [...chuaCoCanNhac, ...(hdSapHetHan ?? [])];
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tenTk = (tk ?? [])
      .filter((r: any) => {
        const dh = Array.isArray(r.don_hang) ? r.don_hang[0] : r.don_hang;
        return (dh?.ngay_len_don ?? "") >= tuNgayLo;
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((r: any) => {
        const dh = Array.isArray(r.don_hang) ? r.don_hang[0] : r.don_hang;
        return `${dh?.so_don_hang ?? "—"}${r.so_to_khai ? ` — TK ${r.so_to_khai}` : " — chưa có số TK"}`;
      });
    if (tenTk.length > 0) {
      congViecMucs.push({ nhan: "Tờ khai hải quan chưa hoàn tất", href: "/don-hang", items: tenTk });
    }

    for (const r of tamUng ?? []) {
      const nv = Array.isArray(r.nhan_vien) ? r.nhan_vien[0] : r.nhan_vien;
      tamUngChoDuyet.push({
        ten: r.doi_tuong === "Tài xế" ? (r.ten_tai_xe ?? "—") : (nv?.ho_ten ?? "—"),
        soTien: r.so_tien,
        loai: r.loai,
      });
    }

    // "So lieu nhanh" (yeu cau bo sung E.1, 2026-11-27) — chi Ke toan/Giam
    // doc, dung so bo tuong tu Bao cao/So quy nhung gon lai thanh 1 hang cho
    // trang chu, khong phai mo tung trang moi biet.
    if (isKtGd) {
      const soLoDangChay = (donHangTrangThai ?? []).filter((d) => d.trang_thai !== "Hoàn tất").length;

      const hoanTatIds = new Set((donHangHoanTatIds ?? []).map((d) => d.id));
      const daCoHoaDonIds = new Set(
        (hoaDonDonHangLinks ?? [])
          .filter((l) => {
            const hd = Array.isArray(l.hoa_don) ? l.hoa_don[0] : l.hoa_don;
            return hd && hd.trang_thai !== "Đã hủy" && hd.trang_thai !== "Đã thay thế";
          })
          .map((l) => l.don_hang_id)
      );
      const loChoXuatHoaDon = Array.from(hoanTatIds).filter((id) => !daCoHoaDonIds.has(id)).length;

      const tongPhaiThu = (hoaDonXuatList ?? []).reduce((s, h) => s + (h.tong_tien - (h.so_tien_da_thu ?? 0)), 0);
      const nguongQuaHan = new Date(new Date(`${homNay}T00:00:00`).getTime() - 30 * 86400000).toISOString().slice(0, 10);
      const soHoaDonQuaHan = (hoaDonXuatList ?? []).filter(
        (h) => h.trang_thai_thanh_toan !== "Đã thu đủ" && h.ngay_xuat < nguongQuaHan
      ).length;

      const soDuQuy =
        tinhSoDuHienTai("Tiền mặt", soQuyRows ?? [], chotSoDuList ?? [], homNay) +
        tinhSoDuHienTai("Tài khoản công ty", soQuyRows ?? [], chotSoDuList ?? [], homNay);

      soLieuNhanh = { soLoDangChay, loChoXuatHoaDon, tongPhaiThu, soHoaDonQuaHan, soDuQuy };
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {soLieuNhanh && (
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          <Link href="/don-hang" className="rounded-xl border border-slate-200 bg-white p-3 hover:bg-slate-50">
            <p className="text-xs text-slate-500">Lô đang chạy</p>
            <p className="text-lg font-semibold text-slate-900">{soLieuNhanh.soLoDangChay}</p>
          </Link>
          <Link href="/don-hang" className="rounded-xl border border-slate-200 bg-white p-3 hover:bg-slate-50">
            <p className="text-xs text-slate-500">Chờ xuất hóa đơn</p>
            <p className="text-lg font-semibold text-slate-900">{soLieuNhanh.loChoXuatHoaDon}</p>
          </Link>
          <Link href="/khach-hang/hoa-don" className="rounded-xl border border-slate-200 bg-white p-3 hover:bg-slate-50">
            <p className="text-xs text-slate-500">Tổng phải thu</p>
            <p className="text-lg font-semibold text-slate-900">{Math.round(soLieuNhanh.tongPhaiThu).toLocaleString("en-US")}</p>
          </Link>
          <Link href="/khach-hang/hoa-don" className="rounded-xl border border-slate-200 bg-white p-3 hover:bg-slate-50">
            <p className="text-xs text-slate-500">HĐ quá hạn 30 ngày</p>
            <p className={`text-lg font-semibold ${soLieuNhanh.soHoaDonQuaHan > 0 ? "text-red-600" : "text-slate-900"}`}>
              {soLieuNhanh.soHoaDonQuaHan}
            </p>
          </Link>
          <Link href="/thu-chi/so-quy" className="rounded-xl border border-slate-200 bg-white p-3 hover:bg-slate-50">
            <p className="text-xs text-slate-500">Số dư quỹ</p>
            <p className={`text-lg font-semibold ${soLieuNhanh.soDuQuy < 0 ? "text-red-600" : "text-slate-900"}`}>
              {Math.round(soLieuNhanh.soDuQuy).toLocaleString("en-US")}
            </p>
          </Link>
        </div>
      )}

      {!daChamCongHomNay && user && <ChamCongNhanhCard nhanVienId={user.id} />}

      {tamUngChoDuyet.length > 0 && (
        <Link
          href="/tam-ung-giai-chi"
          className="mb-4 block rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-sm hover:bg-amber-100"
        >
          <p className="text-sm font-semibold text-amber-800">💰 Có {tamUngChoDuyet.length} đề nghị tạm ứng/giải chi chờ duyệt:</p>
          <div className="mt-1 flex flex-col gap-0.5 text-sm text-amber-700">
            {tamUngChoDuyet.slice(0, 6).map((t, i) => (
              <span key={i}>
                {t.loai} — {t.ten}: {Math.round(t.soTien).toLocaleString("en-US")}
              </span>
            ))}
            {tamUngChoDuyet.length > 6 && <span>... và {tamUngChoDuyet.length - 6} đề nghị khác</span>}
          </div>
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

      <Link
        href="/noi-quy"
        className="mt-4 block rounded-2xl border border-indigo-200 bg-indigo-50 p-4 hover:bg-indigo-100"
      >
        <p className="text-sm font-semibold text-indigo-800">📋 Nội quy công ty & Định mức chi tiêu nội bộ</p>
        <p className="mt-0.5 text-xs text-indigo-600">Bấm để xem đầy đủ nội quy lao động và định mức công tác phí, tạm ứng...</p>
      </Link>

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
