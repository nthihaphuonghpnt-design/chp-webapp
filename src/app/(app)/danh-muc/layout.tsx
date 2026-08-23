import { getCurrentUser } from "@/lib/auth";

export default async function DanhMucLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10 text-center">
        <p className="text-slate-600">Bạn không có quyền truy cập mục này.</p>
      </div>
    );
  }

  return <>{children}</>;
}
