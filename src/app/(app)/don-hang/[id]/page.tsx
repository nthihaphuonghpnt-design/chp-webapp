import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { canManageDonHang } from "@/lib/permissions";
import StatusBadge from "@/components/don-hang/StatusBadge";
import ConfirmButtons from "@/components/don-hang/ConfirmButtons";
import ChiTietVanChuyenSection from "@/components/don-hang/ChiTietVanChuyenSection";
import DinhKemSection from "@/components/don-hang/DinhKemSection";

export default async function DonHangDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getCurrentUser();

  const [{ data: order }, { data: chiTietRows }, { data: dinhKemRows }, { data: diaDiemList }] = await Promise.all([
    supabase
      .from("don_hang")
      .select(
        "*, khach_hang:khach_hang_id(ten_day_du, ten_viet_tat), loai_cont_hang:loai_cont_hang_id(ten), hang_hoa:hang_hoa_id(ten), noi_lay:noi_lay_cont_hang_id(ten), noi_dong:noi_dong_giao_id(ten), noi_ha:noi_ha_tra_rong_id(ten), nguoi_tao:nguoi_tao_id(ho_ten)"
      )
      .eq("id", id)
      .single(),
    supabase.from("chi_tiet_van_chuyen").select("*").eq("don_hang_id", id).order("ngay_vc"),
    supabase.from("dinh_kem").select("*").eq("don_hang_id", id).order("thoi_gian_upload", { ascending: false }),
    supabase.from("dia_diem").select("id, ten").eq("dang_hoat_dong", true).order("ten"),
  ]);

  if (!order) notFound();

  const kh = Array.isArray(order.khach_hang) ? order.khach_hang[0] : order.khach_hang;
  const loaiCont = Array.isArray(order.loai_cont_hang) ? order.loai_cont_hang[0] : order.loai_cont_hang;
  const hangHoa = Array.isArray(order.hang_hoa) ? order.hang_hoa[0] : order.hang_hoa;
  const noiLay = Array.isArray(order.noi_lay) ? order.noi_lay[0] : order.noi_lay;
  const noiDong = Array.isArray(order.noi_dong) ? order.noi_dong[0] : order.noi_dong;
  const noiHa = Array.isArray(order.noi_ha) ? order.noi_ha[0] : order.noi_ha;
  const nguoiTao = Array.isArray(order.nguoi_tao) ? order.nguoi_tao[0] : order.nguoi_tao;

  const canEditVanChuyen = user?.phong_ban === "Hiện trường" || user?.phong_ban === "Điều phối";

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
        <Info label="Loại container" value={loaiCont?.ten} />
        <Info label="Đơn vị tính" value={order.dvt} />
        <Info label="Số vận đơn / booking" value={order.so_bl_bk} />
        <Info label="Số lô" value={order.so_lo} />
        <Info label="Số container" value={order.so_cont} />
        <Info label="Số seal" value={order.so_seal} />
        <Info label="Hàng hóa" value={hangHoa?.ten} />
        <Info label="Khối lượng" value={order.khoi_luong} />
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
        <ChiTietVanChuyenSection
          donHangId={order.id}
          initialRows={chiTietRows ?? []}
          diaDiemList={diaDiemList ?? []}
          canEdit={canEditVanChuyen}
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
