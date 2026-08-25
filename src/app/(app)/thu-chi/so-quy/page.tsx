import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import SoQuyView from "@/components/thu-chi/SoQuyView";

export default async function SoQuyPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const allowed = user && (user.phong_ban === "Kế toán" || user.phong_ban === "Giám đốc");
  if (!allowed) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10 text-center">
        <p className="text-slate-600">Bạn không có quyền truy cập mục này.</p>
      </div>
    );
  }

  const { data: rows } = await supabase.from("so_quy").select("*").order("ngay", { ascending: false });

  return <SoQuyView initialRows={rows ?? []} />;
}
