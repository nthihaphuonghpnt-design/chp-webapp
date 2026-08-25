import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import DanhMucManager, { type FieldConfig, type Row } from "@/components/danh-muc/DanhMucManager";

export default async function BangGiaKhachHangPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const [{ data }, { data: khachHangList }, { data: loaiChiPhiList }, { data: hangHoaList }] = await Promise.all([
    supabase.from("bang_gia_khach_hang").select("*").order("created_at", { ascending: false }),
    supabase.from("khach_hang").select("id, ten_day_du, ten_viet_tat").eq("dang_hoat_dong", true).order("ten_day_du"),
    supabase.from("loai_chi_phi").select("id, ten").eq("dang_hoat_dong", true).order("ten"),
    supabase.from("hang_hoa").select("id, ten").eq("dang_hoat_dong", true).order("ten"),
  ]);

  const fields: FieldConfig[] = [
    {
      key: "khach_hang_id",
      label: "Khách hàng",
      type: "select",
      required: true,
      options: (khachHangList ?? []).map((k) => ({ value: k.id, label: k.ten_viet_tat || k.ten_day_du })),
    },
    {
      key: "loai_chi_phi_id",
      label: "Loại chi phí",
      type: "select",
      required: true,
      options: (loaiChiPhiList ?? []).map((l) => ({ value: l.id, label: l.ten })),
    },
    {
      key: "hang_hoa_id",
      label: "Mặt hàng",
      type: "select",
      hint: "Để trống nếu áp dụng chung cho mọi mặt hàng",
      options: (hangHoaList ?? []).map((h) => ({ value: h.id, label: h.ten })),
    },
    { key: "don_gia", label: "Đơn giá", type: "number", required: true },
    { key: "don_vi", label: "Đơn vị", type: "text", hint: "VD: /cont 20', /cont 40', /lô, /kg..." },
    { key: "ghi_chu", label: "Ghi chú", type: "textarea", showInList: false },
  ];

  const canEdit = user?.phong_ban === "Sale" || user?.phong_ban === "Kế toán";

  return (
    <div>
      <DanhMucManager
        table="bang_gia_khach_hang"
        title="Bảng giá khách hàng"
        fields={fields}
        initialRows={(data ?? []) as Row[]}
        canEdit={canEdit}
        searchField="khach_hang_id"
      />
      <p className="mx-auto -mt-2 max-w-5xl px-4 pb-6 text-xs text-slate-400">
        Đơn giá đã thỏa thuận sẵn với từng khách hàng, có thể khác nhau theo từng mặt hàng. Khi nhập
        &quot;Chi phí phát sinh&quot; cho đơn hàng, hệ thống sẽ tự gợi ý giá bán theo đúng khách hàng
        + mặt hàng của đơn đó (ưu tiên giá riêng cho mặt hàng, nếu không có sẽ dùng giá chung).
      </p>
    </div>
  );
}
