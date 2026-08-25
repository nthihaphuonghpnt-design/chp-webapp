import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import DanhMucManager, { type FieldConfig, type Row } from "@/components/danh-muc/DanhMucManager";

const fields: FieldConfig[] = [
  { key: "thang_nam", label: "Tháng (YYYY-MM)", type: "text", required: true },
  { key: "khoan_muc", label: "Khoản mục", type: "text", required: true },
  { key: "so_tien", label: "Số tiền", type: "number", required: true },
];

export default async function DinhPhiThangPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const { data } = await supabase
    .from("dinh_phi_thang")
    .select("*")
    .order("thang_nam", { ascending: false });

  const canEdit = user?.phong_ban === "Kế toán";

  return (
    <div>
      {canEdit && (
        <div className="mx-auto max-w-5xl px-4 pt-4">
          <Link href="/chi-phi/bang-luong" className="text-sm font-medium text-blue-600 underline">
            → Xem Bảng lương (tính lương + BHXH + thuế TNCN từng nhân viên)
          </Link>
        </div>
      )}
      <DanhMucManager
        table="dinh_phi_thang"
        title="Định phí tháng"
        fields={fields}
        initialRows={(data ?? []) as Row[]}
        canEdit={canEdit}
        searchField="thang_nam"
        extraSearchFields={["khoan_muc"]}
        statusLabels={{ active: "Chưa phân bổ", inactive: "Đã phân bổ" }}
      />
      {canEdit && (
        <p className="mx-auto -mt-2 max-w-5xl px-4 pb-6 text-xs text-slate-400">
          Định phí tháng dùng để phân bổ đều cho các lô hàng phát sinh trong tháng đó khi tính lợi
          nhuận (Định phí phân bổ/lô = Tổng định phí tháng ÷ Số lô hàng trong tháng).
        </p>
      )}
    </div>
  );
}
