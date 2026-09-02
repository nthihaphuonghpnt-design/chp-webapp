import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import DanhMucManager, { type FieldConfig, type Row } from "@/components/danh-muc/DanhMucManager";

const fields: FieldConfig[] = [
  { key: "ngay", label: "Ngày", type: "text", required: true, hint: "yyyy-mm-dd" },
  { key: "ten", label: "Tên ngày lễ", type: "text", required: true },
];

export default async function LichNghiLePage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const canEdit = user?.phong_ban === "Kế toán" || user?.phong_ban === "Giám đốc";

  const { data } = await supabase.from("lich_nghi_le").select("*").order("ngay");

  return (
    <div>
      <DanhMucManager
        table="lich_nghi_le"
        title="Lịch nghỉ lễ"
        fields={fields}
        initialRows={(data ?? []) as Row[]}
        canEdit={canEdit}
        searchField="ten"
      />
      <p className="mx-auto -mt-2 max-w-5xl px-4 pb-6 text-xs text-slate-400">
        Các ngày trong danh sách này tự động được tính là &quot;Nghỉ lễ&quot; trên Chấm công cho mọi
        nhân viên (không bị tính thiếu chấm công, không trừ lương với nhân viên cố định), không cần
        chấm công riêng cho từng người.
      </p>
    </div>
  );
}
