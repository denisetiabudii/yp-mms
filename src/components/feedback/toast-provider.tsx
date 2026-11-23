"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";

/**
 * Notifikasi layar (toast) untuk hasil aksi. Muncul di pojok kanan bawah di mana pun
 * pengguna sedang menggulir, jadi kegagalan tidak terlewat seperti banner di atas halaman.
 * - Sukses: hilang sendiri setelah 6 detik.
 * - Gagal: tetap tampil sampai ditutup (agar pesan sempat dibaca dan ditindaklanjuti).
 * Dibaca pembaca layar lewat role: "alert" untuk gagal, "status" untuk sukses.
 */

type Tone = "success" | "error";
type ToastItem = { id: number; tone: Tone; message: string };
type ToastApi = { success: (message: string) => void; error: (message: string) => void };

const ToastContext = React.createContext<ToastApi | null>(null);

const SUCCESS_MS = 6000;
const MAX_TOASTS = 4;

export function useToast(): ToastApi {
  const context = React.useContext(ToastContext);

  if (!context) throw new Error("useToast harus dipakai di dalam <ToastProvider>.");

  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);
  const nextId = React.useRef(1);
  const timers = React.useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = React.useCallback((id: number) => {
    const timer = timers.current.get(id);

    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = React.useCallback(
    (tone: Tone, message: string) => {
      const id = nextId.current++;

      setToasts((current) => [...current.slice(-(MAX_TOASTS - 1)), { id, tone, message }]);

      if (tone === "success") timers.current.set(id, setTimeout(() => dismiss(id), SUCCESS_MS));
    },
    [dismiss],
  );

  const api = React.useMemo<ToastApi>(
    () => ({ success: (message) => push("success", message), error: (message) => push("error", message) }),
    [push],
  );

  React.useEffect(() => {
    const active = timers.current;

    return () => active.forEach((timer) => clearTimeout(timer));
  }, []);

  return (
    <ToastContext.Provider value={api}>
      {children}

      <div
        aria-label="Notifikasi"
        className="pointer-events-none fixed inset-x-3 bottom-3 z-[200] flex flex-col items-end gap-2 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-[26rem]"
      >
        {toasts.map((toast) => {
          const isError = toast.tone === "error";

          return (
            <div
              key={toast.id}
              role={isError ? "alert" : "status"}
              className={`pointer-events-auto flex w-full items-start gap-3 rounded-xl border bg-white p-4 shadow-lg ${
                isError ? "border-red-200" : "border-emerald-200"
              }`}
            >
              {isError ? (
                <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-600" />
              ) : (
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
              )}

              <div className="min-w-0 flex-1">
                <p className={`text-sm font-semibold ${isError ? "text-red-700" : "text-emerald-700"}`}>
                  {isError ? "Tidak berhasil" : "Berhasil"}
                </p>
                <p className="mt-0.5 text-sm leading-5 text-slate-700">{toast.message}</p>
              </div>

              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label="Tutup notifikasi"
                className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
              >
                <X className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
