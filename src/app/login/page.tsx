import { safeNextPath } from "@/lib/auth/redirect";

import { LoginForm, type LoginNotice } from "./login-form";

const NOTICES: Record<string, LoginNotice> = {
  logout: { tone: "success", text: "Anda telah keluar dari sistem." },
  "reset-success": {
    tone: "success",
    text: "Kata sandi berhasil diubah. Silakan masuk dengan kata sandi baru.",
  },
  "link-invalid": {
    tone: "error",
    text: "Tautan tidak valid atau sudah kedaluwarsa. Minta tautan baru melalui Lupa kata sandi atau hubungi administrator.",
  },
  // Dikirim oleh lib/supabase/proxy.ts saat sesi diakhiri.
  inactive: {
    tone: "error",
    text: "Akun Anda tidak aktif. Hubungi administrator.",
  },
  "session-revoked": {
    tone: "info",
    text: "Sesi Anda diakhiri karena ada perubahan pada akun Anda. Silakan masuk kembali.",
  },
  "service-error": {
    tone: "error",
    text: "Layanan sedang terganggu, sesi Anda diakhiri demi keamanan. Coba masuk lagi beberapa saat lagi.",
  },
};

type Props = {
  // Next.js 15+: searchParams berupa Promise.
  searchParams: Promise<{ next?: string | string[]; reason?: string | string[] }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const reason = typeof params.reason === "string" ? params.reason : "";

  // hasOwnProperty: tanpa ini ?reason=constructor atau ?reason=toString
  // mengembalikan fungsi bawaan objek, bukan notice, dan merusak tampilan.
  const notice = Object.prototype.hasOwnProperty.call(NOTICES, reason)
    ? NOTICES[reason]
    : undefined;

  return <LoginForm next={safeNextPath(params.next)} notice={notice} />;
}