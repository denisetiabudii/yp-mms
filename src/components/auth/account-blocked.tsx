import { ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { signOutAction } from "@/lib/auth/actions";

const MESSAGES = {
  inactive: {
    title: "Akun Anda dinonaktifkan",
    text: "Akses Anda ke YP-MMS telah dinonaktifkan. Hubungi administrator jika ini keliru.",
  },
  "no-profile": {
    title: "Profil akun belum siap",
    text: "Akun Anda berhasil masuk, tetapi profil pengguna belum tersedia. Hubungi administrator.",
  },
    "service-error": {
    title: "Layanan sedang bermasalah",
    text: "Kami belum dapat memverifikasi sesi akun Anda. Silakan coba beberapa saat lagi.",
  },
} as const;

/** Layar penghenti untuk akun yang punya sesi tetapi tidak berhak mengakses sistem. */
export function AccountBlocked({ reason }: { reason: keyof typeof MESSAGES }) {
  const message = MESSAGES[reason];

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-red-100 bg-white p-8 text-center shadow-lg">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
          <ShieldAlert className="size-7" />
        </div>

        <h1 className="text-xl font-bold text-slate-800">{message.title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">{message.text}</p>

        <form action={signOutAction} className="mt-6">
          <Button type="submit" className="h-11 w-full bg-blue-600 font-semibold text-white hover:bg-blue-700">
            Keluar
          </Button>
        </form>
      </div>
    </main>
  );
}
