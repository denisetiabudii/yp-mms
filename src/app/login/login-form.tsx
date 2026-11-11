"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Mail,
  LockKeyhole,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  LogIn,
  Loader2,
  CalendarDays,
  ClipboardCheck,
  UsersRound,
  ListChecks,
  MessagesSquare,
  Clock3,
} from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { signInAction, type LoginState } from "./actions";

export type LoginNotice = { tone: "success" | "info" | "error"; text: string };

const noticeStyles: Record<LoginNotice["tone"], string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  info: "border-blue-200 bg-[#eaf3ff] text-[#0649b8]",
  error: "border-red-200 bg-red-50 text-red-700",
};

const initialState: LoginState = {};

/* -------------------------------------------------------------------------- */
/* Sanitasi input                                                             */
/* -------------------------------------------------------------------------- */

// Sanitasi di browser hanya merapikan input dan mencegah karakter yang tidak
// mungkin sah. Validasi dan keamanan sebenarnya tetap di server action
// (validasi ulang, normalisasi email, Supabase Auth, pembatasan percobaan).
// Keamanan `next` ditangani oleh safeNextPath (lib/auth/redirect), bukan di sini.

const MAX_EMAIL_LENGTH = 254;
const MAX_PASSWORD_LENGTH = 128;

const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;

/**
 * Email hanya boleh berisi karakter yang lazim pada alamat email (huruf, angka,
 * titik, dan simbol RFC 5322 seperti _ % + - ') serta tanda @. Karakter lain,
 * termasuk spasi, karakter kontrol, karakter tak terlihat, dan huruf non-ASCII,
 * dibuang. Struktur alamat (satu @, titik tidak di awal atau berurutan, domain
 * valid) tidak ditebak-tebak di sini, melainkan diperiksa di server.
 */
const DISALLOWED_EMAIL_CHARS = /[^A-Za-z0-9.!#$%&'*+\/=?^_`{|}~@-]/g;

function sanitizeEmail(value: string) {
  return value.replace(DISALLOWED_EMAIL_CHARS, "").slice(0, MAX_EMAIL_LENGTH);
}

/**
 * Password sengaja tidak di-trim dan simbol tidak dibatasi, karena spasi dan
 * simbol bisa menjadi bagian dari password yang sah. Hanya karakter kontrol
 * yang dibuang, lalu panjang dibatasi.
 */
function sanitizePassword(value: string) {
  return value.replace(CONTROL_CHARS, "").slice(0, MAX_PASSWORD_LENGTH);
}

/**
 * Membersihkan nilai input saat mengetik atau menempel. Input tetap
 * uncontrolled (agar perilaku reset form setelah aksi tidak berubah), jadi
 * nilai hanya ditulis ulang jika memang ada yang dibuang.
 */
function cleanOnChange(sanitize: (value: string) => string) {
  return (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const cleaned = sanitize(input.value);

    if (cleaned !== input.value) input.value = cleaned;
  };
}

const handleEmailChange = cleanOnChange(sanitizeEmail);
const handlePasswordChange = cleanOnChange(sanitizePassword);

/**
 * Maskot: kanvas PNG 512x512, area yang terlihat hanya x 134–357 dan
 * y 32–481 (224x450). Gambar di-crop lewat CSS supaya maskot tampil
 * penuh tanpa perlu mengedit file PNG.
 */
const MASCOT = {
  canvas: 512,
  x: 134,
  y: 32,
  w: 224,
  h: 450,
};

const mascotImageStyle: React.CSSProperties = {
  position: "absolute",
  maxWidth: "none",
  width: `${(MASCOT.canvas / MASCOT.w) * 100}%`,
  height: `${(MASCOT.canvas / MASCOT.h) * 100}%`,
  left: `${-(MASCOT.x / MASCOT.w) * 100}%`,
  top: `${-(MASCOT.y / MASCOT.h) * 100}%`,
};

export function LoginForm({ next, notice }: { next: string; notice?: LoginNotice }) {
  const [state, formAction, pending] = React.useActionState(signInAction, initialState);
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#eaf3ff] px-4 py-6 sm:px-6">
      <style jsx global>{`
        @keyframes yp-float {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-7px);
          }
        }

        @keyframes yp-float-slow {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(6px);
          }
        }

        @keyframes yp-glow {
          0%,
          100% {
            opacity: 0.35;
          }
          50% {
            opacity: 0.7;
          }
        }

        .yp-float {
          animation: yp-float 6s ease-in-out infinite;
        }

        .yp-float-slow {
          animation: yp-float-slow 7s ease-in-out infinite;
        }

        .yp-glow {
          animation: yp-glow 5s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .yp-float,
          .yp-float-slow,
          .yp-glow {
            animation: none;
          }
        }
      `}</style>

      {/* Background Decoration */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-200/50 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-sky-200/50 blur-3xl" />

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[30px] border border-blue-200/70 bg-white shadow-[0_20px_60px_rgba(37,99,235,0.16)] lg:min-h-[700px] lg:grid-cols-2">
        {/* Left Panel */}
        <section className="relative hidden flex-col overflow-hidden bg-gradient-to-br from-[#075bea] via-[#0865ed] to-[#39b5f4] p-9 text-white lg:flex xl:p-10">
          <div className="yp-glow pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-sky-300/40 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 -left-20 h-80 w-80 rounded-full border border-white/10 bg-blue-400/10" />
          <div className="pointer-events-none absolute -bottom-12 -left-6 h-56 w-56 rounded-full border border-white/10" />

          <div className="relative z-10 flex flex-1 flex-col">
            {/* Branding */}
            <div className="flex items-center gap-3.5">
              <div className="flex shrink-0 items-center rounded-2xl bg-white px-4 py-3 shadow-lg shadow-blue-950/15">
                <BrandLogo className="h-11" />
              </div>

              <div>
                <h1 className="text-xl font-extrabold leading-none tracking-wide">YP-MMS</h1>
                <p className="mt-1.5 text-xs text-blue-50">
                  Yuk Peduli Meeting Management System
                </p>
              </div>
            </div>

            {/* Welcome */}
            <div className="mt-9">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#ffca55] px-3.5 py-1.5 text-xs font-bold text-[#25314a] shadow-lg shadow-blue-950/10">
                <LogIn className="h-4 w-4" />
                Employee Login
              </div>

              <h2 className="max-w-[400px] text-[30px] font-bold leading-[1.18] tracking-tight xl:text-[34px]">
                Selamat datang kembali di YP-MMS.
              </h2>

              <p className="mt-3 max-w-[380px] text-sm leading-6 text-blue-50">
                Akses informasi rapat, notulen, keputusan, dan tindak lanjut pekerjaan melalui
                satu sistem terintegrasi.
              </p>
            </div>

            {/* Mascot area (dekoratif) */}
            <div
              className="relative flex flex-1 items-center justify-center py-4"
              aria-hidden="true"
            >
              <div className="relative h-[290px] w-full max-w-[400px]">
                {/* Halo */}
                <div className="yp-glow pointer-events-none absolute left-1/2 top-1/2 h-[270px] w-[270px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.38)_0%,rgba(125,211,252,0.28)_42%,rgba(56,189,248,0)_70%)]" />

                {/* Orbit */}
                <div className="pointer-events-none absolute left-1/2 top-1/2 h-[225px] w-[225px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/25" />
                <div className="pointer-events-none absolute left-1/2 top-1/2 h-[272px] w-[272px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-white/25" />

                {/* Orbit badges: alur Discuss, Decide, Execute */}
                <div
                  className="absolute z-10 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#ff7aa8] text-white shadow-lg shadow-blue-950/20 ring-4 ring-white/25"
                  style={{ left: 322, top: 40 }}
                >
                  <ListChecks className="h-4 w-4" />
                </div>
                <div
                  className="absolute z-10 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#8b7cf6] text-white shadow-lg shadow-blue-950/20 ring-4 ring-white/25"
                  style={{ left: 52, top: 140 }}
                >
                  <MessagesSquare className="h-4 w-4" />
                </div>
                <div
                  className="absolute z-10 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#ffca55] text-[#25314a] shadow-lg shadow-blue-950/20 ring-4 ring-white/25"
                  style={{ left: 336, top: 236 }}
                >
                  <Clock3 className="h-4 w-4" />
                </div>

                {/* Colored dots */}
                <span className="pointer-events-none absolute left-[24%] top-[30%] h-2 w-2 rounded-full bg-[#ffca55]/90" />
                <span className="pointer-events-none absolute right-[16%] top-[56%] h-1.5 w-1.5 rounded-full bg-emerald-300" />
                <span className="pointer-events-none absolute bottom-[22%] left-[30%] h-2 w-2 rounded-full bg-sky-200" />

                {/* Floor shadow */}
                <div className="pointer-events-none absolute bottom-[1%] left-1/2 h-4 w-36 -translate-x-1/2 rounded-full bg-[#00235f]/35 blur-md" />

                {/* Mascot (di-crop ke area yang terlihat) */}
                <div className="absolute left-1/2 top-1/2 z-10 h-[250px] w-[124px] -translate-x-1/2 -translate-y-[52%] drop-shadow-[0_16px_24px_rgba(0,35,120,0.28)]">
                  <Image
                    src="/images/yp-mascot-login.png"
                    alt=""
                    width={MASCOT.canvas}
                    height={MASCOT.canvas}
                    priority
                    style={mascotImageStyle}
                  />
                </div>

                {/* Calendar card */}
                <div className="yp-float absolute left-0 top-[4%] z-20 flex items-center gap-2.5 rounded-xl bg-white/95 px-3 py-2.5 shadow-[0_14px_35px_rgba(0,35,100,0.22)]">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#ffca55] text-[#25314a]">
                    <CalendarDays className="h-[18px] w-[18px]" />
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-[#667797]">Agenda</p>
                    <p className="text-xs font-bold text-[#17264a]">Jadwal rapat</p>
                  </div>
                </div>

                {/* Minutes card */}
                <div className="yp-float-slow absolute right-0 top-[40%] z-20 flex items-center gap-2.5 rounded-xl bg-white/95 px-3 py-2.5 shadow-[0_14px_35px_rgba(0,35,100,0.22)]">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-white">
                    <ClipboardCheck className="h-[18px] w-[18px]" />
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-[#667797]">Dokumentasi</p>
                    <p className="text-xs font-bold text-[#17264a]">Notulen rapat</p>
                  </div>
                </div>

                {/* Team card */}
                <div className="yp-float absolute bottom-[4%] left-0 z-20 flex items-center gap-2.5 rounded-xl bg-white/95 px-3 py-2.5 shadow-[0_14px_35px_rgba(0,35,100,0.22)] [animation-delay:2s]">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0ea5e9] text-white">
                    <UsersRound className="h-[18px] w-[18px]" />
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-[#667797]">Kolaborasi</p>
                    <p className="text-xs font-bold text-[#17264a]">Tim terhubung</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom info */}
          <div className="relative z-10 flex items-center gap-3 rounded-2xl border border-white/25 bg-white/15 px-4 py-3.5 shadow-lg backdrop-blur-xl">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ffca55] text-[#25314a]">
              <ShieldCheck className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm font-bold">Akses Karyawan</p>
              <p className="mt-0.5 text-[11px] text-blue-50">Sistem internal Yuk Peduli</p>
            </div>
          </div>
        </section>

        {/* Login Form */}
        <section className="flex items-center bg-white px-6 py-10 sm:px-10 xl:px-14">
          <div className="mx-auto w-full max-w-[440px]">
            {/* Logo + branding (teks hanya tampil di mobile) */}
            <div className="mb-8 flex items-center gap-3">
              <BrandLogo className="h-16" />

              <div className="lg:hidden">
                <h1 className="font-extrabold leading-none tracking-wide text-[#101b3a]">
                  YP-MMS
                </h1>
                <p className="mt-1 text-xs text-slate-500">Yuk Peduli Meeting Management System</p>
              </div>
            </div>

            <div className="mb-8">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-[#eaf3ff] px-4 py-2 text-xs font-bold text-[#0865ed]">
                <LogIn className="h-4 w-4" />
                Login Karyawan
              </div>

              <h2 className="text-3xl font-extrabold tracking-tight text-[#101b3a] sm:text-4xl">
                Masuk ke Akun
              </h2>

              <p className="mt-3 text-sm leading-6 text-[#52658d]">
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
                <label htmlFor="login-email" className="text-sm font-semibold text-[#263653]">
                  Email
                </label>

                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <Input
                    id="login-email"
                    name="email"
                    type="email"
                    inputMode="email"
                    defaultValue={state.email ?? ""}
                    onChange={handleEmailChange}
                    placeholder="nama@email.com"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    maxLength={MAX_EMAIL_LENGTH}
                    required
                    aria-invalid={!!state.error}
                    aria-describedby={state.error ? "login-error" : undefined}
                    className="h-12 rounded-xl border-[#d8e5f7] bg-[#fafcff] pl-10 text-sm transition placeholder:text-slate-400 focus-visible:border-[#0865ed] focus-visible:bg-white focus-visible:ring-[#0865ed]/20"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label htmlFor="login-password" className="text-sm font-semibold text-[#263653]">
                  Kata Sandi
                </label>

                <div className="relative">
                  <LockKeyhole className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <Input
                    id="login-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Masukkan kata sandi"
                    onChange={handlePasswordChange}
                    maxLength={MAX_PASSWORD_LENGTH}
                    required
                    aria-invalid={!!state.error}
                    aria-describedby={state.error ? "login-error" : undefined}
                    className="h-12 rounded-xl border-[#d8e5f7] bg-[#fafcff] pl-10 pr-11 text-sm transition placeholder:text-slate-400 focus-visible:border-[#0865ed] focus-visible:bg-white focus-visible:ring-[#0865ed]/20"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded text-slate-400 transition hover:text-[#0865ed] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0865ed]/40"
                    aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <Link
                  href="/forgot-password"
                  className="text-xs font-semibold text-[#0865ed] transition hover:text-[#0649b8] focus:outline-none focus-visible:underline"
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
                className="h-12 w-full gap-2 rounded-xl bg-gradient-to-r from-[#0860ed] to-[#0875f7] font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:shadow-blue-600/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
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

            <p className="mt-6 text-center text-xs leading-5 text-[#667797]">
              Belum punya akses? Akun dibuat oleh administrator dan dikirim lewat undangan email.
            </p>

            {/* Footer */}
            <div className="mt-8 border-t border-[#e7edf7] pt-5">
              <div className="flex items-center justify-center gap-2 text-xs text-[#a6b2c7]">
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