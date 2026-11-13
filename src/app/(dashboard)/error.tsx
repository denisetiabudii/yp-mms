"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

/**
 * Galat di dalam halaman dashboard: sidebar dan header tetap tampil,
 * hanya area konten yang diganti. Pesan teknis tidak ditampilkan ke
 * pengguna (bisa membocorkan detail); cukup kode referensi (digest).
 */
export default function DashboardError({
  error,
  reset,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  /** Next.js sebelum 16.2. */
  reset?: () => void;
  /** Next.js 16.2 ke atas: mengambil ulang data lalu merender ulang. */
  unstable_retry?: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  function retry() {
    const handler = unstable_retry ?? reset;

    if (handler) handler();
    else window.location.reload();
  }

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
        <AlertTriangle className="size-7" />
      </div>

      <h1 className="text-xl font-bold text-slate-800">Terjadi kesalahan</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        Halaman ini tidak dapat dimuat. Anda dapat mencoba lagi. Bila masalah berlanjut, hubungi administrator
        {error.digest ? (
          <>
            {" "}dan sebutkan kode <span className="font-mono text-slate-700">{error.digest}</span>
          </>
        ) : null}
        .
      </p>

      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        <button
          type="button"
          onClick={retry}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
        >
          <RotateCcw className="size-4" />
          Coba lagi
        </button>

        <Link
          href="/dashboard"
          className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
        >
          Ke Dashboard
        </Link>
      </div>
    </div>
  );
}
