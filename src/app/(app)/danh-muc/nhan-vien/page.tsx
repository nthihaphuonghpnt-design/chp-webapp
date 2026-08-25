import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import DanhMucManager, { type FieldConfig, type Row } from "@/components/danh-muc/DanhMucManager";

export default async function NhanVienPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const canEdit = user?.phong_ban === "Kế toán" || user?.phong_ban === "Giám đốc";

  if (!canEdit) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10 text-center">
        <p className="text-slate-600">Bạn không có quyền xem mục này (có thông tin lương).</p>
      </div>
    );
  }

  const [{ data: rows }, { data: phongBanList }] = await Promise.all([
    supabase.from("nhan_vien").select("*").order("ho_ten"),
    supabase.from("phong_ban").select("id, ten").order("ten"),
  ]);

  const fields: FieldConfig[] = [
    { key: "ho_ten", label: "Họ tên", type: "text", required: true },
    {
      key: "phong_ban_id",
      label: "Phòng ban",
      type: "select",
      required: true,
      options: (phongBanList ?? []).map((p) => ({ value: p.id, label: p.ten })),
    },
    { key: "email_tai_khoan", label: "Email đăng nhập", type: "email", required: true },
    { key: "so_dien_thoai", label: "Số điện thoại", type: "tel" },
    { key: "luong_co_dinh", label: "Lương cố định", type: "number", hint: "Dùng để tính Bảng lương hàng tháng" },
    {
      key: "muc_dong_bhxh",
      label: "Mức đóng BHXH",
      type: "number",
      hint: "Để trống sẽ mặc định lấy bằng Lương cố định",
    },
  ];

  return (
    <div>
      <DanhMucManager
        table="nhan_vien"
        title="Nhân viên"
        fields={fields}
        initialRows={(rows ?? []) as Row[]}
        canEdit={canEdit}
        searchField="ho_ten"
        statusField="dang_lam_viec"
        statusLabels={{ active: "Đang làm việc", inactive: "Nghỉ việc" }}
      />
      <p className="mx-auto -mt-2 max-w-5xl px-4 pb-6 text-xs text-slate-400">
        Lưu ý: thêm nhân viên ở đây chỉ tạo hồ sơ. Để nhân viên đăng nhập được, vào Supabase
        Dashboard → Authentication → Add user, tạo tài khoản với đúng email đã nhập ở đây — hệ
        thống sẽ tự liên kết.
      </p>
    </div>
  );
}
