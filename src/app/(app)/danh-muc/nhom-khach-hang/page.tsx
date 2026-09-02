import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import DanhMucManager, { type FieldConfig, type Row } from "@/components/danh-muc/DanhMucManager";

const fields: FieldConfig[] = [
  { key: "ten", label: "Tên nhóm", type: "text", required: true, hint: "Ví dụ: Apple Trans — dùng để gom các công ty con lại cho dễ lọc" },
  { key: "ghi_chu", label: "Ghi chú", type: "textarea", showInList: false },
];

export default async function NhomKhachHangPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const { data } = await supabase.from("nhom_khach_hang").select("*").order("ten");

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
        Nhóm chỉ dùng để gom các công ty con của cùng 1 mối quan hệ (ví dụ Apple Trans có 3-4 công ty con
        Hồng Ngọc/Amal/Asus) cho dễ lọc — mỗi công ty con vẫn là 1 Khách hàng riêng, có MST/địa chỉ riêng, hóa
        đơn và công nợ vẫn tính đúng theo từng công ty như bình thường. Gán nhóm cho từng khách hàng ở{" "}
        <a href="/danh-muc/khach-hang" className="text-blue-600 underline">
          Danh mục → Khách hàng
        </a>
        .
      </p>
    </div>
  );
}
