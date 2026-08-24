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
import ChiPhiSection from "@/components/don-hang/ChiPhiSection";
import LineItemsSection from "@/components/don-hang/LineItemsSection";

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
    { data: bangGiaAll },
  ] = await Promise.all([
    supabase
      .from("don_hang")
      .select(
        "*, khach_hang:khach_hang_id(ten_day_du, ten_viet_tat), hang_hoa:hang_hoa_id(ten), noi_lay:noi_lay_cont_hang_id(ten), noi_dong:noi_dong_giao_id(ten), noi_ha:noi_ha_tra_rong_id(ten), nguoi_tao:nguoi_tao_id(ho_ten)"
      )
      .eq("id", id)
      .single(),
    supabase.from("don_hang_container").select("*").eq("don_hang_id", id).order("created_at"),
    supabase.from("to_khai_hai_quan").select("*").eq("don_hang_id", id).order("created_at"),
    supabase.from("chi_tiet_van_chuyen").select("*").eq("don_hang_id", id).order("ngay_vc"),
    supabase.from("dinh_kem").select("*").eq("don_hang_id", id).order("thoi_gian_upload", { ascending: false }),
    supabase.from("dia_diem").select("id, ten, ma_dia_diem, dia_chi, khu_vuc").eq("dang_hoat_dong", true).order("ten"),
    supabase.from("loai_container").select("id, ten").eq("dang_hoat_dong", true).order("ten"),
    supabase.from("phat_sinh_chi_phi").select("*").eq("don_hang_id", id).order("created_at", { ascending: false }),
    supabase.from("phu_thu").select("*").eq("don_hang_id", id).order("created_at", { ascending: false }),
    supabase.from("chi_phi_giao_nhan").select("*").eq("don_hang_id", id).order("created_at", { ascending: false }),
    supabase.from("loai_chi_phi").select("id, ten").eq("dang_hoat_dong", true).order("ten"),
    supabase.from("nha_cung_cap").select("id, ten").eq("dang_hoat_dong", true).order("ten"),
    supabase.from("bang_gia_khach_hang").select("*").eq("dang_hoat_dong", true),
  ]);

  if (!order) notFound();

  const bangGiaList = (bangGiaAll ?? []).filter((b) => b.khach_hang_id === order.khach_hang_id);

  const kh = Array.isArray(order.khach_hang) ? order.khach_hang[0] : order.khach_hang;
  const hangHoa = Array.isArray(order.hang_hoa) ? order.hang_hoa[0] : order.hang_hoa;
  const noiLay = Array.isArray(order.noi_lay) ? order.noi_lay[0] : order.noi_lay;
  const noiDong = Array.isArray(order.noi_dong) ? order.noi_dong[0] : order.noi_dong;
  const noiHa = Array.isArray(order.noi_ha) ? order.noi_ha[0] : order.noi_ha;
  const nguoiTao = Array.isArray(order.nguoi_tao) ? order.nguoi_tao[0] : order.nguoi_tao;

  const canEditVanChuyen = user?.phong_ban === "Hiện trường" || user?.phong_ban === "Điều phối";
  const canEditToKhai = user?.phong_ban === "Chứng từ";
  const canEditContainer = canManageDonHang(user?.phong_ban);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{order.so_don_hang}</h1>
          <p className="text-sm text-slate-500">{kh?.ten_viet_tat || kh?.ten_day_du || "—"}</p>
        </div>
        <StatusBadge status={order.trang_thai} />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/don-hang" className="text-sm font-medium text-blue-600">
          ← Danh sách đơn hàng
        </Link>
        {canManageDonHang(user?.phong_ban) && (
          <Link href={`/don-hang/${order.id}/sua`} className="ml-auto text-sm font-medium text-blue-600">
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

      <div className="mb-4 grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-4 text-sm sm:grid-cols-2">
        <Info label="Loại đơn hàng" value={order.loai_don_hang} />
        <Info label="Loại kích cỡ" value={order.loai_kich_co} />
        <Info label="Đơn vị tính" value={order.dvt} />
        <Info label="Số lượng" value={order.so_luong} />
        <Info label="Số vận đơn / booking" value={order.so_bl_bk} />
        <Info label="Số lô" value={order.so_lo} />
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
        <ContainerSection
          donHangId={order.id}
          initialRows={containerRows ?? []}
          loaiContainerList={loaiContainerList ?? []}
          canEdit={canEditContainer}
        />
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
        />
      </div>

      <div className="mb-4">
        <ChiPhiSection
          donHangId={order.id}
          soDonHang={order.so_don_hang}
          initialRows={chiPhiRows ?? []}
          loaiChiPhiList={loaiChiPhiList ?? []}
          nhaCungCapList={nhaCungCapList ?? []}
          bangGiaList={bangGiaList}
          phongBan={user?.phong_ban ?? ""}
        />
      </div>

      <div className="mb-4">
        <LineItemsSection
          table="phu_thu"
          donHangId={order.id}
          soDonHang={order.so_don_hang}
          title="Phụ thu khách hàng"
          fields={[
            { key: "loai_phu_thu", label: "Loại phụ thu", type: "text", required: true },
            { key: "thanh_tien", label: "Thành tiền", type: "number", required: true },
            { key: "ghi_chu", label: "Ghi chú", type: "textarea" },
          ]}
          initialRows={phuThuRows ?? []}
          canEdit={user?.phong_ban === "Sale" || user?.phong_ban === "Kế toán"}
        />
      </div>

      <div className="mb-4">
        <LineItemsSection
          table="chi_phi_giao_nhan"
          donHangId={order.id}
          soDonHang={order.so_don_hang}
          title="Chi phí giao nhận / chuyến"
          fields={[
            { key: "loai", label: "Loại", type: "text", required: true },
            { key: "thanh_tien", label: "Thành tiền", type: "number", required: true },
            { key: "ghi_chu", label: "Ghi chú", type: "textarea" },
          ]}
          initialRows={chiPhiGiaoNhanRows ?? []}
          canEdit={user?.phong_ban === "Kế toán"}
        />
      </div>

      <DinhKemSection donHangId={order.id} initialRows={dinhKemRows ?? []} currentUserId={user?.id} />
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
