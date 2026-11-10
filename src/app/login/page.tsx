"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  UserRound,
  LockKeyhole,
  Eye,
  EyeOff,
  ArrowRight,
  LogIn,
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

/**
 * Aturan kredensial. Harus sama dengan aturan yang dipakai DBA saat membuat
 * akun, dan diterapkan juga di backend (sanitasi di browser hanya lapisan
 * pertama, bukan pengganti validasi server).
 *
 * Nama karyawan : huruf A-Z / a-z dan spasi, 3-50 karakter.
 * Password      : karakter ASCII yang tampak (huruf, angka, dan semua simbol),
 *                 tanpa spasi, 10-64 karakter.
 */
const MIN_NAME_LENGTH = 3;
const MAX_NAME_LENGTH = 50;
const MIN_PASSWORD_LENGTH = 10;
const MAX_PASSWORD_LENGTH = 64;

const DISALLOWED_NAME_CHARS = /[^a-zA-Z ]/g;
const DISALLOWED_PASSWORD_CHARS = /[^\x21-\x7E]/g;

const DEFAULT_REDIRECT = "/dashboard";

function sanitizeName(value: string) {
  return value
    .replace(DISALLOWED_NAME_CHARS, "")
    .replace(/ {2,}/g, " ")
    .slice(0, MAX_NAME_LENGTH);
}

/**
 * Membuang spasi dan karakter di luar ASCII yang tampak. Karakter ini memang
 * tidak mungkin ada di password yang valid, jadi membuangnya tidak membuat
 * password sah ditolak. Sekaligus membersihkan spasi atau baris baru yang
 * ikut tersalin dari password manager.
 */
function sanitizePassword(value: string) {
  return value
    .replace(DISALLOWED_PASSWORD_CHARS, "")
    .slice(0, MAX_PASSWORD_LENGTH);
}

/** Pesan di atas form, dipilih lewat query ?reason=... */
const STATUS_MESSAGES = {
  logout: {
    tone: "success",
    text: "Anda berhasil keluar dari akun.",
  },
  expired: {
    tone: "warning",
    text: "Sesi Anda telah berakhir. Silakan masuk kembali.",
  },
  unauthorized: {
    tone: "info",
    text: "Silakan masuk untuk melanjutkan.",
  },
} as const;

type StatusReason = keyof typeof STATUS_MESSAGES;

const STATUS_STYLES = {
  success: {
    box: "border-emerald-200 bg-emerald-50 text-emerald-800",
    icon: CheckCircle2,
  },
  warning: {
    box: "border-amber-200 bg-[#fff9eb] text-[#8a5a0b]",
    icon: AlertTriangle,
  },
  info: {
    box: "border-blue-200 bg-[#eaf3ff] text-[#0649b8]",
    icon: Info,
  },
} as const;

const AUTH_ERRORS = {
  invalid: "Nama karyawan atau password salah.",
  inactive: "Akun Anda tidak aktif. Hubungi administrator.",
  "rate-limited": "Terlalu banyak percobaan. Coba lagi beberapa menit lagi.",
  server: "Terjadi gangguan pada server. Coba lagi sebentar lagi.",
  network: "Tidak dapat terhubung ke server. Periksa koneksi internet Anda.",
} as const;

type AuthResult =
  | { ok: true }
  | { ok: false; reason: "invalid" | "inactive" | "rate-limited" | "server" };

/**
 * Hanya terima tujuan redirect berupa path internal, supaya ?next=
 * tidak bisa dipakai untuk mengarahkan pengguna ke situs lain.
 */
function getSafeRedirect(value: string | null) {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.startsWith("/\\") ||
    value.startsWith("/login")
  ) {
    return DEFAULT_REDIRECT;
  }

  return value;
}

/**
 * Satu-satunya tempat yang perlu diganti saat backend siap.
 * Saat ini belum ada autentikasi ke database, jadi selalu berhasil.
 */
async function authenticate(credentials: {
  name: string;
  password: string;
}): Promise<AuthResult> {
  // TODO: Integrasi API login backend, contoh:
  //
  // const res = await fetch("/api/auth/login", {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify(credentials),
  // });
  // if (res.status === 401) return { ok: false, reason: "invalid" };
  // if (res.status === 403) return { ok: false, reason: "inactive" };
  // if (res.status === 429) return { ok: false, reason: "rate-limited" };
  // if (!res.ok) return { ok: false, reason: "server" };
  // return { ok: true };
  void credentials;
  return { ok: true };
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

export default function LoginPage() {
  // useSearchParams wajib dibungkus Suspense agar build production berhasil.
  return (
    <React.Suspense fallback={null}>
      <LoginContent />
    </React.Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirectTo = getSafeRedirect(searchParams.get("next"));
  const reason = searchParams.get("reason");
  const initialStatus =
    reason && reason in STATUS_MESSAGES
      ? STATUS_MESSAGES[reason as StatusReason]
      : null;

  const nameRef = React.useRef<HTMLInputElement>(null);
  const passwordRef = React.useRef<HTMLInputElement>(null);

  const [showPassword, setShowPassword] = React.useState(false);
  const [capsLock, setCapsLock] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [showStatus, setShowStatus] = React.useState(true);
  const [form, setForm] = React.useState({
    name: "",
    password: "",
  });
  const [touched, setTouched] = React.useState({
    name: false,
    password: false,
  });
  // Penanda bahwa ada karakter yang dibuang otomatis dari input
  const [filtered, setFiltered] = React.useState({
    name: false,
    password: false,
  });
  const [error, setError] = React.useState("");

  function updateField(field: keyof typeof form, value: string) {
    const cleanedValue =
      field === "name" ? sanitizeName(value) : sanitizePassword(value);

    setForm((current) => ({
      ...current,
      [field]: cleanedValue,
    }));

    setFiltered((current) => ({
      ...current,
      [field]: cleanedValue !== value,
    }));

    setError("");
    setShowStatus(false);
  }

  function markTouched(field: keyof typeof touched) {
    setTouched((current) => ({ ...current, [field]: true }));
  }

  function updateCapsLock(event: React.KeyboardEvent<HTMLInputElement>) {
    setCapsLock(event.getModifierState("CapsLock"));
  }

  // Validasi format saja. Kecocokan nama dan password diperiksa backend.
  const nameValid = form.name.trim().length >= MIN_NAME_LENGTH;
  const passwordValid = form.password.length >= MIN_PASSWORD_LENGTH;

  const isFormValid = nameValid && passwordValid;

  const showNameError = touched.name && !nameValid;
  const showPasswordError = touched.password && !passwordValid;

  const nameErrorText =
    form.name.trim() === ""
      ? "Nama karyawan wajib diisi."
      : `Nama karyawan minimal ${MIN_NAME_LENGTH} huruf.`;

  const passwordErrorText =
    form.password === ""
      ? "Password wajib diisi."
      : `Password minimal ${MIN_PASSWORD_LENGTH} karakter.`;

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Cegah submit ganda saat permintaan masih berjalan
    if (isLoading) return;

    setError("");
    setShowStatus(false);

    if (!isFormValid) {
      setTouched({ name: true, password: true });
      setError("Periksa kembali nama karyawan dan password Anda.");
      (nameValid ? passwordRef : nameRef).current?.focus();
      return;
    }

    setIsLoading(true);

    try {
      const result = await authenticate({
        name: form.name.trim(),
        password: form.password,
      });

      if (result.ok) {
        // Tetap dalam keadaan loading sampai halaman berpindah.
        // replace: tombol Back tidak membawa pengguna kembali ke login.
        router.replace(redirectTo);
        return;
      }

      setError(AUTH_ERRORS[result.reason]);

      if (result.reason === "invalid") {
        setForm((current) => ({ ...current, password: "" }));
        setTouched((current) => ({ ...current, password: false }));
        passwordRef.current?.focus();
      }
    } catch {
      setError(AUTH_ERRORS.network);
    }

    setIsLoading(false);
  }

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

      {/* Background */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-200/50 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-sky-200/50 blur-3xl" />

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[30px] border border-blue-200/70 bg-white shadow-[0_20px_60px_rgba(37,99,235,0.16)] lg:min-h-[700px] lg:grid-cols-2">
        {/* LEFT PANEL */}
        <section className="relative hidden flex-col overflow-hidden bg-gradient-to-br from-[#075bea] via-[#0865ed] to-[#39b5f4] p-9 text-white lg:flex xl:p-10">
          {/* Background decorations */}
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
                <p className="text-xl font-extrabold leading-none tracking-wide">
                  YP-MMS
                </p>
                <p className="mt-1.5 text-xs text-blue-50">
                  Meeting Management System
                </p>
              </div>
            </div>

            {/* Welcome */}
            <div className="mt-9">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#ffca55] px-3.5 py-1.5 text-xs font-bold text-[#25314a] shadow-lg shadow-blue-950/10">
                <LogIn className="h-4 w-4" />
                Employee login
              </div>

              <h2 className="max-w-[400px] text-[30px] font-bold leading-[1.18] tracking-tight xl:text-[34px]">
                Selamat datang kembali di YP-MMS.
              </h2>

              <p className="mt-3 max-w-[380px] text-sm leading-6 text-blue-50">
                Akses informasi rapat, notulen, keputusan, dan tindak lanjut
                pekerjaan melalui satu sistem terintegrasi.
              </p>
            </div>

            {/* Mascot area */}
            <div className="relative flex flex-1 items-center justify-center py-5">
              <div className="relative h-[310px] w-full max-w-[400px]">
                {/* Halo */}
                <div className="yp-glow pointer-events-none absolute left-1/2 top-1/2 h-[290px] w-[290px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.38)_0%,rgba(125,211,252,0.28)_42%,rgba(56,189,248,0)_70%)]" />

                {/* Orbit */}
                <div className="pointer-events-none absolute left-1/2 top-1/2 h-[240px] w-[240px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/25" />
                <div className="pointer-events-none absolute left-1/2 top-1/2 h-[290px] w-[290px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-white/25" />

                {/* Orbit badges: alur Discuss, Decide, Execute */}
                <div
                  className="absolute z-10 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#ff7aa8] text-white shadow-lg shadow-blue-950/20 ring-4 ring-white/25"
                  style={{ left: 322, top: 42 }}
                  aria-hidden="true"
                >
                  <ListChecks className="h-4 w-4" />
                </div>
                <div
                  className="absolute z-10 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#8b7cf6] text-white shadow-lg shadow-blue-950/20 ring-4 ring-white/25"
                  style={{ left: 52, top: 150 }}
                  aria-hidden="true"
                >
                  <MessagesSquare className="h-4 w-4" />
                </div>
                <div
                  className="absolute z-10 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#ffca55] text-[#25314a] shadow-lg shadow-blue-950/20 ring-4 ring-white/25"
                  style={{ left: 336, top: 250 }}
                  aria-hidden="true"
                >
                  <Clock3 className="h-4 w-4" />
                </div>

                {/* Colored dots */}
                <span className="pointer-events-none absolute left-[24%] top-[30%] h-2 w-2 rounded-full bg-[#ffca55]/90" />
                <span className="pointer-events-none absolute right-[16%] top-[56%] h-1.5 w-1.5 rounded-full bg-emerald-300" />
                <span className="pointer-events-none absolute bottom-[22%] left-[30%] h-2 w-2 rounded-full bg-sky-200" />

                {/* Floor shadow */}
                <div className="pointer-events-none absolute bottom-[1%] left-1/2 h-4 w-40 -translate-x-1/2 rounded-full bg-[#00235f]/35 blur-md" />

                {/* Mascot (di-crop ke area yang terlihat) */}
                <div
                  className="absolute left-1/2 top-1/2 z-10 h-[270px] w-[134px] -translate-x-1/2 -translate-y-[52%] drop-shadow-[0_16px_24px_rgba(0,35,120,0.28)]"
                  role="img"
                  aria-label="Maskot YP-MMS"
                >
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
                    <p className="text-[10px] font-medium text-[#667797]">
                      Agenda
                    </p>
                    <p className="text-xs font-bold text-[#17264a]">
                      Jadwal rapat
                    </p>
                  </div>
                </div>

                {/* Minutes card */}
                <div className="yp-float-slow absolute right-0 top-[40%] z-20 flex items-center gap-2.5 rounded-xl bg-white/95 px-3 py-2.5 shadow-[0_14px_35px_rgba(0,35,100,0.22)]">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-white">
                    <ClipboardCheck className="h-[18px] w-[18px]" />
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-[#667797]">
                      Dokumentasi
                    </p>
                    <p className="text-xs font-bold text-[#17264a]">
                      Notulen rapat
                    </p>
                  </div>
                </div>

                {/* Team card */}
                <div className="yp-float absolute bottom-[4%] left-0 z-20 flex items-center gap-2.5 rounded-xl bg-white/95 px-3 py-2.5 shadow-[0_14px_35px_rgba(0,35,100,0.22)] [animation-delay:2s]">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0ea5e9] text-white">
                    <UsersRound className="h-[18px] w-[18px]" />
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-[#667797]">
                      Kolaborasi
                    </p>
                    <p className="text-xs font-bold text-[#17264a]">
                      Tim terhubung
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
            <div className="mb-8">
              <h1 className="text-3xl font-extrabold tracking-tight text-[#101b3a] sm:text-4xl">
                Masuk ke akun
              </h1>

              <p className="mt-3 text-sm leading-6 text-[#52658d]">
                Masukkan nama karyawan dan password Anda untuk mengakses sistem
                YP-MMS.
              </p>
            </div>

            {/* Status sesi (keluar, sesi berakhir, perlu login) */}
            {initialStatus && showStatus && (
              <div
                role="status"
                className={`mb-6 flex items-start gap-2.5 rounded-xl border p-3 text-sm ${
                  STATUS_STYLES[initialStatus.tone].box
                }`}
              >
                {React.createElement(STATUS_STYLES[initialStatus.tone].icon, {
                  className: "mt-0.5 h-4 w-4 shrink-0",
                  "aria-hidden": true,
                })}
                <p>{initialStatus.text}</p>
              </div>
            )}

            {/* Form */}
            <form
              onSubmit={handleLogin}
              className="space-y-5"
              noValidate
              aria-busy={isLoading}
            >
              {/* Username */}
              <div className="space-y-2">
                <label
                  htmlFor="employee-name"
                  className="text-sm font-semibold text-[#263653]"
                >
                  Nama karyawan
                </label>

                <div className="relative">
                  <UserRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <Input
                    id="employee-name"
                    ref={nameRef}
                    type="text"
                    value={form.name}
                    readOnly={isLoading}
                    autoFocus
                    onBlur={() => markTouched("name")}
                    onChange={(event) =>
                      updateField("name", event.target.value)
                    }
                    placeholder="Masukkan nama karyawan"
                    autoComplete="username"
                    spellCheck={false}
                    autoCapitalize="words"
                    maxLength={MAX_NAME_LENGTH}
                    aria-invalid={showNameError}
                    aria-describedby={
                      showNameError ? "employee-name-error" : undefined
                    }
                    className="h-12 rounded-xl border-[#d8e5f7] bg-[#fafcff] pl-10 text-sm transition placeholder:text-slate-400 focus-visible:border-[#0865ed] focus-visible:bg-white focus-visible:ring-[#0865ed]/20"
                  />
                </div>

                {showNameError && (
                  <p id="employee-name-error" className="text-xs text-red-500">
                    {nameErrorText}
                  </p>
                )}

                {filtered.name && (
                  <p className="text-xs text-[#9a5b08]">
                    Nama karyawan hanya boleh berisi huruf dan spasi.
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="employee-password"
                    className="text-sm font-semibold text-[#263653]"
                  >
                    Password
                  </label>

                  <Link
                    href="/forgot-password"
                    className="text-xs font-semibold text-[#0865ed] transition hover:text-[#0649b8] focus:outline-none focus-visible:underline"
                  >
                    Lupa password?
                  </Link>
                </div>

                <div className="relative">
                  <LockKeyhole className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <Input
                    id="employee-password"
                    ref={passwordRef}
                    type={showPassword ? "text" : "password"}
                    readOnly={isLoading}
                    onBlur={() => {
                      markTouched("password");
                      setCapsLock(false);
                    }}
                    onKeyDown={updateCapsLock}
                    onKeyUp={updateCapsLock}
                    autoComplete="current-password"
                    value={form.password}
                    onChange={(event) =>
                      updateField("password", event.target.value)
                    }
                    placeholder="Masukkan password"
                    spellCheck={false}
                    autoCapitalize="none"
                    autoCorrect="off"
                    maxLength={MAX_PASSWORD_LENGTH}
                    aria-invalid={showPasswordError}
                    aria-describedby={
                      [
                        showPasswordError ? "employee-password-error" : "",
                        capsLock ? "employee-password-caps" : "",
                      ]
                        .filter(Boolean)
                        .join(" ") || undefined
                    }
                    className="h-12 rounded-xl border-[#d8e5f7] bg-[#fafcff] pl-10 pr-11 text-sm transition placeholder:text-slate-400 focus-visible:border-[#0865ed] focus-visible:bg-white focus-visible:ring-[#0865ed]/20"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded text-slate-400 transition hover:text-[#0865ed] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0865ed]/40"
                    aria-label={
                      showPassword
                        ? "Sembunyikan password"
                        : "Tampilkan password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {capsLock && (
                  <p
                    id="employee-password-caps"
                    className="flex items-center gap-1.5 text-xs font-medium text-[#9a5b08]"
                  >
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Caps Lock sedang aktif.
                  </p>
                )}

                {showPasswordError && (
                  <p
                    id="employee-password-error"
                    className="text-xs text-red-500"
                  >
                    {passwordErrorText}
                  </p>
                )}

                {filtered.password && (
                  <p className="text-xs text-[#9a5b08]">
                    Password tidak boleh mengandung spasi atau karakter di luar
                    huruf, angka, dan simbol umum.
                  </p>
                )}
              </div>

              {/* Error */}
              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                >
                  {error}
                </div>
              )}

              {/* Submit */}
              <Button
                type="submit"
                disabled={isLoading}
                className="h-12 w-full gap-2 rounded-xl bg-gradient-to-r from-[#0860ed] to-[#0875f7] font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:shadow-blue-600/30 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    Masuk
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Footer */}
            <div className="mt-8 border-t border-[#e7edf7] pt-5 text-center">
              <p className="text-xs text-[#667797]">
                Akun dibuat dan dikelola oleh administrator. Belum punya akun
                atau akun bermasalah? Hubungi administrator.
              </p>

              <p className="mt-3 text-[11px] text-[#a6b2c7]">
                Connect · Discuss · Decide · Execute
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}