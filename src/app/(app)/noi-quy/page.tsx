import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import NoiQuyView from "@/components/common/NoiQuyView";

export default async function NoiQuyPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const { data } = await supabase.from("noi_quy_cong_ty").select("*").order("updated_at", { ascending: false }).limit(1).maybeSingle();

  const canEdit = user?.phong_ban === "Kế toán" || user?.phong_ban === "Giám đốc";

  return (
    <NoiQuyView
      id={data?.id ?? null}
      noiDungBanDau={data?.noi_dung ?? "Chưa có nội dung — Kế toán/Giám đốc bấm \"Sửa nội dung\" để nhập."}
      ngayApDung={data?.ngay_ap_dung ?? null}
      canEdit={canEdit}
    />
  );
}
