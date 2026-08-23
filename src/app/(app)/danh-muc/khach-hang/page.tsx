import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import DanhMucManager, { type FieldConfig, type Row } from "@/components/danh-muc/DanhMucManager";

const fields: FieldConfig[] = [
  { key: "ma_so_thue", label: "Mã số thuế", type: "text", hint: "Nhập rồi rời khỏi ô để tự động tra cứu tên, địa chỉ" },
  { key: "ten_day_du", label: "Tên đầy đủ", type: "text", required: true },
  { key: "ten_viet_tat", label: "Tên viết tắt", type: "text" },
  { key: "dia_chi", label: "Địa chỉ", type: "text", showInList: false },
  { key: "nguoi_lien_he", label: "Người liên hệ", type: "text", showInList: false },
  { key: "dien_thoai", label: "Điện thoại", type: "tel" },
  { key: "email", label: "Email", type: "email", showInList: false },
  { key: "ghi_chu", label: "Ghi chú", type: "textarea", showInList: false },
];

export default async function KhachHangPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const { data } = await supabase.from("khach_hang").select("*").order("ten_day_du");

  return (
    <DanhMucManager
      table="khach_hang"
      title="Khách hàng"
      fields={fields}
      initialRows={(data ?? []) as Row[]}
      canEdit={!!user}
      searchField="ten_day_du"
      extraSearchFields={["ten_viet_tat", "ma_so_thue"]}
      taxLookup={{ taxField: "ma_so_thue", nameField: "ten_day_du", addressField: "dia_chi" }}
    />
  );
}
