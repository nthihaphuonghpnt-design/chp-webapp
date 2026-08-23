import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import DanhMucManager, { type FieldConfig, type Row } from "@/components/danh-muc/DanhMucManager";

const fields: FieldConfig[] = [
  { key: "ten", label: "Loại container", type: "text", required: true },
  { key: "ghi_chu", label: "Ghi chú", type: "textarea" },
];

export default async function LoaiContainerPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const { data } = await supabase.from("loai_container").select("*").order("ten");

  return (
    <DanhMucManager
      table="loai_container"
      title="Loại container"
      fields={fields}
      initialRows={(data ?? []) as Row[]}
      canEdit={!!user}
    />
  );
}
