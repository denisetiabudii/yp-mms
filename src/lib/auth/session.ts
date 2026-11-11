import { cache } from "react";

import { isAppRole, ROLE_LABELS, type AppRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  email: string;
  fullName: string;
  role: AppRole;
  roleLabel: string;
};

export type SessionState =
  | { status: "anonymous" }
  | { status: "blocked"; reason: "no-profile" | "inactive" }
  | { status: "ok"; user: CurrentUser };

/**
 * Status sesi untuk Server Component. Identitas diverifikasi lewat
 * getClaims(); profil/role dibaca dari tabel profiles (dibatasi RLS).
 * cache() membuat query hanya berjalan sekali per request.
 */
export const getSessionState = cache(async (): Promise<SessionState> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims?.sub) return { status: "anonymous" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, is_active")
    .eq("id", claims.sub)
    .maybeSingle();

  const role: unknown = profile?.role;

  if (!profile || !isAppRole(role)) return { status: "blocked", reason: "no-profile" };
  if (!profile.is_active) return { status: "blocked", reason: "inactive" };

  return {
    status: "ok",
    user: {
      id: claims.sub,
      email: typeof claims.email === "string" ? claims.email : "",
      fullName: profile.full_name,
      role,
      roleLabel: ROLE_LABELS[role],
    },
  };
});
