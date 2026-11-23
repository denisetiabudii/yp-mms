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
  const userId = data?.claims?.sub;
  const issuedAt = data?.claims?.iat;
  const { pathname, search } = request.nextUrl;

  /** Redirect yang tetap membawa cookie sesi terbaru dan header cache. */
  function redirectTo(target: URL, status?: number) {
    const response = NextResponse.redirect(target, status);
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

  // Sesi diakhiri pada request berikutnya (bukan hanya saat login, FR-001) jika:
  //  - akun dinonaktifkan atau profilnya tidak ada          -> "inactive"
  //  - admin mengubah profil pengguna setelah sesi terbit   -> "session-revoked"
  //  - status akun tidak bisa diperiksa (layanan terganggu) -> "service-error"
  // Token yang sudah terbit tetap valid sampai kedaluwarsa, jadi pemeriksaan ke
  // database di sini yang sebenarnya menutup aksesnya. Aturan akun sama dengan
  // signInAction: tanpa profil atau is_active=false ditolak.
  if (isAuthenticated && userId && !isPublic(pathname)) {
    const loadProfile = () =>
      supabase
        .from("profiles")
        .select("is_active, session_revoked_at")
        .eq("id", userId)
        .maybeSingle();

    // Satu kali ulang agar galat sesaat (mis. timeout) tidak langsung mengeluarkan pengguna.
    let result = await loadProfile();
    if (result.error) result = await loadProfile();

    const { data: profile, error } = result;

    let reason: "inactive" | "session-revoked" | "service-error" | null = null;
    // "global" mencabut sesi di semua perangkat; hanya untuk akun nonaktif.
    let scope: "global" | "local" = "local";

    if (error) {
      console.error("[proxy] Gagal memeriksa status akun:", error.message);
      reason = "service-error";
    } else if (!profile || !profile.is_active) {
      reason = "inactive";
      scope = "global";
    } else if (
      profile.session_revoked_at &&
      (issuedAt === undefined ||
        issuedAt < Math.floor(Date.parse(profile.session_revoked_at) / 1000))
    ) {
      // Token ini terbit sebelum admin mengubah profil. Masuk lagi menerbitkan
      // token baru yang lolos pemeriksaan ini.
      reason = "session-revoked";
    }

    if (reason) {
      const { error: signOutError } = await supabase.auth.signOut({ scope });

      if (signOutError) {
        // Supabase tidak menghapus cookie jika pemanggilan ke server gagal. Hapus
        // manual, kalau tidak halaman login akan melempar balik ke dashboard
        // dan terjadi putaran redirect.
        request.cookies
          .getAll()
          .filter((cookie) => cookie.name.startsWith("sb-"))
          .forEach((cookie) =>
            supabaseResponse.cookies.set(cookie.name, "", { path: "/", maxAge: 0 }),
          );
      }

      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.search = "";
      loginUrl.searchParams.set("reason", reason);

      // 303 agar request POST (server action) dialihkan sebagai GET.
      return redirectTo(loginUrl, 303);
    }
  }


  // Pengguna yang belum memiliki password hanya boleh mengakses
  // halaman reset-password, termasuk ketika membuka route publik.
  // Halaman reset sendiri dikecualikan agar undangan dan recovery berjalan.
  if (isAuthenticated && userId && pathname !== "/reset-password") {
    let passwordResult = await supabase.rpc("my_password_set");

    // Ulangi sekali jika terjadi gangguan sementara.
    if (passwordResult.error) {
      passwordResult = await supabase.rpc("my_password_set");
    }

    const passwordSet = passwordResult.data;
    const passwordCheckError =
      passwordResult.error || typeof passwordSet !== "boolean";

    if (passwordCheckError) {
      console.error(
        "[proxy] Gagal memeriksa status password:",
        passwordResult.error?.message ?? "Hasil RPC tidak valid",
      );

      const { error: signOutError } = await supabase.auth.signOut({
        scope: "local",
      });

      if (signOutError) {
        request.cookies
          .getAll()
          .filter((cookie) => cookie.name.startsWith("sb-"))
          .forEach((cookie) =>
            supabaseResponse.cookies.set(cookie.name, "", {
              path: "/",
              maxAge: 0,
            }),
          );
      }

      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.search = "";
      loginUrl.searchParams.set("reason", "service-error");

      return redirectTo(loginUrl, 303);
    }

    if (passwordSet === false) {
      const resetUrl = request.nextUrl.clone();
      resetUrl.pathname = "/reset-password";
      resetUrl.search = "";

      return redirectTo(
        resetUrl,
        request.method === "POST" ? 303 : 307,
      );
    }
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