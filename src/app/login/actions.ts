"use server";

import { createHash } from "node:crypto";

import { createClient as createServiceClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import { safeNextPath } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

export type LoginField = "email" | "password";

export type LoginState = {
  error?: string;
  /** Email dikembalikan agar kolom tidak kosong setelah gagal. Password tidak pernah. */
  email?: string;
  /**
   * Kolom yang bermasalah, dipakai form untuk aria-invalid. Kosong untuk galat
   * yang bukan salah isian (batas percobaan, gangguan layanan, dsb).
   */
  invalid?: LoginField[];
};

/* -------------------------------------------------------------------------- */
/* Batas percobaan masuk                                                      */
/* -------------------------------------------------------------------------- */

/** Percobaan gagal berturut-turut yang diizinkan sebelum email dikunci sementara. */
const MAX_FAILED_ATTEMPTS = 3;
/** Lama kunci setelah batas tercapai. */
const LOCK_MINUTES = 15;
/** Percobaan gagal dihitung dalam jendela waktu ini; lewat dari itu hitungan mulai ulang. */
const ATTEMPT_WINDOW_MINUTES = 15;

/**
 * Hitungan disimpan di tabel public.login_attempts (lihat login_attempts.sql)
 * dan hanya bisa diakses lewat service role dari server, sehingga tidak bisa
 * direset dari browser. Hitungan berlaku untuk email apa pun, terdaftar atau
 * tidak, jadi kunci tidak membocorkan keberadaan akun. Email di-hash agar tidak
 * tersimpan polos.
 *
 * Jika penyimpanan hitungan gagal (tabel belum dibuat, env belum diisi, dsb.),
 * login tetap berjalan dan kesalahan dicatat di log server. Pantau log itu.
 */
function throttleKey(email: string) {
  return createHash("sha256").update(email).digest("hex");
}

function createThrottleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum diisi.");
  }

  return createServiceClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Sisa detik kunci; 0 jika tidak sedang dikunci. */
async function getLockSeconds(key: string): Promise<number> {
  try {
    const { data, error } = await createThrottleClient().rpc("login_attempt_status", {
      p_key: key,
    });

    if (error) throw error;

    return typeof data === "number" ? data : 0;
  } catch (error) {
    console.error("[login] Gagal membaca status batas percobaan:", error);
    return 0;
  }
}

/** Catat satu percobaan gagal. Mengembalikan lama kunci (detik) jika batas baru tercapai, selain itu 0. */
async function recordFailedAttempt(key: string): Promise<number> {
  try {
    const { data, error } = await createThrottleClient().rpc("login_attempt_fail", {
      p_key: key,
      p_max: MAX_FAILED_ATTEMPTS,
      p_lock_minutes: LOCK_MINUTES,
      p_window_minutes: ATTEMPT_WINDOW_MINUTES,
    });

    if (error) throw error;

    return typeof data === "number" ? data : 0;
  } catch (error) {
    console.error("[login] Gagal mencatat percobaan gagal:", error);
    return 0;
  }
}

async function resetFailedAttempts(key: string) {
  try {
    const { error } = await createThrottleClient().rpc("login_attempt_reset", { p_key: key });

    if (error) throw error;
  } catch (error) {
    console.error("[login] Gagal mereset batas percobaan:", error);
  }
}

/* -------------------------------------------------------------------------- */
/* Pesan galat                                                                */
/* -------------------------------------------------------------------------- */

// Pesan salah-kredensial sengaja seragam agar tidak membocorkan apakah email terdaftar.
const MSG_INVALID_CREDENTIALS = "Email atau kata sandi salah.";
const MSG_RATE_LIMIT = "Terlalu banyak percobaan. Coba lagi beberapa menit lagi.";
const MSG_SERVICE_ERROR = "Layanan masuk sedang bermasalah. Coba lagi beberapa saat lagi.";

function lockedMessage(seconds: number) {
  const minutes = Math.max(1, Math.ceil(seconds / 60));

  return `Terlalu banyak percobaan gagal. Coba lagi dalam ${minutes} menit.`;
}

/** Gangguan di sisi layanan atau jaringan, bukan kesalahan isian pengguna. */
function isServiceError(error: { name?: string; status?: number }) {
  return (
    error.name === "AuthRetryableFetchError" ||
    (typeof error.status === "number" && (error.status === 0 || error.status >= 500))
  );
}

/**
 * Format email: karakter lokal mengikuti RFC 5322 (atext), titik hanya sebagai
 * pemisah (tidak di awal, akhir, atau berurutan), domain berupa label huruf/angka/
 * tanda hubung yang tidak diawali atau diakhiri tanda hubung, dan TLD berupa
 * huruf minimal dua karakter. Spasi, karakter tak terlihat, dan huruf non-ASCII
 * otomatis ditolak.
 */
const EMAIL_PATTERN =
  /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;

export async function signInAction(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  // formData.get() bisa mengembalikan File. Tolak apa pun selain string.
  const rawEmail = formData.get("email");
  const rawPassword = formData.get("password");

  if (typeof rawEmail !== "string" || typeof rawPassword !== "string") {
    return { error: "Permintaan tidak valid." };
  }

  const email = rawEmail.trim().toLowerCase();
  const password = rawPassword;
  const next = safeNextPath(formData.get("next"));

  if (!email || !password) {
    const invalid: LoginField[] = [];

    if (!email) invalid.push("email");
    if (!password) invalid.push("password");

    return { error: "Email dan kata sandi wajib diisi.", email, invalid };
  }
  // Batas RFC: total 254 karakter, bagian sebelum @ maksimal 64 karakter.
  if (email.length > 254 || email.indexOf("@") > 64 || !EMAIL_PATTERN.test(email)) {
    return { error: "Format email tidak valid.", email, invalid: ["email"] };
  }
  if (password.length > 128) {
    return { error: MSG_INVALID_CREDENTIALS, email, invalid: ["email", "password"] };
  }

  // Cek kunci sebelum menyentuh Supabase Auth, supaya percobaan saat terkunci
  // tidak ikut menghabiskan rate limit Supabase dan kata sandi benar pun ditolak.
  const key = throttleKey(email);
  const lockedFor = await getLockSeconds(key);

  if (lockedFor > 0) {
    return { error: lockedMessage(lockedFor), email };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    if (error?.status === 429 || error?.code === "over_request_rate_limit") {
      return { error: MSG_RATE_LIMIT, email };
    }

    if (error && isServiceError(error)) {
      console.error("[login] Supabase Auth bermasalah:", error.name, error.status);

      return { error: MSG_SERVICE_ERROR, email };
    }

    // Salah kredensial: hitung sebagai percobaan gagal.
    const lockSeconds = await recordFailedAttempt(key);

    if (lockSeconds > 0) {
      return { error: lockedMessage(lockSeconds), email };
    }

    return { error: MSG_INVALID_CREDENTIALS, email, invalid: ["email", "password"] };
  }

  // Kredensial benar: hitungan gagal dimulai dari nol lagi.
  await resetFailedAttempts(key);

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