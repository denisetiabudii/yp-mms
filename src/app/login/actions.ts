"use server";

import { redirect } from "next/navigation";

import { safeNextPath } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

export type LoginState = {
  error?: string;
  /** Email dikembalikan agar kolom tidak kosong setelah gagal. Password tidak pernah. */
  email?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function signInAction(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNextPath(formData.get("next"));

  if (!email || !password) {
    return { error: "Email dan kata sandi wajib diisi.", email };
  }
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return { error: "Format email tidak valid.", email };
  }
  if (password.length > 128) {
    return { error: "Email atau kata sandi salah.", email };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    if (error?.status === 429 || error?.code === "over_request_rate_limit") {
      return { error: "Terlalu banyak percobaan. Coba lagi beberapa menit lagi.", email };
    }

    // Pesan sengaja seragam agar tidak membocorkan apakah email terdaftar.
    return { error: "Email atau kata sandi salah.", email };
  }

  // FR-001: akun nonaktif tidak boleh masuk.
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_active")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!profile || !profile.is_active) {
    await supabase.auth.signOut({ scope: "local" });

    return {
      error: profile
        ? "Akun Anda dinonaktifkan. Hubungi administrator."
        : "Profil akun belum disiapkan. Hubungi administrator.",
      email,
    };
  }

  // redirect() melempar exception khusus Next.js — jangan dibungkus try/catch.
  redirect(next);
}
