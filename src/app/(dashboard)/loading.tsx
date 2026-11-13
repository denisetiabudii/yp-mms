/** Tampilan sementara saat berpindah halaman di dalam dashboard. */
export default function DashboardLoading() {
  return (
    <div role="status" aria-busy="true" className="space-y-6">
      <span className="sr-only">Memuat halaman…</span>

      <div className="space-y-2">
        <div className="h-7 w-56 animate-pulse rounded-lg bg-slate-200" />
        <div className="h-4 w-80 max-w-full animate-pulse rounded bg-slate-100" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-xl border border-slate-100 bg-slate-100" />
        ))}
      </div>

      <div className="h-80 animate-pulse rounded-xl border border-slate-100 bg-slate-100" />
    </div>
  );
}
