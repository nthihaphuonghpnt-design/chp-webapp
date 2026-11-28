"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ConfirmDialog from "@/components/common/ConfirmDialog";

/**
 * D1 muc 3 (27/11/2026): "Nut Da thu du nhanh tren lo (tu tao dong thu + ngay
 * thu) cho cac lo xuat hoa don truc tiep cho khach le" — gop 2 buoc da co san
 * (tao hoa don tu lo + Thu tien) thanh 1 thao tac, dung LAI dung quy trinh/RPC
 * da duoc kiem thu (thu_tien_hoa_don_xuat qua migration 0099) thay vi tu viet
 * logic moi — chi danh cho lo CHUA co hoa don nao va con phai thu > 0.
 */
export default function DaThuDuNhanhButton({
  donHangId,
  soDonHang,
  khachHangId,
  congNo,
}: {
  donHangId: string;
  soDonHang: string;
  khachHangId: string;
  congNo: { dichVuTruocVat: number; vat: number; chiHo: number; tongPhaiThu: number };
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [mo, setMo] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const [dangLuu, setDangLuu] = useState(false);

  async function xacNhan(values: Record<string, string>) {
    if (dangLuu) return;
    setDangLuu(true);
    setLoi(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: nv } = await supabase.from("nhan_vien").select("id").eq("auth_user_id", user?.id).single();

    const vatPercent = congNo.dichVuTruocVat > 0 ? Math.round((congNo.vat / congNo.dichVuTruocVat) * 100) : 0;
    const { data: hd, error: errHd } = await supabase
      .from("hoa_don_xuat")
      .insert({
        khach_hang_id: khachHangId,
        so_hoa_don: values.so_hoa_don || null,
        ngay_xuat: values.ngay_xuat,
        tong_tien_truoc_thue: congNo.dichVuTruocVat,
        vat_percent: vatPercent,
        tien_vat: congNo.vat,
        tien_chi_ho: congNo.chiHo || null,
        trang_thai_thanh_toan: "Chưa thu",
        ky_ke_khai: values.ngay_xuat.slice(0, 7),
        ghi_chu: "Đã thu đủ nhanh (khách lẻ)",
        nguoi_tao_id: nv?.id,
      })
      .select("id")
      .single();
    if (errHd || !hd) {
      setDangLuu(false);
      setLoi(errHd?.message ?? "Không tạo được hóa đơn.");
      return;
    }
    const { error: errLk } = await supabase.from("hoa_don_don_hang").insert({ hoa_don_id: hd.id, don_hang_id: donHangId });
    if (errLk) {
      setDangLuu(false);
      setLoi(errLk.message);
      return;
    }
    const { error: errThu } = await supabase.rpc("thu_tien_hoa_don_xuat", {
      p_hoa_don_id: hd.id,
      p_so_tien: congNo.tongPhaiThu,
      p_phuong_thuc: values.phuong_thuc,
      p_ghi_chu: "Đã thu đủ nhanh (khách lẻ)",
    });
    setDangLuu(false);
    if (errThu) {
      setLoi(`Đã tạo hóa đơn nhưng chưa ghi nhận thu tiền được: ${errThu.message}. Vào Hóa đơn xuất để thu tiền thủ công.`);
      return;
    }
    setMo(false);
    router.refresh();
  }

  if (congNo.tongPhaiThu <= 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setMo(true)}
        className="rounded-lg border border-emerald-200 px-2.5 py-1 text-sm font-medium text-emerald-700"
      >
        Đã thu đủ nhanh (khách lẻ)
      </button>
      {mo && (
        <ConfirmDialog
          title={`Đã thu đủ nhanh — ${soDonHang}`}
          message={`Tự tạo 1 hóa đơn cho tổng phải thu ${congNo.tongPhaiThu.toLocaleString("en-US")} (dịch vụ ${congNo.dichVuTruocVat.toLocaleString("en-US")} + VAT ${congNo.vat.toLocaleString("en-US")} + chi hộ ${congNo.chiHo.toLocaleString("en-US")}) và đánh dấu đã thu đủ ngay. Dùng khi khách lẻ trả gọn 1 lần, không cần qua 2 bước riêng.${loi ? `\n\n${loi}` : ""}`}
          fields={[
            { key: "so_hoa_don", label: "Số hóa đơn (tùy chọn)", placeholder: "Để trống nếu chưa có số" },
            { key: "ngay_xuat", label: "Ngày thu", required: true, defaultValue: new Date().toISOString().slice(0, 10), placeholder: "yyyy-mm-dd" },
            {
              key: "phuong_thuc",
              label: "Phương thức thu",
              type: "select",
              defaultValue: "Tiền mặt",
              options: [
                { value: "Tiền mặt", label: "Tiền mặt" },
                { value: "Tài khoản công ty", label: "Tài khoản công ty" },
              ],
            },
          ]}
          confirmLabel={dangLuu ? "Đang lưu..." : "Xác nhận"}
          onCancel={() => setMo(false)}
          onConfirm={xacNhan}
        />
      )}
    </>
  );
}
