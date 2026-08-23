import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import DanhMucManager, { type FieldConfig, type Row } from "@/components/danh-muc/DanhMucManager";

const fields: FieldConfig[] = [
  { key: "ten", label: "Tên địa điểm", type: "text", required: true },
  {
    key: "loai",
    label: "Loại",
    type: "select",
    options: [
      { value: "Cảng", label: "Cảng" },
      { value: "Kho", label: "Kho" },
      { value: "Nơi giao nhận", label: "Nơi giao nhận" },
      { value: "Khác", label: "Khác" },
    ],
  },
  { key: "dia_chi", label: "Địa chỉ", type: "text" },
  { key: "ghi_chu", label: "Ghi chú", type: "textarea" },
];

export default async function DiaDiemPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const { data } = await supabase.from("dia_diem").select("*").order("ten");

  return (
    <DanhMucManager
      table="dia_diem"
      title="Địa điểm"
      fields={fields}
      initialRows={(data ?? []) as Row[]}
      canEdit={user?.phong_ban === "Kế toán"}
    />
  );
}
