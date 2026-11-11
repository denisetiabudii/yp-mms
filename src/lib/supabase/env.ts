/** Membaca konfigurasi Supabase dan memberi pesan jelas bila belum diatur. */
export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY belum diatur. " +
        "Salin .env.local.example menjadi .env.local lalu isi nilainya, kemudian restart `npm run dev`.",
    );
  }

  return { url, key };
}
