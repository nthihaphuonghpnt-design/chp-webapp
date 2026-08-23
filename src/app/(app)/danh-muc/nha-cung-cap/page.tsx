import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import DanhMucManager, { type FieldConfig, type Row } from "@/components/danh-muc/DanhMucManager";

const fields: FieldConfig[] = [
  { key: "ma_so_thue", label: "Mã số thuế", type: "text", hint: "Nhập rồi rời khỏi ô để tự động tra cứu tên, địa chỉ" },
  { key: "ten", label: "Tên nhà cung cấp", type: "text", required: true },
  { key: "dia_chi", label: "Địa chỉ", type: "text", showInList: false },
  { key: "nguoi_lien_he", label: "Người liên hệ", type: "text" },
  { key: "dien_thoai", label: "Điện thoại", type: "tel" },
  { key: "email", label: "Email", type: "email", showInList: false },
  { key: "ghi_chu", label: "Ghi chú", type: "textarea", showInList: false },
];

export default async function NhaCungCapPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const { data } = await supabase.from("nha_cung_cap").select("*").order("ten");

  return (
    <DanhMucManager
      table="nha_cung_cap"
      title="Nhà cung cấp / Đối tác"
      fields={fields}
      initialRows={(data ?? []) as Row[]}
      canEdit={!!user}
      taxLookup={{ taxField: "ma_so_thue", nameField: "ten", addressField: "dia_chi" }}
    />
  );
}
