"use client";

import Link from "next/link";
import Image from "next/image";

import { BrandLogo } from "@/components/brand-logo";
import {
  ArrowLeft,
  ShieldCheck,
  UserRound,
  Headset,
  ShieldAlert,
  AlertTriangle,
  KeyRound,
  Fingerprint,
} from "lucide-react";

/**
 * Maskot: kanvas PNG 512x512, tetapi area yang terlihat hanya
 * x 134–357 dan y 32–481 (224x450). Supaya ukuran maskot tidak mengecil
 * karena ruang kosong di kanvas, gambar di-crop lewat CSS (tanpa edit file).
 *
 * Wrapper memakai rasio 224:450, gambar diperbesar & digeser sesuai bounds.
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

const steps = [
  {
    no: "1",
    icon: Headset,
    title: "Hubungi administrator",
    desc: "Sampaikan permintaan reset password beserta nama karyawan Anda melalui kanal resmi perusahaan.",
  },
  {
    no: "2",
    icon: ShieldCheck,
    title: "Verifikasi identitas",
    desc: "Administrator memastikan permintaan benar-benar berasal dari Anda sebelum memprosesnya.",
  },
  {
    no: "3",
    icon: KeyRound,
    title: "Terima password sementara",
    desc: "Administrator menyerahkan password sementara secara langsung atau lewat kanal yang aman. Segera ganti setelah berhasil masuk.",
  },
];

export default function ForgotPasswordPage() {
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

      {/* Main container */}
      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-[0_25px_80px_rgba(37,99,235,0.13)] lg:min-h-[680px] lg:grid-cols-[1fr_1fr]">
        {/* LEFT PANEL */}
        <section className="relative hidden flex-col overflow-hidden bg-gradient-to-br from-[#064fc9] via-[#0865ed] to-[#38a9ee] p-9 text-white lg:flex xl:p-10">
          {/* Background effects */}
          <div className="pointer-events-none absolute -right-28 -top-28 h-96 w-96 rounded-full bg-sky-300/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-40 -left-32 h-[420px] w-[420px] rounded-full border border-white/10 bg-white/[0.03]" />
          <div className="pointer-events-none absolute -bottom-24 -left-16 h-[300px] w-[300px] rounded-full border border-white/10" />

          <div className="relative z-10 flex flex-1 flex-col">
            {/* Branding */}
            <div className="flex items-center gap-3.5">
              <div className="flex shrink-0 items-center rounded-2xl bg-white px-4 py-3 shadow-lg shadow-blue-950/15">
                <BrandLogo className="h-11" />
              </div>

              <div>
                <p className="text-xl font-extrabold leading-none tracking-wide">
                  YP-MMS
                </p>
                <p className="mt-1.5 text-xs text-blue-50">
                  Meeting Management System
                </p>
              </div>
            </div>

            {/* Intro */}
            <div className="mt-9">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#ffca55] px-3.5 py-1.5 text-xs font-bold text-[#25314a] shadow-lg shadow-blue-950/10">
                <ShieldAlert className="h-4 w-4" />
                Keamanan akun
              </div>

              <h2 className="max-w-[400px] text-[28px] font-bold leading-[1.2] tracking-tight xl:text-[32px]">
                Keamanan akun dimulai dari pengelolaan akses yang tepat.
              </h2>

              <p className="mt-3 max-w-[380px] text-[13px] leading-6 text-blue-50/90">
                Akun karyawan dibuat dan dikelola terpusat oleh administrator
                untuk menjaga keamanan akses dan memastikan setiap karyawan
                menggunakan akun sesuai kewenangannya.
              </p>
            </div>

            {/* Mascot area */}
            <div className="relative flex flex-1 items-center justify-center py-5">
              <div className="relative h-[340px] w-full max-w-[420px]">
                {/* Halo berwarna di belakang maskot */}
                <div className="yp-glow pointer-events-none absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.38)_0%,rgba(125,211,252,0.28)_42%,rgba(56,189,248,0)_70%)]" />

                {/* Orbit */}
                <div className="pointer-events-none absolute left-1/2 top-1/2 h-[260px] w-[260px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/25" />
                <div className="pointer-events-none absolute left-1/2 top-1/2 h-[310px] w-[310px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-white/25" />

                {/* Badge orbit: elemen keamanan akun */}
                <div
                  className="absolute z-10 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#ffca55] text-[#25314a] shadow-lg shadow-blue-950/20 ring-4 ring-white/30"
                  style={{ left: 300, top: 44 }}
                  aria-hidden="true"
                >
                  <KeyRound className="h-[18px] w-[18px]" />
                </div>
                <div
                  className="absolute z-10 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#8b7cf6] text-white shadow-lg shadow-blue-950/20 ring-4 ring-white/25"
                  style={{ left: 62, top: 232 }}
                  aria-hidden="true"
                >
                  <Fingerprint className="h-4 w-4" />
                </div>
                <div
                  className="absolute z-10 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#ff7aa8] text-white shadow-lg shadow-blue-950/20 ring-4 ring-white/25"
                  style={{ left: 366, top: 150 }}
                  aria-hidden="true"
                >
                  <Headset className="h-4 w-4" />
                </div>

                {/* Titik dekoratif berwarna */}
                <span className="pointer-events-none absolute left-[22%] top-[52%] h-2 w-2 rounded-full bg-[#ffca55]/90" />
                <span className="pointer-events-none absolute right-[18%] top-[22%] h-1.5 w-1.5 rounded-full bg-emerald-300" />
                <span className="pointer-events-none absolute bottom-[26%] right-[26%] h-2 w-2 rounded-full bg-sky-200" />

                {/* Bayangan lantai */}
                <div className="pointer-events-none absolute bottom-[2%] left-1/2 h-4 w-44 -translate-x-1/2 rounded-full bg-[#00235f]/35 blur-md" />

                {/* Mascot (di-crop ke area yang terlihat, rasio 224:450) */}
                <div
                  className="absolute left-1/2 top-1/2 z-10 h-[300px] -translate-x-1/2 -translate-y-[52%] drop-shadow-[0_18px_25px_rgba(0,35,100,0.28)]"
                  style={{ aspectRatio: `${MASCOT.w} / ${MASCOT.h}` }}
                  role="img"
                  aria-label="Maskot YP-MMS"
                >
                  <Image
                    src="/images/yp-mascot-forgot.png"
                    alt=""
                    width={MASCOT.canvas}
                    height={MASCOT.canvas}
                    priority
                    style={mascotImageStyle}
                  />
                </div>

                {/* Administrator card */}
                <div className="yp-float absolute left-0 top-[6%] z-20 flex items-center gap-2.5 rounded-xl bg-white/95 px-3 py-2.5 shadow-[0_14px_35px_rgba(0,35,100,0.22)]">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#ffca55] text-[#25314a]">
                    <UserRound className="h-[18px] w-[18px]" />
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-[#667797]">
                      Akun dibuat oleh
                    </p>
                    <p className="text-xs font-bold text-[#17264a]">
                      Administrator
                    </p>
                  </div>
                </div>

                {/* Verification card */}
                <div className="yp-float-reverse absolute bottom-[8%] right-0 z-20 flex items-center gap-2.5 rounded-xl bg-white/95 px-3 py-2.5 shadow-[0_14px_35px_rgba(0,35,100,0.22)]">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-white">
                    <ShieldCheck className="h-[18px] w-[18px]" />
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-[#667797]">
                      Pemulihan akun
                    </p>
                    <p className="text-xs font-bold text-[#17264a]">
                      Verifikasi admin
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT PANEL */}
        <section className="flex items-center bg-white px-6 py-10 sm:px-10 xl:px-14">
          <div className="mx-auto w-full max-w-[440px]">
            {/* Logo */}
            <BrandLogo className="mb-8 h-16" />

            {/* Heading */}
            <div className="mb-7">
              <h1 className="text-[32px] font-extrabold tracking-tight text-[#101b3a] sm:text-[36px]">
                Lupa password?
              </h1>

              <p className="mt-3 max-w-md text-sm leading-6 text-[#667797]">
                Akun YP-MMS dibuat dan dikelola oleh administrator, sehingga
                permintaan reset password juga diajukan melalui administrator.
              </p>
            </div>

            {/* Steps */}
            <div className="mb-5">
              <h2 className="text-base font-bold text-[#17264a]">
                Prosedur pemulihan akun
              </h2>
              <p className="mt-1 text-xs leading-5 text-[#8492ac]">
                Ikuti tiga tahap berikut untuk mengatur ulang password.
              </p>

              <ol className="mt-4">
                {steps.map((step, index) => {
                  const Icon = step.icon;
                  const isLast = index === steps.length - 1;

                  return (
                    <li key={step.no} className="relative flex gap-4">
                      {/* Garis penghubung antar tahap */}
                      {!isLast && (
                        <span
                          aria-hidden="true"
                          className="absolute left-[19px] top-10 h-[calc(100%-24px)] w-px bg-gradient-to-b from-[#0865ed]/40 to-[#0865ed]/10"
                        />
                      )}

                      <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0865ed] text-sm font-bold text-white shadow-md shadow-blue-500/25 ring-4 ring-white">
                        {step.no}
                      </div>

                      <div
                        className={`flex-1 rounded-2xl border border-[#e0eaff] bg-[#f7faff] p-3.5 ${
                          isLast ? "" : "mb-3"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-[#0870ed]" />
                          <h3 className="text-[13px] font-bold text-[#17264a]">
                            {step.title}
                          </h3>
                        </div>
                        <p className="mt-1.5 text-xs leading-5 text-[#72819e]">
                          {step.desc}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>

            {/* Password rules */}
            <div className="mb-5 flex items-start gap-3 rounded-2xl border border-[#e0eaff] bg-[#f7faff] p-3.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#e1edff] text-[#0870ed]">
                <KeyRound className="h-[18px] w-[18px]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold text-[#17264a]">
                  Ketentuan password baru
                </p>
                <p className="mt-1 text-xs leading-5 text-[#72819e]">
                  10–64 karakter berupa huruf, angka, dan simbol, tanpa spasi.
                  Disarankan mengombinasikan huruf besar, huruf kecil, angka,
                  dan simbol.
                </p>
              </div>
            </div>

            {/* Notice */}
            <div
              role="note"
              className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-gradient-to-br from-[#fff9eb] to-[#fff3d8] p-3.5"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#ffedc2] text-[#d18a12]">
                <AlertTriangle className="h-[18px] w-[18px]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold text-[#9a5b08]">
                  Perhatian
                </p>
                <p className="mt-1 text-xs leading-5 text-[#8a6430]">
                  Reset password tidak dapat dilakukan secara mandiri. Jangan
                  membagikan password Anda kepada siapa pun, termasuk lewat
                  chat.
                </p>
              </div>
            </div>

            {/* Back to login */}
            <Link
              href="/login"
              className="group flex h-[52px] w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-[#075bea] to-[#0878f5] text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-600/25 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-300 active:translate-y-0"
            >
              <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
              Kembali ke login
            </Link>

            {/* Footer */}
            <p className="mt-8 border-t border-[#e7edf7] pt-5 text-center text-[11px] text-[#a6b2c7]">
              Connect · Discuss · Decide · Execute
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}