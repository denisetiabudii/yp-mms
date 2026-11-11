"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type ResetState = { error?: string };

/** Aturan minimal; sesuaikan juga di Supabase → Authentication → Password security. */
function validatePassword(password: string) {
  if (password.length < 10) return "Kata sandi minimal 10 karakter.";
  if (password.length > 128) return "Kata sandi maksimal 128 karakter.";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return "Kata sandi harus mengandung huruf dan angka.";
  }
  return null;
}

export async function updatePasswordAction(
  _previous: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  const problem = validatePassword(password);
  if (problem) return { error: problem };
  if (password !== confirm) return { error: "Konfirmasi kata sandi tidak sama." };

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) {
    return { error: "Sesi tidak valid atau sudah berakhir. Minta tautan baru melalui Lupa Password." };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    if (error.code === "same_password") {
      return { error: "Kata sandi baru tidak boleh sama dengan kata sandi lama." };
    }
    if (error.code === "weak_password") {
      return { error: "Kata sandi terlalu lemah. Gunakan kombinasi yang lebih sulit ditebak." };
    }

    console.error("[reset-password] gagal memperbarui kata sandi:", error.code ?? error.message);
    return { error: "Gagal memperbarui kata sandi. Coba lagi atau minta tautan baru." };
  }

  redirect("/dashboard");
}
