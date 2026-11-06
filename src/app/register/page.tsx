"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  UserRound,
  IdCard,
  Mail,
  LockKeyhole,
  Eye,
  EyeOff,
  Building2,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    React.useState(false);

  const [form, setForm] = React.useState({
    name: "",
    noid: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = React.useState("");

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setError("");
  }

  function handleRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      !form.name.trim() ||
      !form.noid.trim() ||
      !form.email.trim() ||
      !form.password ||
      !form.confirmPassword
    ) {
      setError("Harap lengkapi seluruh data registrasi.");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(form.email.trim())) {
      setError(
        "Format email tidak valid. Harap masukkan email yang benar."
      );
      return;
    }

    // Validate password length
    if (form.password.length < 8) {
      setError("Password minimal terdiri dari 8 karakter.");
      return;
    }

    // Validate password confirmation
    if (form.password !== form.confirmPassword) {
      setError("Konfirmasi password tidak sesuai.");
      return;
    }

    setError(
      "Validasi UI berhasil. Registrasi belum terhubung ke backend."
    );
    router.push("/login");
  }

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
                <h1 className="text-xl font-bold tracking-wide">
                  YP-MMS
                </h1>

                <p className="text-xs text-blue-100">
                  Yuk Peduli Meeting Management System
                </p>
              </div>
            </div>

            <div className="mt-20">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-100">
                Employee Registration
              </p>

              <h2 className="mt-4 text-4xl font-bold leading-tight">
                Bergabung
                <br />
                dengan sistem
                <br />
                manajemen rapat.
              </h2>

              <p className="mt-5 max-w-sm text-sm leading-6 text-blue-100">
                Buat akun karyawan untuk mengakses informasi rapat,
                notulen, keputusan, dan tindak lanjut secara terpusat.
              </p>
            </div>
          </div>

          <div className="relative z-10 flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
              <ShieldCheck className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm font-semibold">
                Akses Karyawan
              </p>

              <p className="text-xs text-blue-100">
                Sistem internal Yuk Peduli
              </p>
            </div>
          </div>
        </section>

        {/* Registration Form */}
        <section className="p-6 sm:p-10">
          <div className="mx-auto max-w-md">
            {/* Mobile Branding */}
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white">
                <Building2 className="h-6 w-6" />
              </div>

              <div>
                <h1 className="font-bold text-slate-800">
                  YP-MMS
                </h1>

                <p className="text-xs text-slate-500">
                  Yuk Peduli Meeting Management System
                </p>
              </div>
            </div>

            <div className="mb-7">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                <UserRound className="h-3.5 w-3.5" />
                Registrasi Karyawan
              </div>

              <h2 className="text-2xl font-bold tracking-tight text-slate-800">
                Buat Akun Baru
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Lengkapi data diri Anda untuk membuat akun YP-MMS.
              </p>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              {/* Employee Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Nama Lengkap Karyawan
                </label>

                <div className="relative">
                  <UserRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <Input
                    value={form.name}
                    onChange={(event) =>
                      updateField("name", event.target.value)
                    }
                    placeholder="Masukkan nama lengkap"
                    autoComplete="name"
                    required
                    className="h-11 border-slate-200 pl-10 focus-visible:ring-blue-500"
                  />
                </div>
              </div>

              {/* Employee ID */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Nomor Identitas Karyawan (NOID)
                </label>

                <div className="relative">
                  <IdCard className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <Input
                    value={form.noid}
                    onChange={(event) =>
                      updateField("noid", event.target.value)
                    }
                    placeholder="Masukkan NOID karyawan"
                    autoComplete="off"
                    required
                    className="h-11 border-slate-200 pl-10 focus-visible:ring-blue-500"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Email
                </label>

                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <Input
                    type="email"
                    required
                    value={form.email}
                    onChange={(event) =>
                      updateField("email", event.target.value)
                    }
                    placeholder="nama@yukpeduli.or.id"
                    autoComplete="email"
                    className="h-11 border-slate-200 pl-10 focus-visible:ring-blue-500"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Password
                </label>

                <div className="relative">
                  <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <Input
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    value={form.password}
                    onChange={(event) =>
                      updateField("password", event.target.value)
                    }
                    placeholder="Minimal 8 karakter"
                    className="h-11 border-slate-200 pl-10 pr-10 focus-visible:ring-blue-500"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword((current) => !current)
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
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
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Konfirmasi Password
                </label>

                <div className="relative">
                  <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    value={form.confirmPassword}
                    onChange={(event) =>
                      updateField(
                        "confirmPassword",
                        event.target.value
                      )
                    }
                    placeholder="Ulangi password"
                    className="h-11 border-slate-200 pl-10 pr-10 focus-visible:ring-blue-500"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(
                        (current) => !current
                      )
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label={
                      showConfirmPassword
                        ? "Sembunyikan konfirmasi password"
                        : "Tampilkan konfirmasi password"
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Error / Validation Message */}
              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-700"
                >
                  {error}
                </div>
              )}

              {/* Submit */}
              <Button
                type="submit"
                className="mt-2 h-11 w-full gap-2 bg-blue-600 font-semibold text-white hover:bg-blue-700"
              >
                Daftar Akun
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>

            {/* Login Link */}
            <div className="mt-6 text-center text-sm text-slate-500">
              Sudah memiliki akun?{" "}
              <Link
                href="/login"
                className="font-semibold text-blue-600 hover:text-blue-700"
              >
                Masuk
              </Link>
            </div>

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