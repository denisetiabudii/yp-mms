import type { ChangeEvent, FocusEvent } from "react";

// Sanitasi di browser hanya merapikan input dan mencegah karakter yang tidak
// mungkin sah. Validasi dan keamanan sebenarnya tetap di server action
// (validasi ulang, normalisasi email, Supabase Auth, pembatasan percobaan).
// Modul ini tidak memakai "use client", jadi aman diimpor dari komponen klien
// maupun dari server action.

export const MAX_EMAIL_LENGTH = 254;
export const MAX_EMAIL_LOCAL_LENGTH = 64;

/** Bagian lokal (sebelum @): huruf, angka, titik, dan simbol atext RFC 5322. */
const DISALLOWED_LOCAL_CHARS = /[^A-Za-z0-9.!#$%&'*+\/=?^_`{|}~-]/g;

/** Domain (setelah @): hanya huruf, angka, titik, dan tanda hubung. */
const DISALLOWED_DOMAIN_CHARS = /[^A-Za-z0-9.-]/g;

/**
 * Aturan email saat mengetik atau menempel:
 * - huruf/angka/simbol lebar penuh (＠ ｎａｍａ) diubah ke bentuk ASCII (NFKC);
 * - alamat dari klien email ("Nama <nama@domain.com>") diambil isi kurung sudutnya;
 * - awalan "mailto:" dan parameter setelah "?" dibuang;
 * - hanya satu @ (yang pertama), @ berikutnya dibuang;
 * - bagian lokal: karakter lazim saja, tanpa titik di awal, tanpa titik
 *   berurutan, tanpa titik tepat sebelum @, maksimal 64 karakter;
 * - domain: huruf, angka, titik, tanda hubung; tidak diawali titik/hubung,
 *   tanpa titik berurutan, dan tanpa hubung yang menempel pada titik;
 * - total maksimal 254 karakter.
 * Titik atau hubung di ujung akhir dibiarkan supaya alamat masih bisa diketik;
 * finalizeEmail membersihkannya saat kolom ditinggalkan. Struktur akhir
 * (TLD, dsb.) tetap diperiksa di server.
 */
export function sanitizeEmail(value: string) {
  let v = value.normalize("NFKC");

  const angle = v.match(/<([^<>]*)>/);
  if (angle) v = angle[1];

  if (/^\s*mailto:/i.test(v)) {
    v = v.replace(/^\s*mailto:/i, "").replace(/\?.*$/, "");
  }

  const at = v.indexOf("@");
  const rawLocal = at === -1 ? v : v.slice(0, at);
  const rawDomain = at === -1 ? null : v.slice(at + 1);

  let local = rawLocal
    .replace(DISALLOWED_LOCAL_CHARS, "")
    .replace(/\.{2,}/g, ".")
    .replace(/^\./, "")
    .slice(0, MAX_EMAIL_LOCAL_LENGTH);

  if (rawDomain === null) return local;

  local = local.replace(/\.$/, "");

  const domain = rawDomain
    .replace(DISALLOWED_DOMAIN_CHARS, "") // sekaligus membuang @ tambahan
    .replace(/\.{2,}/g, ".")
    .replace(/^[.-]+/, "")
    .replace(/-+\./g, ".")
    .replace(/\.-+/g, ".");

  return `${local}@${domain}`.slice(0, MAX_EMAIL_LENGTH);
}

/**
 * Rapikan akhir saat kolom ditinggalkan: huruf kecil (email tidak peka huruf
 * besar-kecil, dan server memang menurunkannya) serta buang titik/hubung
 * yang menggantung di ujung.
 */
export function finalizeEmail(value: string) {
  return sanitizeEmail(value).toLowerCase().replace(/[.-]+$/, "");
}

/**
 * Membersihkan nilai input saat mengetik atau menempel. Input tetap
 * uncontrolled (agar perilaku reset form setelah aksi tidak berubah), jadi
 * nilai hanya ditulis ulang jika memang ada yang dibuang. Posisi kursor
 * dipertahankan supaya mengedit di tengah teks tidak melompat ke akhir.
 */
export function cleanOnChange(sanitize: (value: string) => string) {
  return (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const raw = input.value;
    const cleaned = sanitize(raw);

    if (cleaned === raw) return;

    // Bernilai null pada input type="email" di sebagian browser.
    const caret = input.selectionStart;

    input.value = cleaned;

    if (caret !== null) {
      const nextCaret = sanitize(raw.slice(0, caret)).length;

      try {
        input.setSelectionRange(nextCaret, nextCaret);
      } catch {
        // Tipe input tidak mendukung seleksi; biarkan kursor di akhir.
      }
    }
  };
}

export const handleEmailChange = cleanOnChange(sanitizeEmail);

export function handleEmailBlur(event: FocusEvent<HTMLInputElement>) {
  const input = event.currentTarget;
  const finalized = finalizeEmail(input.value);

  if (finalized !== input.value) input.value = finalized;
}

/**
 * Format email: karakter lokal mengikuti RFC 5322 (atext), titik hanya sebagai
 * pemisah (tidak di awal, akhir, atau berurutan), domain berupa label huruf/angka/
 * tanda hubung yang tidak diawali atau diakhiri tanda hubung, dan TLD berupa
 * huruf minimal dua karakter. Spasi, karakter tak terlihat, dan huruf non-ASCII
 * otomatis ditolak.
 */
export const EMAIL_PATTERN =
  /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;

/** Pemeriksaan format untuk server (email sudah di-trim dan huruf kecil). */
export function isValidEmailFormat(email: string) {
  return (
    email.length <= MAX_EMAIL_LENGTH &&
    email.indexOf("@") <= MAX_EMAIL_LOCAL_LENGTH &&
    EMAIL_PATTERN.test(email)
  );
}

/**
 * Rapikan email dari form di sisi server: buang spasi di tepi dan jadikan huruf
 * kecil. Sengaja tidak lebih dari itu; pembersihan karakter ada di sanitizeEmail
 * (sisi browser).
 */
export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

/**
 * Pemeriksaan format email. Nama ini sudah dipakai oleh kode yang ada
 * (forgot-password/actions.ts), jadi dipertahankan.
 */
export function isValidEmail(value: string) {
  return isValidEmailFormat(value.trim());
}