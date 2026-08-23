import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import AppNav from "@/components/layout/AppNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col sm:flex-row">
      <AppNav user={user} />
      <main className="flex-1 pb-20 sm:pb-0">{children}</main>
    </div>
  );
}
