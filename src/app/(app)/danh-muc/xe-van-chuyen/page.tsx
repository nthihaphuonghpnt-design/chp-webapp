import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import DanhMucManager, { type FieldConfig, type Row } from "@/components/danh-muc/DanhMucManager";

export default async function XeVanChuyenPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const [{ data: rows }, { data: doiTacList }] = await Promise.all([
    supabase.from("xe_van_chuyen").select("*").order("so_xe"),
    supabase
      .from("doi_tac_thue_ngoai")
      .select("id, ten")
      .eq("nhom", "Công ty đối tác (vận tải)")
      .order("ten"),
  ]);

  const fields: FieldConfig[] = [
    { key: "so_xe", label: "Số xe", type: "text", required: true },
    { key: "loai_xe", label: "Loại xe", type: "text" },
    {
      key: "doi_tac_thue_ngoai_id",
      label: "Đối tác thuê ngoài (nếu có)",
      type: "select",
      options: (doiTacList ?? []).map((d) => ({ value: d.id, label: d.ten })),
    },
    { key: "ghi_chu", label: "Ghi chú", type: "textarea" },
  ];

  return (
    <DanhMucManager
      table="xe_van_chuyen"
      title="Xe vận chuyển"
      fields={fields}
      initialRows={(rows ?? []) as Row[]}
      canEdit={user?.phong_ban === "Kế toán"}
      searchField="so_xe"
    />
  );
}
