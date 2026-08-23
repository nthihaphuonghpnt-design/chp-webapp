import { getCurrentUser } from "@/lib/auth";

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-semibold text-slate-900">
        Xin chào, {user?.ho_ten ?? ""} 👋
      </h1>
      <p className="mt-1 text-sm text-slate-500">Phòng ban: {user?.phong_ban}</p>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
        <p className="text-sm text-slate-600">
          Hệ thống đang được xây dựng dần theo từng module. Module đầu tiên —{" "}
          <strong>Danh mục dùng chung</strong> — đã sẵn sàng ở menu bên (hoặc menu &quot;Menu&quot;
          trên điện thoại). Các module tiếp theo (Đơn hàng, Hải quan, Chi phí...) sẽ được thêm dần.
        </p>
      </div>
    </div>
  );
}
