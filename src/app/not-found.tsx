import Link from "next/link";
import { Compass } from "lucide-react";

export const metadata = { title: "Halaman tidak ditemukan · YP-MMS" };

/** 404 global (di luar dashboard, mis. alamat yang salah ketik). */
export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-3xl border border-blue-100 bg-white p-10 text-center shadow-xl">
        <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          <Compass className="size-8" />
        </div>

        <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">Galat 404</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Halaman tidak ditemukan</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Alamat yang Anda tuju tidak ada atau sudah dipindahkan. Periksa kembali alamatnya, atau kembali ke
          halaman utama.
        </p>

        <Link
          href="/dashboard"
          className="mt-7 inline-flex h-11 items-center justify-center rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
        >
          Ke Dashboard
        </Link>
      </div>
    </main>
  );
}
