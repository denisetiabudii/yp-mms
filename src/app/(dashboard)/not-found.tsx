import Link from "next/link";
import { SearchX } from "lucide-react";

/**
 * 404 di dalam dashboard (mis. notFound() dari detail rapat/notulen/tugas).
 * Pesan sengaja netral: tidak membedakan "tidak ada" dari "tidak berhak",
 * agar keberadaan rapat Rahasia tidak terbocor.
 */
export default function DashboardNotFound() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
        <SearchX className="size-7" />
      </div>

      <h1 className="text-xl font-bold text-slate-800">Data tidak ditemukan</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        Data yang Anda cari tidak ada, sudah dihapus, atau Anda tidak memiliki akses untuk melihatnya.
      </p>

      <Link
        href="/dashboard"
        className="mt-6 inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-5 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
      >
        Ke Dashboard
      </Link>
    </div>
  );
}
