import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import DanhMucManager, { type FieldConfig, type Row } from "@/components/danh-muc/DanhMucManager";

const fields: FieldConfig[] = [
  { key: "ten", label: "Tên hàng hóa", type: "text", required: true },
  { key: "ghi_chu", label: "Ghi chú", type: "textarea" },
];

export default async function HangHoaPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const { data } = await supabase.from("hang_hoa").select("*").order("ten");

  return (
    <DanhMucManager
      table="hang_hoa"
      title="Hàng hóa"
      fields={fields}
      initialRows={(data ?? []) as Row[]}
      canEdit={!!user}
    />
  );
}
