"use server";

import { revalidatePath } from "next/cache";

import { PASSWORD_MAX, validatePassword } from "@/lib/auth/password";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string; success?: string };

/** Ubah nama lengkap. RLS + hak kolom di database hanya mengizinkan full_name milik sendiri. */
export async function updateProfileAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const fullName = String(formData.get("fullName") ?? "").trim().replace(/\s+/g, " ");

  if (fullName.length < 2) return { error: "Nama lengkap minimal 2 karakter." };
  if (fullName.length > 120) return { error: "Nama lengkap maksimal 120 karakter." };

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims?.sub) return { error: "Sesi berakhir. Silakan masuk lagi." };

  const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", data.claims.sub);

  if (error) {
    console.error("[account] gagal memperbarui profil:", error.code ?? error.message);
    return { error: "Gagal menyimpan profil. Coba lagi." };
  }

  // Header memuat nama dari layout server; segarkan agar langsung berubah.
  revalidatePath("/", "layout");

  return { success: "Profil diperbarui." };
}

/** Ganti kata sandi: wajib memverifikasi kata sandi lama, lalu mencabut sesi di perangkat lain. */
export async function changePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!current) return { error: "Kata sandi saat ini wajib diisi." };
  if (current.length > PASSWORD_MAX) return { error: "Kata sandi saat ini salah." };

  const problem = validatePassword(next);
  if (problem) return { error: problem };
  if (next !== confirm) return { error: "Konfirmasi kata sandi baru tidak sama." };
  if (next === current) return { error: "Kata sandi baru tidak boleh sama dengan yang lama." };

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email = typeof data?.claims?.email === "string" ? data.claims.email : "";

  if (!data?.claims?.sub || !email) return { error: "Sesi berakhir. Silakan masuk lagi." };

  // Verifikasi ulang kata sandi lama agar sesi yang "tertinggal" tidak bisa mengganti sandi.
  const verify = await supabase.auth.signInWithPassword({ email, password: current });

  if (verify.error) {
    if (verify.error.status === 429 || verify.error.code === "over_request_rate_limit") {
      return { error: "Terlalu banyak percobaan. Coba lagi beberapa menit lagi." };
    }

    return { error: "Kata sandi saat ini salah." };
  }

  const { error } = await supabase.auth.updateUser({ password: next });

  if (error) {
    if (error.code === "same_password") return { error: "Kata sandi baru tidak boleh sama dengan yang lama." };
    if (error.code === "weak_password") return { error: "Kata sandi terlalu lemah. Gunakan kombinasi yang lebih sulit ditebak." };

    console.error("[account] gagal mengganti kata sandi:", error.code ?? error.message);
    return { error: "Gagal mengganti kata sandi. Coba lagi." };
  }

  // Keamanan: akhiri sesi di perangkat lain, pertahankan sesi ini.
  await supabase.auth.signOut({ scope: "others" });

  return { success: "Kata sandi berhasil diganti. Sesi di perangkat lain telah diakhiri." };
}

/** Keluar dari semua perangkat lain (mis. perangkat hilang), tanpa mengganti kata sandi. */
export async function signOutOthersAction(): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: "others" });

  if (error) return { error: "Gagal mengakhiri sesi lain. Coba lagi." };

  return { success: "Sesi di perangkat lain telah diakhiri." };
}
