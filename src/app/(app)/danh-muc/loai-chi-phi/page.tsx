import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import DanhMucManager, { type FieldConfig, type Row } from "@/components/danh-muc/DanhMucManager";

const fields: FieldConfig[] = [
  { key: "ten", label: "Tên loại chi phí", type: "text", required: true },
  { key: "nhom_chi_phi", label: "Nhóm chi phí", type: "text" },
  { key: "ghi_chu", label: "Ghi chú", type: "textarea" },
];

export default async function LoaiChiPhiPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const { data } = await supabase.from("loai_chi_phi").select("*").order("ten");

  return (
    <DanhMucManager
      table="loai_chi_phi"
      title="Loại chi phí"
      fields={fields}
      initialRows={(data ?? []) as Row[]}
      canEdit={user?.phong_ban === "Kế toán"}
    />
  );
}
