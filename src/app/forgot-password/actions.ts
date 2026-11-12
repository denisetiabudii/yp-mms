"use server";

import { isValidEmail, normalizeEmail } from "@/lib/auth/email";
import { createClient } from "@/lib/supabase/server";

export type ForgotState = {
  error?: string;
  sent?: boolean;
  email?: string;
};

export async function requestPasswordResetAction(
  _previous: ForgotState,
  formData: FormData,
): Promise<ForgotState> {
  // formData.get() bisa mengembalikan File. Tolak apa pun selain string.
  const rawEmail = formData.get("email");

  if (typeof rawEmail !== "string") {
    return { error: "Permintaan tidak valid." };
  }

  const email = normalizeEmail(rawEmail);

  if (!email) return { error: "Email wajib diisi.", email };
  if (!isValidEmail(email)) {
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