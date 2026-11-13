"use server";

import { redirect } from "next/navigation";

import { validatePassword } from "@/lib/auth/password";
import { createClient } from "@/lib/supabase/server";

export type ResetState = { error?: string };

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
