import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import DanhMucManager, { type FieldConfig, type Row } from "@/components/danh-muc/DanhMucManager";

const baseFields: FieldConfig[] = [
  { key: "ten", label: "Tên nhóm", type: "text", required: true, hint: "Ví dụ: Apple Trans — dùng để gom các công ty con lại cho dễ lọc" },
  { key: "ghi_chu", label: "Ghi chú", type: "textarea", showInList: false },
];

export default async function NhomKhachHangPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const { data } = await supabase.from("nhom_khach_hang").select("*").order("ten");
  // Chi hien truong nay khi da chay migration 0129 (cot chua co -> truy van loi).
  const { error: chuaCoCot } = await supabase.from("nhom_khach_hang").select("khach_hang_me_id").limit(1);
  let fields = baseFields;
  if (!chuaCoCot) {
    const { data: khachList } = await supabase.from("khach_hang").select("id, ten_day_du, ten_viet_tat").eq("dang_hoat_dong", true).order("ten_day_du");
    fields = [
      baseFields[0],
      {
        key: "khach_hang_me_id",
        label: "Công ty mẹ (nhận hóa đơn dịch vụ)",
        type: "select",
        options: (khachList ?? []).map((k) => ({ value: k.id, label: k.ten_viet_tat || k.ten_day_du })),
        hint: "Hóa đơn dịch vụ của các công ty con trong nhóm mặc định xuất cho công ty này; hóa đơn chi hộ vẫn xuất cho công ty con",
      },
      ...baseFields.slice(1),
    ];
  }

  return (
    <div>
      <DanhMucManager
        table="nhom_khach_hang"
        title="Nhóm khách hàng"
        fields={fields}
        initialRows={(data ?? []) as Row[]}
        canEdit={!!user}
        searchField="ten"
      />
      <p className="mx-auto -mt-2 max-w-5xl px-4 pb-6 text-xs text-slate-400">
        Nhóm gom các công ty của cùng 1 mối quan hệ (ví dụ Apple Trans gồm Hồng Mộc/Amal/Atlas) — mỗi công ty
        vẫn là 1 Khách hàng riêng, có MST/địa chỉ riêng. Nếu nhóm có khai Công ty mẹ thì hóa đơn dịch vụ xuất cho
        công ty mẹ, hóa đơn chi hộ xuất cho công ty con. Gán nhóm cho từng khách hàng ở{" "}
        <a href="/danh-muc/khach-hang" className="text-blue-600 underline">
          Danh mục → Khách hàng
        </a>
        .
      </p>
    </div>
  );
}
