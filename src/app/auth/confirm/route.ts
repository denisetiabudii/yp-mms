import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

/** Hanya tautan undangan dan pemulihan yang diterima; keduanya berujung ke pembuatan kata sandi. */
const ALLOWED_TYPES: EmailOtpType[] = ["invite", "recovery"];

/**
 * Menukar token_hash dari email (undangan / reset password) menjadi sesi.
 * Template email Supabase harus mengarah ke:
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery
 * (lihat supabase/email-templates.md)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (tokenHash && type && ALLOWED_TYPES.includes(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

    if (!error) redirect("/reset-password");
  }

  redirect("/login?reason=link-invalid");
}
