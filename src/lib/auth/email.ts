import type { ChangeEvent } from "react";

/**
 * Aturan email yang dipakai bersama oleh form (browser) dan server action.
 * File ini murni (tanpa "use client" maupun "use server"), jadi aman diimpor
 * dari keduanya. Sanitasi di browser hanya merapikan input; validasi yang
 * menentukan tetap dijalankan ulang di server.
 */

export const MAX_EMAIL_LENGTH = 254;
const MAX_EMAIL_LOCAL_LENGTH = 64;

/**
 * Karakter yang lazim pada alamat email (huruf, angka, titik, simbol RFC 5322
 * seperti _ % + - ') serta tanda @. Selain itu dibuang: spasi, karakter
 * kontrol, karakter tak terlihat, dan huruf non-ASCII.
 */
const DISALLOWED_EMAIL_CHARS = /[^A-Za-z0-9.!#$%&'*+\/=?^_`{|}~@-]/g;

/**
 * Format email: bagian lokal mengikuti RFC 5322 (atext), titik hanya sebagai
 * pemisah (tidak di awal, akhir, atau berurutan), domain berupa label huruf,
 * angka, dan tanda hubung yang tidak diawali atau diakhiri tanda hubung, serta
 * TLD berupa huruf minimal dua karakter.
 */
const EMAIL_PATTERN =
  /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;

/** Membuang karakter yang tidak mungkin ada di email. Struktur tidak ditebak. */
export function sanitizeEmail(value: string) {
  return value.replace(DISALLOWED_EMAIL_CHARS, "").slice(0, MAX_EMAIL_LENGTH);
}

/** Normalisasi di server: email tidak peka huruf besar/kecil. */
export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

/** Validasi struktur dan panjang (total 254, bagian sebelum @ maksimal 64). */
export function isValidEmail(email: string) {
  return (
    email.length <= MAX_EMAIL_LENGTH &&
    email.indexOf("@") <= MAX_EMAIL_LOCAL_LENGTH &&
    EMAIL_PATTERN.test(email)
  );
}

/**
 * Handler onChange untuk input email. Input tetap uncontrolled (agar perilaku
 * reset form setelah aksi tidak berubah), jadi nilai hanya ditulis ulang jika
 * memang ada karakter yang dibuang.
 */
export function handleEmailChange(event: ChangeEvent<HTMLInputElement>) {
  const input = event.currentTarget;
  const cleaned = sanitizeEmail(input.value);

  if (cleaned !== input.value) input.value = cleaned;
}