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

  // luong_co_dinh/muc_dong_bhxh khong con select truc tiep tu bang nhan_vien
  // duoc nua (xem migration 0039 — thu hoi quyen SELECT 2 cot nay cho ca
  // "authenticated", vi Supabase dung chung 1 role cho moi phong ban). Lay
  // rieng qua RPC (chi Ke toan/Giam doc goi duoc het) roi gop vao.
  const NHAN_VIEN_COLUMNS = "id, ho_ten, phong_ban_id, email_tai_khoan, so_dien_thoai, so_nguoi_phu_thuoc, dang_lam_viec";
  const [{ data: rowsCoBan }, { data: phongBanList }, { data: luongList }] = await Promise.all([
    supabase.from("nhan_vien").select(NHAN_VIEN_COLUMNS).order("ho_ten"),
    supabase.from("phong_ban").select("id, ten").order("ten"),
    supabase.rpc("luong_cua_nhan_vien"),
  ]);
  const luongMap = new Map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((luongList ?? []) as any[]).map((l) => [l.id as string, l as { luong_co_dinh: number | null; muc_dong_bhxh: number | null }])
  );
  const rows = (rowsCoBan ?? []).map((nv) => ({
    ...nv,
    luong_co_dinh: luongMap.get(nv.id)?.luong_co_dinh ?? null,
    muc_dong_bhxh: luongMap.get(nv.id)?.muc_dong_bhxh ?? null,
  }));

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
    {
      key: "so_nguoi_phu_thuoc",
      label: "Số người phụ thuộc",
      type: "number",
      hint: "Dùng để tính giảm trừ gia cảnh khi tính thuế TNCN",
    },
  ];

  return (
    <div>
      <DanhMucManager
        table="nhan_vien"
        title="Nhân viên"
        fields={fields}
        initialRows={rows as Row[]}
        canEdit={canEdit}
        searchField="ho_ten"
        statusField="dang_lam_viec"
        statusLabels={{ active: "Đang làm việc", inactive: "Nghỉ việc" }}
        selectColumns={NHAN_VIEN_COLUMNS}
      />
      <p className="mx-auto -mt-2 max-w-5xl px-4 pb-6 text-xs text-slate-400">
        Lưu ý: thêm nhân viên ở đây chỉ tạo hồ sơ. Để nhân viên đăng nhập được, vào Supabase
        Dashboard → Authentication → Add user, tạo tài khoản với đúng email đã nhập ở đây — hệ
        thống sẽ tự liên kết.
      </p>
    </div>
  );
}
