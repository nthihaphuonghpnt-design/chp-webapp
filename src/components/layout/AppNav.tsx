"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CurrentUser } from "@/lib/auth";

interface NavItem {
  href: string;
  label: string;
  /** Phòng ban được phép thấy mục này. Để trống = mọi người thấy. */
  roles?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Trang chủ" },
  { href: "/don-hang", label: "Đơn hàng" },
  { href: "/chi-phi/dinh-phi-thang", label: "Định phí tháng", roles: ["Kế toán", "Giám đốc"] },
  { href: "/danh-muc", label: "Danh mục dùng chung" },
];

export default function AppNav({ user }: { user: CurrentUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const visibleItems = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(user.phong_ban));

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <>
      {/* Top bar (mobile) */}
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:hidden">
        <span className="font-semibold text-slate-900">CHP</span>
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600"
        >
          Menu
        </button>
      </header>

      {menuOpen && (
        <div className="border-b border-slate-200 bg-white px-4 py-2 sm:hidden">
          <p className="px-1 py-2 text-sm text-slate-500">
            {user.ho_ten} · {user.phong_ban}
          </p>
          {visibleItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className={`block rounded-lg px-3 py-2 text-sm font-medium ${
                isActive(item.href) ? "bg-blue-50 text-blue-700" : "text-slate-700"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <button
            onClick={handleSignOut}
            className="mt-1 block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600"
          >
            Đăng xuất
          </button>
        </div>
      )}

      {/* Sidebar (desktop) */}
      <aside className="hidden w-60 flex-col border-r border-slate-200 bg-white sm:flex">
        <div className="border-b border-slate-100 px-5 py-5">
          <p className="font-semibold text-slate-900">CHP</p>
          <p className="text-xs text-slate-500">Quản lý nội bộ</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
          {visibleItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                isActive(item.href)
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-slate-100 px-5 py-4">
          <p className="text-sm font-medium text-slate-900">{user.ho_ten}</p>
          <p className="mb-3 text-xs text-slate-500">{user.phong_ban}</p>
          <button
            onClick={handleSignOut}
            className="text-sm font-medium text-red-600 hover:underline"
          >
            Đăng xuất
          </button>
        </div>
      </aside>
    </>
  );
}
