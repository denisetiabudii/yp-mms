"use server";

import { createClient } from "@/lib/supabase/server";

export type ForgotState = {
  error?: string;
  sent?: boolean;
  email?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function requestPasswordResetAction(
  _previous: ForgotState,
  formData: FormData,
): Promise<ForgotState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email) return { error: "Email wajib diisi.", email };
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return { error: "Format email tidak valid.", email };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email);

  if (error?.status === 429 || error?.code === "over_email_send_rate_limit") {
    return {
      error: "Terlalu banyak permintaan. Coba lagi beberapa menit lagi.",
      email,
    };
  }

  if (error) {
    // Dicatat di server saja. Pengguna tetap menerima respons seragam
    // supaya tidak bisa menebak email mana yang terdaftar.
    console.error("[forgot-password] gagal mengirim email pemulihan:", error.code ?? error.message);
  }

  return { sent: true, email };
}
