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

  // Nhan vien da nghi viec (dang_lam_viec=false): KHONG con truy van rieng o
  // day nua — tung them 1 round-trip Supabase o day tren MOI request (kem
  // theo round-trip auth.getUser() ben tren = 2 lan/trang), la nguyen nhan
  // chinh gay "dang nhap lau, phan hoi cham" toan he thong sau go-live. Kiem
  // tra nay hoan toan trung voi cai getCurrentUser() (src/lib/auth.ts) DA
  // lam va (app)/layout.tsx DA redirect ve /login neu null — chay ngay sau
  // middleware nay, truoc khi bat ky noi dung bao ve nao duoc render, nen bo
  // o day khong mo ra khoang ho nao. Lop bao ve THAT SU van la
  // current_phong_ban() tra ve NULL qua RLS (xem comment cu) — khong doi.

  if (user && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
