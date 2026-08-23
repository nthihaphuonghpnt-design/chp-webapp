import { getCurrentUser } from "@/lib/auth";

export default async function DanhMucLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const allowed = user && ["Kế toán", "Giám đốc"].includes(user.phong_ban);

  if (!allowed) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10 text-center">
        <p className="text-slate-600">
          Bạn không có quyền truy cập mục này. Vui lòng liên hệ Kế toán nếu cần hỗ trợ.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
