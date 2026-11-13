"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Mail,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  KeyRound,
  Fingerprint,
  Clock3,
  LockKeyhole,
} from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MAX_EMAIL_LENGTH, handleEmailBlur, handleEmailChange } from "@/lib/auth/email";

import { requestPasswordResetAction, type ForgotState } from "./actions";

/**
 * Jeda sebelum tautan bisa diminta lagi. Selaras dengan jeda minimum per
 * pengguna di Supabase (60 detik). Jeda ini hanya di browser: memuat ulang
 * halaman mengulang hitungannya, tetapi batas di sisi Supabase tetap berlaku.
 */
const RESEND_COOLDOWN_MS = 60_000;

type PageState = ForgotState & {
  /** Waktu (ms) permintaan terakhir berhasil; dipakai untuk menghitung jeda kirim ulang. */
  sentAt?: number;
  /**
   * Opsional, diisi server action: kolom yang bermasalah. Selama server belum
   * mengirimnya, setiap error dianggap salah isian email.
   */
  invalid?: string[];
};

const initialState: PageState = {};

async function submitAction(previous: PageState, formData: FormData): Promise<PageState> {
  const result = await requestPasswordResetAction(previous, formData);

  return result.sent ? { ...result, sentAt: Date.now() } : result;
}

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

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = React.useActionState(submitAction, initialState);
  const [now, setNow] = React.useState(0);

  // Hitung mundur jeda kirim ulang. State hanya diubah dari callback interval.
  React.useEffect(() => {
    if (!state.sentAt) return;

    const end = state.sentAt + RESEND_COOLDOWN_MS;
    const id = window.setInterval(() => {
      const current = Date.now();

      setNow(current);
      if (current >= end) window.clearInterval(id);
    }, 1000);

    return () => window.clearInterval(id);
  }, [state.sentAt]);

  const secondsLeft = state.sentAt
    ? Math.max(
        0,
        Math.ceil((state.sentAt + RESEND_COOLDOWN_MS - Math.max(now, state.sentAt)) / 1000),
      )
    : 0;
  const coolingDown = secondsLeft > 0;

  // aria-invalid hanya untuk kolom yang memang bermasalah, bukan semua galat.
  const emailInvalid = state.invalid ? state.invalid.includes("email") : !!state.error;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#edf4ff] px-4 py-6 sm:px-6">
      <style jsx global>{`
        @keyframes yp-float {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-6px);
          }
        }

        @keyframes yp-float-reverse {
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
            opacity: 0.3;
          }
          50% {
            opacity: 0.55;
          }
        }

        .yp-float {
          animation: yp-float 6s ease-in-out infinite;
        }

        .yp-float-reverse {
          animation: yp-float-reverse 7s ease-in-out infinite;
        }

        .yp-glow {
          animation: yp-glow 6s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .yp-float,
          .yp-float-reverse,
          .yp-glow {
            animation: none;
          }
        }
      `}</style>

      {/* Background decorations */}
      <div className="pointer-events-none absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-blue-200/40 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-sky-200/50 blur-[100px]" />

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-[0_25px_80px_rgba(37,99,235,0.13)] lg:min-h-[640px] lg:grid-cols-2">
        {/* Panel branding */}
        <section className="relative hidden flex-col overflow-hidden bg-gradient-to-br from-[#064fc9] via-[#0865ed] to-[#38a9ee] p-8 text-white lg:flex xl:p-9">
          <div className="pointer-events-none absolute -right-28 -top-28 h-96 w-96 rounded-full bg-sky-300/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-40 -left-32 h-[420px] w-[420px] rounded-full border border-white/10 bg-white/[0.03]" />
          <div className="pointer-events-none absolute -bottom-24 -left-16 h-[300px] w-[300px] rounded-full border border-white/10" />

          <div className="relative z-10 flex flex-1 flex-col">
            {/* Branding (satu-satunya logo di tampilan desktop) */}
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

            {/* Intro */}
            <div className="mt-7">
              <h2 className="max-w-[400px] text-[28px] font-bold leading-[1.2] tracking-tight xl:text-[32px]">
                Kembali bekerja dalam beberapa menit.
              </h2>

              <p className="mt-3 max-w-[380px] text-sm leading-6 text-blue-50">
                Pemulihan dilakukan sendiri lewat email, dalam dua langkah singkat.
              </p>
            </div>

            {/* Mascot area (dekoratif) */}
            <div
              className="relative flex flex-1 items-center justify-center py-4"
              aria-hidden="true"
            >
              <div className="relative h-[300px] w-full max-w-[420px]">
                {/* Halo */}
                <div className="yp-glow pointer-events-none absolute left-1/2 top-1/2 h-[280px] w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.38)_0%,rgba(125,211,252,0.28)_42%,rgba(56,189,248,0)_70%)]" />

                {/* Orbit */}
                <div className="pointer-events-none absolute left-1/2 top-1/2 h-[260px] w-[260px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/25" />
                <div className="pointer-events-none absolute left-1/2 top-1/2 h-[310px] w-[310px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-white/25" />

                {/*
                  Orbit badges: keamanan dan pemulihan akun. Posisi dihitung dari
                  pusat orbit dan tepat di cincin putus-putus (radius 155px).
                */}
                <div
                  className="absolute z-10 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#ffca55] text-[#25314a] shadow-lg shadow-blue-950/20 ring-4 ring-white/30"
                  style={{ left: "calc(50% + 90px)", top: "calc(50% - 126px)" }}
                >
                  <Clock3 className="h-[18px] w-[18px]" />
                </div>
                <div
                  className="absolute z-10 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#8b7cf6] text-white shadow-lg shadow-blue-950/20 ring-4 ring-white/25"
                  style={{ left: "calc(50% - 143px)", top: "calc(50% + 60px)" }}
                >
                  <Fingerprint className="h-4 w-4" />
                </div>
                <div
                  className="absolute z-10 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#ff7aa8] text-white shadow-lg shadow-blue-950/20 ring-4 ring-white/25"
                  style={{ left: "calc(50% + 154px)", top: "calc(50% - 20px)" }}
                >
                  <LockKeyhole className="h-4 w-4" />
                </div>

                {/* Colored dots */}
                <span className="pointer-events-none absolute left-[22%] top-[52%] h-2 w-2 rounded-full bg-[#ffca55]/90" />
                <span className="pointer-events-none absolute right-[18%] top-[22%] h-1.5 w-1.5 rounded-full bg-emerald-300" />
                <span className="pointer-events-none absolute bottom-[26%] right-[26%] h-2 w-2 rounded-full bg-sky-200" />

                {/* Floor shadow */}
                <div className="pointer-events-none absolute bottom-[2%] left-1/2 h-4 w-44 -translate-x-1/2 rounded-full bg-[#00235f]/35 blur-md" />

                {/* Mascot (di-crop ke area yang terlihat). Dimuat lazy: panel ini
                    disembunyikan di bawah lg, jadi tidak diunduh di mobile. */}
                <div className="absolute left-1/2 top-1/2 z-10 h-[270px] w-[134px] -translate-x-1/2 -translate-y-[52%] drop-shadow-[0_18px_25px_rgba(0,35,100,0.28)]">
                  <Image
                    src="/images/yp-mascot-forgot.png"
                    alt=""
                    width={MASCOT.canvas}
                    height={MASCOT.canvas}
                    sizes="306px"
                    style={mascotImageStyle}
                  />
                </div>

                {/* Step 1 card */}
                <div className="yp-float absolute left-0 top-[6%] z-20 flex items-center gap-2.5 rounded-xl bg-white/95 px-3 py-2.5 shadow-[0_14px_35px_rgba(0,35,100,0.22)]">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#ffca55] text-[#25314a]">
                    <Mail className="h-[18px] w-[18px]" />
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-[#556a8d]">Langkah 1</p>
                    <p className="text-xs font-bold text-[#17264a]">Masukkan email</p>
                  </div>
                </div>

                {/* Step 2 card */}
                <div className="yp-float-reverse absolute bottom-[8%] right-0 z-20 flex items-center gap-2.5 rounded-xl bg-white/95 px-3 py-2.5 shadow-[0_14px_35px_rgba(0,35,100,0.22)]">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-white">
                    <KeyRound className="h-[18px] w-[18px]" />
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-[#556a8d]">Langkah 2</p>
                    <p className="text-xs font-bold text-[#17264a]">Buka tautan di email</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom info (selaras dengan halaman masuk) */}
          <div className="relative z-10 flex items-center gap-3 rounded-2xl border border-white/25 bg-white/15 px-4 py-3.5 shadow-lg backdrop-blur-xl">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ffca55] text-[#25314a]">
              <ShieldCheck className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm font-bold">Akses tetap aman</p>
              <p className="mt-0.5 text-xs text-blue-50">Tautan pemulihan hanya berlaku singkat</p>
            </div>
          </div>
        </section>

        {/* Form lupa kata sandi */}
        <section className="flex items-center bg-white px-6 py-10 sm:px-10 xl:px-14">
          <div className="mx-auto w-full max-w-[440px]">
            {/* Logo + branding: hanya di mobile/tablet. Di desktop logo sudah ada di panel kiri. */}
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <BrandLogo className="h-16" />

              <div>
                <h1 className="font-extrabold leading-none tracking-wide text-[#101b3a]">
                  YP-MMS
                </h1>
                <p className="mt-1 text-xs text-slate-600">Yuk Peduli Meeting Management System</p>
              </div>
            </div>

            <Link
              href="/login"
              className="mb-7 inline-flex items-center gap-2 rounded text-sm font-semibold text-slate-600 transition-colors hover:text-[#0865ed] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0865ed]/40"
            >
              <ArrowLeft className="h-4 w-4" />
              Kembali ke halaman masuk
            </Link>

            <div className="mb-7">
              <h2 className="text-[32px] font-extrabold tracking-tight text-[#101b3a] sm:text-[36px]">
                Lupa kata sandi?
              </h2>

              <p className="mt-3 text-sm leading-6 text-[#556a8d]">
                Gunakan email yang terdaftar pada akun Anda.
              </p>
            </div>

            <form action={formAction} className="space-y-5" noValidate>
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-semibold text-[#263653]">
                  Email
                </label>

                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

                  <Input
                    id="email"
                    name="email"
                    type="email"
                    inputMode="email"
                    placeholder="nama@email.com"
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    maxLength={MAX_EMAIL_LENGTH}
                    defaultValue={state.email ?? ""}
                    onChange={handleEmailChange}
                    onBlur={handleEmailBlur}
                    required
                    aria-invalid={emailInvalid || undefined}
                    aria-describedby={emailInvalid && state.error ? "forgot-error" : undefined}
                    className="h-12 rounded-xl border-[#d8e5f7] bg-[#fafcff] pl-10 text-sm transition placeholder:text-slate-500 focus-visible:border-[#0865ed] focus-visible:bg-white focus-visible:ring-[#0865ed]/20"
                  />
                </div>
              </div>

              {/* Galat atau berhasil, tidak pernah keduanya sekaligus. */}
              {state.error ? (
                <div
                  id="forgot-error"
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  {state.error}
                </div>
              ) : state.sent ? (
                <div
                  role="status"
                  className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
                >
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />

                  <div>
                    <p className="font-semibold">Permintaan diterima.</p>
                    <p className="mt-1 leading-relaxed">
                      Jika email tersebut terdaftar, tautan pemulihan akan dikirim. Periksa juga
                      folder spam.
                    </p>
                  </div>
                </div>
              ) : null}

              <Button
                type="submit"
                disabled={pending || coolingDown}
                className="h-12 w-full gap-2 rounded-xl bg-gradient-to-r from-[#075bea] to-[#0878f5] text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:shadow-blue-600/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
              >
                {pending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Mengirim…
                  </>
                ) : coolingDown ? (
                  `Kirim ulang dalam ${secondsLeft} dtk`
                ) : (
                  "Kirim tautan pemulihan"
                )}
              </Button>
            </form>

            <p className="mt-8 border-t border-[#e7edf7] pt-5 text-center text-sm text-[#556a8d]">
              Email tidak sampai? Hubungi administrator.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}