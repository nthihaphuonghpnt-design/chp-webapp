import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { canManageDonHang } from "@/lib/permissions";
import StatusBadge from "@/components/don-hang/StatusBadge";
import ConfirmButtons from "@/components/don-hang/ConfirmButtons";
import ContainerSection from "@/components/don-hang/ContainerSection";
import ToKhaiSection from "@/components/don-hang/ToKhaiSection";
import ChiTietVanChuyenSection from "@/components/don-hang/ChiTietVanChuyenSection";
import DinhKemSection from "@/components/don-hang/DinhKemSection";
import LineItemsSection from "@/components/don-hang/LineItemsSection";
import ChiPhiGopSection from "@/components/don-hang/ChiPhiGopSection";
import CongViecHoanThanhSection, { type CongViecEntry } from "@/components/don-hang/CongViecHoanThanhSection";
import { PHAT_SINH_CHI_PHI_SAFE_COLS, DON_THUE_NGOAI_SAFE_COLS, ghepGiaBanChiPhi, ghepGiaBanThueNgoai } from "@/lib/giaBan";
import { tongPhanLoaiChiPhi, doanhThuVoiFallbackGiaDonHang } from "@/lib/baoCao";

export default async function DonHangDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getCurrentUser();

  const [
    { data: order },
    { data: containerRows },
    { data: toKhaiRows },
    { data: chiTietRows },
    { data: dinhKemRows },
    { data: diaDiemList },
    { data: loaiContainerList },
    { data: chiPhiRows },
    { data: phuThuRows },
    { data: chiPhiGiaoNhanRows },
    { data: loaiChiPhiList },
    { data: nhaCungCapList },
    { data: thueNgoaiRows },
    { data: doiTacList },
    { data: nhanVienList },
    { data: congViecRows },
    { data: tamUngDonHangRows },
  ] = await Promise.all([
    supabase
      .from("don_hang")
      .select(
        "*, khach_hang:khach_hang_id(ten_day_du, ten_viet_tat), hang_hoa:hang_hoa_id(ten), noi_lay:noi_lay_cont_hang_id(ten), noi_dong:noi_dong_giao_id(ten), noi_ha:noi_ha_tra_rong_id(ten), nguoi_tao:nguoi_tao_id(ho_ten), sale_phu_trach:sale_phu_trach_id(ho_ten), hien_truong_phu_trach:hien_truong_phu_trach_id(ho_ten), chung_tu_phu_trach:chung_tu_phu_trach_id(ho_ten)"
      )
      .eq("id", id)
      .single(),
    supabase.from("don_hang_container").select("*").eq("don_hang_id", id).order("created_at"),
    supabase.from("to_khai_hai_quan").select("*").eq("don_hang_id", id).order("created_at"),
    supabase.from("chi_tiet_van_chuyen").select("*").eq("don_hang_id", id).order("ngay_vc"),
    supabase.from("dinh_kem").select("*").eq("don_hang_id", id).order("thoi_gian_upload", { ascending: false }),
    supabase.from("dia_diem").select("id, ten, ma_dia_diem, dia_chi, khu_vuc").eq("dang_hoat_dong", true).order("ten"),
    supabase.from("loai_container").select("id, ten").eq("dang_hoat_dong", true).order("ten"),
    supabase.from("phat_sinh_chi_phi").select(PHAT_SINH_CHI_PHI_SAFE_COLS).eq("don_hang_id", id).order("created_at", { ascending: false }),
    supabase.from("phu_thu").select("*").eq("don_hang_id", id).order("created_at", { ascending: false }),
    supabase.from("chi_phi_giao_nhan").select("*").eq("don_hang_id", id).order("created_at", { ascending: false }),
    supabase.from("loai_chi_phi").select("id, ten, ma:ma_loai_chi_phi").eq("dang_hoat_dong", true).order("ten"),
    supabase.from("nha_cung_cap").select("id, ten").eq("dang_hoat_dong", true).order("ten"),
    supabase.from("don_thue_ngoai").select(DON_THUE_NGOAI_SAFE_COLS).eq("don_hang_id", id).order("created_at", { ascending: false }),
    supabase.from("doi_tac_thue_ngoai").select("id, ten").eq("dang_hoat_dong", true).order("ten"),
    supabase
      .from("nhan_vien")
      .select("id, ho_ten, phong_ban:phong_ban_id(ten)")
      .eq("dang_lam_viec", true)
      .order("ho_ten"),
    supabase.from("cong_viec_hoan_thanh").select("id, nhan_vien_id, trang_thai").eq("don_hang_id", id),
    supabase.from("tam_ung_giai_chi").select("nhan_vien_id, so_tien").eq("don_hang_id", id).eq("loai", "Tạm ứng").eq("trang_thai", "Đã duyệt"),
  ]);

  if (!order) notFound();

  // Loi nhuan so bo: Sell - Buy(noi bo) - Chi phi giao nhan/chung tu - Chi phi thue ngoai
  // (Module E) - Dinh phi phan bo, sau do chia hoa hong Sale 4/10 - Cong ty 6/10.
  const monthKey = order.ngay_len_don.slice(0, 7);
  const [monthYear, monthNum] = monthKey.split("-").map(Number);
  const monthStart = `${monthKey}-01`;
  const nextMonthStart = new Date(Date.UTC(monthYear, monthNum, 1)).toISOString().slice(0, 10);

  // gia_ban_sell khong con doc truc tiep duoc tu 0061 — ghep lai qua RPC rieng
  // (tu kiem tra dung quyen theo phong ban), giu dung shape PhatSinhChiPhi/
  // DonThueNgoai nhu truoc de ChiPhiGopSection khong doi gi ve kieu du lieu.
  // dinh_phi_thang da duoc thay the boi hoa_don_dau_vao (migration 0082) —
  // bang moi nhay cam hon nen khong SELECT thang duoc, chi lay tong qua RPC.
  // Gop chung 1 Promise.all: ca 4 truy van duoi day chi phu thuoc ket qua
  // cua Promise.all dau tien (order/chiPhiRows/thueNgoaiRows), khong phu
  // thuoc lan nhau — truoc day tach thanh nhieu buoc await noi tiep, moi
  // buoc cong them 1 vong round-trip mang, gay cham khi mo trang chi tiet
  // don hang.
  const [chiPhiRowsDayDu, thueNgoaiRowsDayDu, { data: dinhPhiRows }, { count: soLoTrongThang }] = await Promise.all([
    ghepGiaBanChiPhi(supabase, chiPhiRows ?? []),
    ghepGiaBanThueNgoai(supabase, thueNgoaiRows ?? []),
    supabase.rpc("tong_dinh_phi_theo_thang"),
    supabase
      .from("don_hang")
      .select("id", { count: "exact", head: true })
      .gte("ngay_len_don", monthStart)
      .lt("ngay_len_don", nextMonthStart),
  ]);

  const tongDinhPhiThang = ((dinhPhiRows ?? []) as { thang_nam: string; so_tien: number }[])
    .filter((r) => r.thang_nam === monthKey)
    .reduce((s, r) => s + (r.so_tien ?? 0), 0);
  const dinhPhiPhanBo = soLoTrongThang && soLoTrongThang > 0 ? tongDinhPhiThang / soLoTrongThang : 0;

  // Dung CHUNG cong thuc voi BaoCaoView.tsx (loiNhuanTheoLo/congNoTheoLo): loai
  // "Tu choi" truoc khi tinh (chi phi chua duoc Ke toan duyet khong duoc coi la
  // chot), va dung tongPhanLoaiChiPhi de KHONG tinh nham chi_ho vao doanh thu —
  // truoc day trang nay tu cong het chiPhiRowsDayDu.gia_ban_sell, bao gom ca
  // dong "Tu choi" lan dong "Chi ho" (von khong phai doanh thu), ra so khac han
  // /bao-cao. Xem BUG-05 trong audit.
  const chiPhiHopLe = chiPhiRowsDayDu.filter((r) => r.trang_thai !== "Từ chối");
  const thueNgoaiHopLe = thueNgoaiRowsDayDu.filter((r) => r.trang_thai !== "Từ chối");
  // Dong Thue ngoai danh dau Chi ho (theo yeu cau Bao Dung 2026-09-21) loai
  // khoi ca doanh thu lan chi phi cong ty, giong het cach chi_ho dang loai
  // trong tongPhanLoaiChiPhi cho Chi phi phat sinh — khong thi doanh thu/chi
  // phi bi thoi phong sai du Loi nhuan van ra dung (vi mua ban dung gia).
  const thueNgoaiKhongChiHo = thueNgoaiHopLe.filter((r) => !r.chi_ho);
  const { doanhThu: sellTuChiPhi, chiPhiThuc: tongBuyNoiBo } = tongPhanLoaiChiPhi(chiPhiHopLe);
  const tongSellItemize =
    sellTuChiPhi +
    (phuThuRows ?? []).reduce((s, r) => s + (r.thanh_tien ?? 0), 0) +
    thueNgoaiKhongChiHo.reduce((s, r) => s + (r.gia_ban_sell ?? 0), 0);
  // Chua ai nhap gia ban tung dong (tongSellItemize = 0) thi tam dung "Gia
  // ban" chung cua don hang lam co so tinh loi nhuan, theo yeu cau Bao Dung.
  const tongSell = doanhThuVoiFallbackGiaDonHang(tongSellItemize, order.gia);
  const tongChiPhiGiaoNhan = (chiPhiGiaoNhanRows ?? []).reduce((s, r) => s + (r.thanh_tien ?? 0), 0);
  const tongChiPhiThueNgoai = thueNgoaiKhongChiHo.reduce((s, r) => s + (r.so_tien_da_chi ?? 0), 0);

  const loiNhuanTruocHoaHong = tongSell - tongBuyNoiBo - tongChiPhiGiaoNhan - tongChiPhiThueNgoai - dinhPhiPhanBo;
  const chiPhiSale = loiNhuanTruocHoaHong * 0.4;
  const loiNhuanCongTy = loiNhuanTruocHoaHong - chiPhiSale;

  const loiNhuanTruocDinhPhi = loiNhuanTruocHoaHong + dinhPhiPhanBo;

  const canSeeLoiNhuan = ["Kế toán", "Giám đốc", "Sale"].includes(user?.phong_ban ?? "");

  // Doi chieu tam ung <-> da chi rieng cho don hang nay (theo yeu cau Bao
  // Dung 2026-09-22): "da tam ung cho don bao nhieu, da chi het bao nhieu,
  // con bao nhieu" — de ops (Hien truong/Dieu phoi) tu theo doi khong can
  // qua trang Tam ung rieng. Da chi tinh CA dong Chi ho (chi ho van la tien
  // rut tu tam ung cua nguoi do, van phai tru — chi khac o cho khong tinh
  // vao doanh thu/chi phi cong ty, xem thueNgoaiKhongChiHo o tren).
  const tamUngTheoNguoi = new Map<string, number>();
  for (const r of tamUngDonHangRows ?? []) {
    if (!r.nhan_vien_id) continue;
    tamUngTheoNguoi.set(r.nhan_vien_id, (tamUngTheoNguoi.get(r.nhan_vien_id) ?? 0) + (r.so_tien ?? 0));
  }
  const daChiTuTamUngTheoNguoi = new Map<string, number>();
  for (const r of [...chiPhiHopLe, ...thueNgoaiHopLe]) {
    if (r.nguon_thanh_toan !== "Tạm ứng nhân viên" || !r.nguoi_nhap_id) continue;
    daChiTuTamUngTheoNguoi.set(r.nguoi_nhap_id, (daChiTuTamUngTheoNguoi.get(r.nguoi_nhap_id) ?? 0) + (r.so_tien_da_chi ?? 0));
  }
  const nhanVienTenMap = new Map((nhanVienList ?? []).map((nv) => [nv.id, nv.ho_ten]));
  // Hien truong/Chung tu chi xem duoc dong tam ung/da chi cua CHINH MINH —
  // dung y het pham vi "chiThayCuaMinh" da ap dung cho tung dong chi phi o
  // ChiPhiGopSection.tsx, khong thi lo ho: an duoc tung dong chi tiet cua
  // nguoi khac nhung lai lo tong hop tam ung cua ho o day.
  const chiThayTamUngCuaMinh = ["Hiện trường", "Chứng từ"].includes(user?.phong_ban ?? "");
  const tamUngDoiChieu = Array.from(new Set([...tamUngTheoNguoi.keys(), ...daChiTuTamUngTheoNguoi.keys()]))
    .filter((nvId) => !chiThayTamUngCuaMinh || nvId === user?.id)
    .map((nvId) => {
      const tamUng = tamUngTheoNguoi.get(nvId) ?? 0;
      const daChi = daChiTuTamUngTheoNguoi.get(nvId) ?? 0;
      return { nvId, ten: nhanVienTenMap.get(nvId) ?? "—", tamUng, daChi, conLai: tamUng - daChi };
    });

  const nhanVienGiaoNhanOptions = (nhanVienList ?? [])
    .filter((nv) => {
      const pb = Array.isArray(nv.phong_ban) ? nv.phong_ban[0] : nv.phong_ban;
      return pb?.ten === "Hiện trường" || pb?.ten === "Chứng từ" || pb?.ten === "Kế toán" || pb?.ten === "Sale";
    })
    .map((nv) => {
      const pb = Array.isArray(nv.phong_ban) ? nv.phong_ban[0] : nv.phong_ban;
      return { value: nv.id, label: `${nv.ho_ten} (${pb?.ten ?? ""})` };
    });

  // Ke toan chon "tam ung nhan vien" khi nhap ho chi phi/thue ngoai — chi cho
  // dung phong ban thuc su tham gia chu trinh Hoan thanh/Tiep nhan lam nguoi
  // nhap (xem 0064): Chi phi cho Hien truong + Chung tu, Thue ngoai chi Hien
  // truong (Chung tu khong nhap thue ngoai).
  function nhanVienTamUngOption(nv: NonNullable<typeof nhanVienList>[number]) {
    const pb = Array.isArray(nv.phong_ban) ? nv.phong_ban[0] : nv.phong_ban;
    return { id: nv.id, ten: `${nv.ho_ten} (${pb?.ten ?? ""})`, phongBan: pb?.ten ?? "" };
  }
  const nhanVienChiPhiTamUngOptions = (nhanVienList ?? [])
    .map(nhanVienTamUngOption)
    .filter((nv) => nv.phongBan === "Hiện trường" || nv.phongBan === "Chứng từ")
    .map(({ id, ten }) => ({ id, ten }));
  const nhanVienThueNgoaiTamUngOptions = (nhanVienList ?? [])
    .map(nhanVienTamUngOption)
    .filter((nv) => nv.phongBan === "Hiện trường")
    .map(({ id, ten }) => ({ id, ten }));

  // Map nhan_vien_id -> trang_thai "cong_viec_hoan_thanh" cua don hang nay,
  // dung de khoa Sua/Xoa chi phi/thue ngoai o dung UI voi dieu kien DB da
  // enforce san (enforce_phat_sinh_chi_phi_update/enforce_don_thue_ngoai_update,
  // 0064) — chi hien trang thai, khong thay the kiem tra o DB.
  const congViecMap: Record<string, string> = {};
  for (const c of congViecRows ?? []) {
    if (c.nhan_vien_id) congViecMap[c.nhan_vien_id] = c.trang_thai;
  }

  const kh = Array.isArray(order.khach_hang) ? order.khach_hang[0] : order.khach_hang;
  const hangHoa = Array.isArray(order.hang_hoa) ? order.hang_hoa[0] : order.hang_hoa;
  const noiLay = Array.isArray(order.noi_lay) ? order.noi_lay[0] : order.noi_lay;
  const noiDong = Array.isArray(order.noi_dong) ? order.noi_dong[0] : order.noi_dong;
  const noiHa = Array.isArray(order.noi_ha) ? order.noi_ha[0] : order.noi_ha;
  const nguoiTao = Array.isArray(order.nguoi_tao) ? order.nguoi_tao[0] : order.nguoi_tao;
  const salePhuTrach = Array.isArray(order.sale_phu_trach) ? order.sale_phu_trach[0] : order.sale_phu_trach;
  const hienTruongPhuTrach = Array.isArray(order.hien_truong_phu_trach)
    ? order.hien_truong_phu_trach[0]
    : order.hien_truong_phu_trach;
  const chungTuPhuTrach = Array.isArray(order.chung_tu_phu_trach) ? order.chung_tu_phu_trach[0] : order.chung_tu_phu_trach;

  const congViecEntries: CongViecEntry[] = [];
  if (order.hien_truong_phu_trach_id && hienTruongPhuTrach?.ho_ten) {
    congViecEntries.push({
      nhanVienId: order.hien_truong_phu_trach_id,
      hoTen: hienTruongPhuTrach.ho_ten,
      vaiTro: "Hiện trường",
      trangThai: (congViecMap[order.hien_truong_phu_trach_id] ?? "Chưa hoàn thành") as CongViecEntry["trangThai"],
    });
  }
  if (order.chung_tu_phu_trach_id && chungTuPhuTrach?.ho_ten) {
    congViecEntries.push({
      nhanVienId: order.chung_tu_phu_trach_id,
      hoTen: chungTuPhuTrach.ho_ten,
      vaiTro: "Chứng từ",
      trangThai: (congViecMap[order.chung_tu_phu_trach_id] ?? "Chưa hoàn thành") as CongViecEntry["trangThai"],
    });
  }

  const canEditVanChuyen = ["Hiện trường", "Điều phối", "Chứng từ", "Kế toán"].includes(user?.phong_ban ?? "");
  // Sale cung duoc nhap to khai day du (khong chi ho so/trang thai) — nhieu
  // lo khong do Chung tu xu ly nen Chung tu khong nhap to khai, Sale phai
  // tu lam thay theo yeu cau cua Bao Dung (2026-09-19).
  const canEditToKhai = ["Chứng từ", "Sale"].includes(user?.phong_ban ?? "");
  const canEditContainer = canManageDonHang(user?.phong_ban);
  // Dinh/xoa ho so dinh kem cua don hang (va cua tung to khai) — rong hon
  // canEditVanChuyen, co them Sale theo yeu cau + migration 0106.
  const canUploadDinhKem = ["Hiện trường", "Điều phối", "Chứng từ", "Kế toán", "Sale"].includes(user?.phong_ban ?? "");

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{order.so_don_hang}</h1>
          <p className="text-sm text-slate-500">{kh?.ten_viet_tat || kh?.ten_day_du || "—"}</p>
        </div>
        <StatusBadge status={order.trang_thai} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Link href="/don-hang" className="text-sm font-medium text-blue-600">
          ← Danh sách đơn hàng
        </Link>
        <Link
          href={`/tam-ung-giai-chi?don_hang_id=${order.id}`}
          className="ml-auto rounded-lg border border-blue-200 px-2.5 py-1 text-sm font-medium text-blue-600"
        >
          + Ứng tiền nhanh
        </Link>
        {canManageDonHang(user?.phong_ban) && (
          <Link href={`/don-hang/${order.id}/sua`} className="text-sm font-medium text-blue-600">
            Sửa thông tin
          </Link>
        )}
      </div>

      <div className="mb-4">
        <ConfirmButtons
          donHangId={order.id}
          opsXacNhan={order.ops_xac_nhan}
          csXacNhan={order.cs_xac_nhan}
          phongBan={user?.phong_ban ?? ""}
        />
      </div>

      <CongViecHoanThanhSection
        donHangId={order.id}
        initialEntries={congViecEntries}
        currentUserId={user?.id}
        currentPhongBan={user?.phong_ban ?? ""}
      />

      <div className="mb-4 grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-4 text-sm sm:grid-cols-2">
        <Info label="Sale phụ trách" value={salePhuTrach?.ho_ten} />
        <Info label="Hiện trường phụ trách" value={hienTruongPhuTrach?.ho_ten} />
        <Info label="Chứng từ phụ trách" value={chungTuPhuTrach?.ho_ten} />
        <Info label="Loại đơn hàng" value={order.loai_don_hang} />
        <Info label="Loại kích cỡ" value={order.loai_kich_co} />
        <Info label="Đơn vị tính" value={order.dvt} />
        <Info label="Số lượng" value={order.so_luong} />
        <Info label="Số vận đơn / booking" value={order.so_bl_bk} />
        <ContainerSection
          donHangId={order.id}
          initialRows={containerRows ?? []}
          loaiContainerList={loaiContainerList ?? []}
          canEdit={canEditContainer}
        />
        <Info label="Hàng hóa" value={hangHoa?.ten} />
        <Info label="Kích thước" value={order.kich_thuoc} />
        <Info label="Nơi lấy cont/hàng" value={noiLay?.ten} />
        <Info label="Nơi đóng/giao" value={noiDong?.ten} />
        <Info label="Nơi hạ/trả rỗng" value={noiHa?.ten} />
        <Info label="Ngày lên đơn" value={order.ngay_len_don} />
        <Info label="Ngày vận chuyển" value={order.ngay_van_chuyen} />
        <Info label="Hạn lệnh" value={order.han_lenh_ngay ? `${order.han_lenh_ngay} ${order.han_lenh_gio ?? ""}` : null} />
        <Info label="Giá bán" value={order.gia} />
        <Info label="Người tạo" value={nguoiTao?.ho_ten} />
        {order.ghi_chu_van_chuyen && (
          <div className="sm:col-span-2">
            <p className="text-slate-500">Ghi chú vận chuyển</p>
            <p className="font-medium text-slate-900">{order.ghi_chu_van_chuyen}</p>
          </div>
        )}
      </div>

      <div className="mb-4">
        <ToKhaiSection donHangId={order.id} initialRows={toKhaiRows ?? []} canEdit={canEditToKhai} />
      </div>

      <div className="mb-4">
        <ChiTietVanChuyenSection
          donHangId={order.id}
          initialRows={chiTietRows ?? []}
          diaDiemList={diaDiemList ?? []}
          canEdit={canEditVanChuyen}
          goiYDiem={{
            diem_1_id: order.noi_lay_cont_hang_id,
            diem_2_id: order.noi_dong_giao_id,
            diem_3_id: order.noi_ha_tra_rong_id,
          }}
        />
      </div>

      {tamUngDoiChieu.length > 0 && (
        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 text-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Tạm ứng & đã chi cho lô này</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs font-medium text-slate-500">
                <tr>
                  <th className="py-1 pr-3">Nhân viên</th>
                  <th className="py-1 pr-3">Đã tạm ứng</th>
                  <th className="py-1 pr-3">Đã chi (kể cả chi hộ)</th>
                  <th className="py-1 pr-3">Còn lại</th>
                </tr>
              </thead>
              <tbody>
                {tamUngDoiChieu.map((r) => (
                  <tr key={r.nvId} className="border-t border-slate-100">
                    <td className="py-1.5 pr-3 font-medium text-slate-900">{r.ten}</td>
                    <td className="py-1.5 pr-3">{r.tamUng.toLocaleString("en-US")}</td>
                    <td className="py-1.5 pr-3">{r.daChi.toLocaleString("en-US")}</td>
                    <td className={`py-1.5 pr-3 font-medium ${r.conLai < 0 ? "text-red-600" : "text-slate-900"}`}>{r.conLai.toLocaleString("en-US")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            &quot;Đã chi&quot; gồm cả dòng đánh dấu Chi hộ — chi hộ vẫn là tiền rút từ tạm ứng của người đó, vẫn phải trừ.
          </p>
        </div>
      )}

      <div className="mb-4">
        <ChiPhiGopSection
          donHangId={order.id}
          initialChiPhiRows={chiPhiRowsDayDu}
          initialThueNgoaiRows={thueNgoaiRowsDayDu}
          initialPhuThuRows={phuThuRows ?? []}
          loaiChiPhiList={loaiChiPhiList ?? []}
          nhaCungCapList={nhaCungCapList ?? []}
          doiTacThueNgoaiList={doiTacList ?? []}
          chiTietVanChuyenList={chiTietRows ?? []}
          phongBan={user?.phong_ban ?? ""}
          currentUserId={user?.id}
          nhanVienChiPhiTamUngOptions={nhanVienChiPhiTamUngOptions}
          nhanVienThueNgoaiTamUngOptions={nhanVienThueNgoaiTamUngOptions}
          congViecMap={congViecMap}
          donHangSoLuong={order.so_luong}
        />
      </div>

      <div className="mb-4">
        <LineItemsSection
          table="chi_phi_giao_nhan"
          donHangId={order.id}
          soDonHang={order.so_don_hang}
          title="Chi phí giao nhận / chuyến"
          fields={[
            { key: "nhan_vien_id", label: "Nhân viên", type: "select", required: true, options: nhanVienGiaoNhanOptions },
            { key: "loai", label: "Loại", type: "text", required: true },
            { key: "thanh_tien", label: "Thành tiền", type: "number", required: true },
            { key: "ghi_chu", label: "Ghi chú", type: "textarea" },
          ]}
          initialRows={chiPhiGiaoNhanRows ?? []}
          canEdit={user?.phong_ban === "Kế toán"}
        />
      </div>

      {canSeeLoiNhuan && (
        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 text-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Lợi nhuận sơ bộ</h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Info label="Tổng giá bán (+ phụ thu)" value={tongSell.toLocaleString("en-US")} />
            <Info label="Tổng số tiền đã chi (nội bộ)" value={tongBuyNoiBo.toLocaleString("en-US")} />
            <Info label="Chi phí giao nhận/chuyến" value={tongChiPhiGiaoNhan.toLocaleString("en-US")} />
            <Info label="Chi phí thuê ngoài (Module E)" value={tongChiPhiThueNgoai.toLocaleString("en-US")} />
            <Info label="Lợi nhuận trước định phí" value={loiNhuanTruocDinhPhi.toLocaleString("en-US")} />
            <Info
              label="Định phí phân bổ/lô"
              value={`${dinhPhiPhanBo.toLocaleString("en-US")} (${soLoTrongThang ?? 0} lô trong tháng ${monthKey})`}
            />
            <Info label="Lợi nhuận trước hoa hồng" value={loiNhuanTruocHoaHong.toLocaleString("en-US")} />
            <Info
              label={`Hoa hồng Sale (4/10)${salePhuTrach?.ho_ten ? ` — ${salePhuTrach.ho_ten}` : ""}`}
              value={chiPhiSale.toLocaleString("en-US")}
            />
          </div>
          <p className="mt-3 border-t border-slate-100 pt-3 text-base font-semibold text-slate-900">
            Lợi nhuận công ty (6/10): {loiNhuanCongTy.toLocaleString("en-US")}
          </p>
          <p className="mt-2 text-xs text-slate-400">
            * Số liệu sơ bộ — tính cả các dòng chưa duyệt (Nháp/Chờ duyệt), kiểm tra lại trước khi
            chốt sổ chính thức cuối tháng.
          </p>
        </div>
      )}

      <DinhKemSection donHangId={order.id} initialRows={dinhKemRows ?? []} currentUserId={user?.id} canUpload={canUploadDinhKem} />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <p className="text-slate-500">{label}</p>
      <p className="font-medium text-slate-900">{value ?? "—"}</p>
    </div>
  );
}
