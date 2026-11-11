"use client";

import * as React from "react";
import Link from "next/link";
import {
  Mail,
  LockKeyhole,
  Eye,
  EyeOff,
  Building2,
  ArrowRight,
  ShieldCheck,
  LogIn,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { signInAction, type LoginState } from "./actions";

export type LoginNotice = { tone: "success" | "info" | "error"; text: string };

const noticeStyles: Record<LoginNotice["tone"], string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  info: "border-blue-100 bg-blue-50 text-blue-700",
  error: "border-red-200 bg-red-50 text-red-700",
};

const initialState: LoginState = {};

export function LoginForm({ next, notice }: { next: string; notice?: LoginNotice }) {
  const [state, formAction, pending] = React.useActionState(signInAction, initialState);
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-10">
      {/* Background Decoration */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-100/70 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-sky-100/70 blur-3xl" />

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-xl lg:grid-cols-[0.85fr_1.15fr]">
        {/* Left Panel */}
        <section className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-sky-500 p-10 text-white lg:flex">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full border border-white/10" />
          <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full border border-white/10" />

          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
                <Building2 className="h-7 w-7" />
              </div>

              <div>
                <h1 className="text-xl font-bold tracking-wide">YP-MMS</h1>
                <p className="text-xs text-blue-100">Yuk Peduli Meeting Management System</p>
              </div>
            </div>

            <div className="mt-20">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-100">
                Employee Login
              </p>

              <h2 className="mt-4 text-4xl font-bold leading-tight">
                Selamat
                <br />
                datang kembali
                <br />
                di YP-MMS.
              </h2>

              <p className="mt-5 max-w-sm text-sm leading-6 text-blue-100">
                Akses informasi rapat, notulen, keputusan, dan tindak lanjut pekerjaan melalui
                satu sistem terintegrasi.
              </p>
            </div>
          </div>

          <div className="relative z-10 flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
              <ShieldCheck className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm font-semibold">Akses Karyawan</p>
              <p className="text-xs text-blue-100">Sistem internal Yuk Peduli</p>
            </div>
          </div>
        </section>

        {/* Login Form */}
        <section className="flex items-center p-6 sm:p-10">
          <div className="mx-auto w-full max-w-md">
            {/* Mobile Branding */}
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white">
                <Building2 className="h-6 w-6" />
              </div>

              <div>
                <h1 className="font-bold text-slate-800">YP-MMS</h1>
                <p className="text-xs text-slate-500">Yuk Peduli Meeting Management System</p>
              </div>
            </div>

            <div className="mb-8">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                <LogIn className="h-3.5 w-3.5" />
                Login Karyawan
              </div>

              <h2 className="text-2xl font-bold tracking-tight text-slate-800">Masuk ke Akun</h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Masuk dengan email dan kata sandi akun YP-MMS Anda.
              </p>
            </div>

            {notice && (
              <div
                role="status"
                className={`mb-5 rounded-xl border p-3 text-sm ${noticeStyles[notice.tone]}`}
              >
                {notice.text}
              </div>
            )}

            <form action={formAction} className="space-y-5" noValidate>
              <input type="hidden" name="next" value={next} />

              {/* Email */}
              <div className="space-y-2">
                <label htmlFor="login-email" className="text-sm font-medium text-slate-700">
                  Email
                </label>

                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <Input
                    id="login-email"
                    name="email"
                    type="email"
                    inputMode="email"
                    defaultValue={state.email ?? ""}
                    placeholder="nama@email.com"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    maxLength={254}
                    required
                    aria-invalid={!!state.error}
                    aria-describedby={state.error ? "login-error" : undefined}
                    className="h-11 border-slate-200 pl-10 focus-visible:ring-blue-500"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label htmlFor="login-password" className="text-sm font-medium text-slate-700">
                  Kata Sandi
                </label>

                <div className="relative">
                  <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <Input
                    id="login-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Masukkan kata sandi"
                    maxLength={128}
                    required
                    aria-invalid={!!state.error}
                    aria-describedby={state.error ? "login-error" : undefined}
                    className="h-11 border-slate-200 pl-10 pr-10 focus-visible:ring-blue-500"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <Link
                  href="/forgot-password"
                  className="text-xs font-semibold text-blue-600 transition hover:text-blue-700"
                >
                  Lupa Password?
                </Link>
              </div>

              {/* Error Message */}
              {state.error && (
                <div
                  id="login-error"
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                >
                  {state.error}
                </div>
              )}

              {/* Submit */}
              <Button
                type="submit"
                disabled={pending}
                className="h-11 w-full gap-2 bg-blue-600 font-semibold text-white hover:bg-blue-700"
              >
                {pending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Memproses…
                  </>
                ) : (
                  <>
                    Masuk
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <p className="mt-6 text-center text-xs leading-5 text-slate-500">
              Belum punya akses? Akun dibuat oleh administrator dan dikirim lewat undangan email.
            </p>

            {/* Footer */}
            <div className="mt-8 border-t border-slate-100 pt-5">
              <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                <ShieldCheck className="h-4 w-4" />
                YP-MMS · Yuk Peduli
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
