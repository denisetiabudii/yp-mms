/**
 * Validasi dan pemetaan galat untuk modul organisasi.
 * Dipakai di klien (umpan balik cepat) DAN di Server Action (yang wajib
 * memvalidasi ulang). Murni, tanpa React/Supabase, agar mudah diuji.
 */

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const CODE_PATTERN = /^[A-Z0-9]{2,6}$/;

/** Rapikan nama: potong tepi dan satukan spasi berlebih. */
export function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

/** Pesan masalah, atau null bila valid. `needsCode` = unit/departemen. */
export function validateOrgInput(name: string, code: string, needsCode: boolean) {
  const cleanName = normalizeName(name);
  const cleanCode = code.trim();

  if (cleanName.length < 2 || cleanName.length > 80) return "Nama harus 2–80 karakter.";
  if (needsCode && cleanCode && !CODE_PATTERN.test(cleanCode)) {
    return "Kode terdiri dari 2–6 huruf kapital atau angka.";
  }

  return null;
}

export function validatePositionName(name: string) {
  const clean = normalizeName(name);

  return clean.length < 2 || clean.length > 40 ? "Nama jabatan harus 2–40 karakter." : null;
}

type DbError = { code?: string; message?: string } | null | undefined;

/**
 * Terjemahkan galat database menjadi pesan untuk pengguna.
 * Pesan dari trigger kita sendiri (kode P0001) aman ditampilkan apa adanya;
 * galat tak dikenal dibuat generik agar detail teknis tidak bocor.
 */
export function mapOrgDbError(error: DbError) {
  const message = error?.message ?? "";

  if (error?.code === "23505") {
    if (message.includes("org_nodes_sibling_name")) return "Sudah ada data dengan nama tersebut pada tingkat ini.";
    if (message.includes("org_nodes_sibling_code")) return "Kode sudah dipakai pada tingkat ini.";
    if (message.includes("positions_name_unique")) return "Jabatan tersebut sudah ada.";
    return "Data yang sama sudah ada.";
  }

  if (error?.code === "23514") {
    if (message.includes("org_nodes_code_check")) return "Kode terdiri dari 2–6 huruf kapital atau angka.";
    return "Isian tidak memenuhi aturan.";
  }

  if (error?.code === "23503") return "Data masih dipakai (mis. oleh penugasan pengguna) sehingga tidak dapat dihapus.";
  if (error?.code === "42501") return "Anda tidak berwenang melakukan ini.";
  if (error?.code === "P0001" && message) return message;

  return "Terjadi kesalahan. Coba lagi.";
}