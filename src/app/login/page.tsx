import { safeNextPath } from "@/lib/auth/redirect";

import { LoginForm, type LoginNotice } from "./login-form";

const NOTICES: Record<string, LoginNotice> = {
  logout: { tone: "success", text: "Anda telah keluar dari sistem." },
  "reset-success": {
    tone: "success",
    text: "Kata sandi berhasil diubah. Silakan masuk dengan kata sandi baru.",
  },
  "invite-only": {
    tone: "info",
    text: "Pendaftaran mandiri tidak tersedia. Akun dibuat oleh administrator melalui undangan email.",
  },
  "link-invalid": {
    tone: "error",
    text: "Tautan tidak valid atau sudah kedaluwarsa. Minta tautan baru melalui Lupa Password atau hubungi administrator.",
  },
};

type Props = {
  // Next.js 15+: searchParams berupa Promise.
  searchParams: Promise<{ next?: string | string[]; reason?: string | string[] }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const reason = typeof params.reason === "string" ? params.reason : "";

  return <LoginForm next={safeNextPath(params.next)} notice={NOTICES[reason]} />;
}
