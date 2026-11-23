
import { cache } from "react";

import { isAppRole, ROLE_LABELS, type AppRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  email: string;
  fullName: string;
  role: AppRole;
  roleLabel: string;
  /** Sudah memiliki kata sandi di Supabase Auth. */
  passwordSet: boolean;
};

export type SessionState =
  | { status: "anonymous" }
  | { status: "blocked"; reason: "no-profile" | "inactive" }
  | { status: "password-pending"; user: CurrentUser }
  | { status: "error"; reason: "password-check-failed" }
  | { status: "ok"; user: CurrentUser };

/**
 * Status sesi untuk Server Component.
 * Identitas diverifikasi lewat getClaims(); profil/role dibaca dari tabel profiles.
 * cache() membuat query hanya berjalan sekali per request.
 */
export const getSessionState = cache(async (): Promise<SessionState> => {
  const supabase = await createClient();
  const { data, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError) {
    console.error("[sesi] Gagal memverifikasi identitas:", claimsError.message);
    return { status: "error", reason: "password-check-failed" };
  }

  const claims = data?.claims;

  if (!claims?.sub) return { status: "anonymous" };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, role, is_active")
    .eq("id", claims.sub)
    .maybeSingle();

  if (profileError) {
    console.error("[sesi] Gagal membaca profil:", profileError.message);
    return { status: "error", reason: "password-check-failed" };
  }

  const role: unknown = profile?.role;

  if (!profile || !isAppRole(role)) {
    return { status: "blocked", reason: "no-profile" };
  }

  if (!profile.is_active) {
    return { status: "blocked", reason: "inactive" };
  }

  const { data: passwordSet, error: passwordError } =
    await supabase.rpc("my_password_set");

  if (passwordError || typeof passwordSet !== "boolean") {
    console.error(
      "[sesi] Gagal memeriksa password:",
      passwordError?.code ?? "respons tidak valid",
    );

    return { status: "error", reason: "password-check-failed" };
  }

  const user: CurrentUser = {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : "",
    fullName: profile.full_name,
    role,
    roleLabel: ROLE_LABELS[role],
    passwordSet,
  };

  if (!passwordSet) {
    return { status: "password-pending", user };
  }

  return { status: "ok", user };
});
