import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseEnv } from "./env";

/**
 * Halaman yang boleh dibuka tanpa login. Selain ini WAJIB login
 * (default deny, PRD 5.1).
 */
const PUBLIC_PATHS = ["/login", "/forgot-password", "/auth/confirm"];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

/**
 * Menyegarkan sesi Supabase di setiap request dan melindungi halaman.
 * Identitas diverifikasi dengan getClaims() — jangan memakai getSession()
 * di sisi server karena cookie-nya tidak divalidasi ulang.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const { url, key } = getSupabaseEnv();

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // Jangan menyisipkan kode lain antara createServerClient dan getClaims().
  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = !!data?.claims;
  const { pathname, search } = request.nextUrl;

  /** Redirect yang tetap membawa cookie sesi terbaru dan header cache. */
  function redirectTo(target: URL) {
    const response = NextResponse.redirect(target);
    supabaseResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));

    for (const header of ["cache-control", "expires", "pragma"]) {
      const value = supabaseResponse.headers.get(header);
      if (value) response.headers.set(header, value);
    }

    return response;
  }

  if (!isAuthenticated && !isPublic(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";

    if (pathname !== "/") loginUrl.searchParams.set("next", `${pathname}${search}`);

    return redirectTo(loginUrl);
  }

  // Pengguna yang sudah login tidak perlu melihat halaman login lagi.
  if (isAuthenticated && pathname === "/login") {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    dashboardUrl.search = "";

    return redirectTo(dashboardUrl);
  }

  return supabaseResponse;
}