import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoginPage = request.nextUrl.pathname.startsWith("/login");

  if (!user && !isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Nhan vien da nghi viec (dang_lam_viec=false): chan ngay tu day thay vi
  // chi an khoi UI — dang xuat cuong buc de session cu (con hieu luc theo
  // JWT) khong the tiep tuc dieu huong sang trang khac. Day la lop UX/chan
  // som; lop bao ve THAT SU la current_phong_ban() tra ve NULL cho nguoi da
  // nghi viec (xem migration rieng), vi goi Supabase API truc tiep tu trinh
  // duyet (khong qua Next.js server) se khong bao gio di qua middleware nay.
  if (user && !isLoginPage) {
    const { data: nv } = await supabase.from("nhan_vien").select("dang_lam_viec").eq("auth_user_id", user.id).single();
    if (nv && nv.dang_lam_viec === false) {
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  }

  if (user && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
