import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * Klien Supabase dengan KUNCI RAHASIA (melewati RLS). HANYA untuk Server Action
 * dan kode server. Berkas ini memakai "server-only": bila terimpor dari komponen
 * klien, build gagal, sehingga kunci tidak mungkin ikut terkirim ke browser.
 *
 * Pakai seperlunya (mis. mengundang pengguna). Semua perubahan data biasa tetap
 * lewat klien sesi pengguna + RLS/fungsi database.
 */

/** Kunci baru (sb_secret_...) diutamakan; kunci lama service_role diterima sebagai cadangan. */
function adminKey() {
  return process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

export function isAdminClientConfigured() {
  return !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!adminKey();
}

/** null bila kunci belum diatur, supaya pemanggil bisa memberi pesan yang jelas. */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = adminKey();

  if (!url || !key) return null;

  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
