/**
 * Aturan kata sandi aplikasi. Dipakai bersama oleh halaman reset password
 * dan halaman Akun saya. Samakan juga dengan Supabase → Authentication →
 * Password security (minimum length).
 */
export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 128;

/** Mengembalikan pesan masalah, atau null bila kata sandi memenuhi aturan. */
export function validatePassword(password: string) {
  if (password.length < PASSWORD_MIN) return `Kata sandi minimal ${PASSWORD_MIN} karakter.`;
  if (password.length > PASSWORD_MAX) return `Kata sandi maksimal ${PASSWORD_MAX} karakter.`;
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return "Kata sandi harus mengandung huruf dan angka.";
  }

  return null;
}
