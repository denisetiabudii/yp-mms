"use client";

import * as React from "react";
import Link from "next/link";
import {
  Mail,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("");
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState(false);

  // Validasi format email universal.
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Simulasi pengajuan reset password.
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess(false);

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError("Email wajib diisi.");
      return;
    }

    if (!emailRegex.test(trimmedEmail)) {
      setError("Format email tidak valid.");
      return;
    }

    // Simulasi sukses, belum mengirim email sebenarnya.
    setSuccess(true);
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* Panel branding */}
        <section className="relative hidden overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-sky-500 p-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-white/10" />
          <div className="absolute -bottom-40 -left-20 h-96 w-96 rounded-full bg-white/10" />

          <div className="relative z-10">
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
                <ShieldCheck className="h-7 w-7" />
              </div>

              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  YP-MMS
                </h1>
                <p className="text-sm text-blue-100">
                  Meeting Management System
                </p>
              </div>
            </div>

            <h2 className="max-w-lg text-4xl font-bold leading-tight">
              Pulihkan akses akun Anda dengan mudah.
            </h2>

            <p className="mt-5 max-w-md text-base leading-relaxed text-blue-100">
              Kami membantu Anda mendapatkan kembali akses
              ke sistem pengelolaan rapat dengan aman.
            </p>
          </div>

          <div className="relative z-10 text-sm text-blue-100">
            © {new Date().getFullYear()} YP-MMS. All rights reserved.
          </div>
        </section>

        {/* Form lupa password */}
        <section className="flex items-center justify-center px-6 py-12 sm:px-10">
          <div className="w-full max-w-md">
            <Link
              href="/login"
              className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-blue-600"
            >
              <ArrowLeft className="h-4 w-4" />
              Kembali ke Login
            </Link>

            <div className="mb-8">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <Mail className="h-7 w-7" />
              </div>

              <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                Lupa Password?
              </h2>

              <p className="mt-3 text-sm leading-relaxed text-slate-500">
                Masukkan email yang terdaftar pada akun Anda.
                Instruksi pemulihan password akan dikirim
                melalui email setelah fitur ini terhubung
                dengan backend.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="text-sm font-medium text-slate-700"
                >
                  Email
                </label>

                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="nama@gmail.com"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setError("");
                    setSuccess(false);
                  }}
                  required
                  className="h-12 rounded-xl"
                />
              </div>

              {/* Pesan validasi */}
              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
                >
                  {error}
                </div>
              )}

              {/* Pesan sukses simulasi */}
              {success && (
                <div
                  role="status"
                  className="flex gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
                >
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

                  <div>
                    <p className="font-semibold">
                      Permintaan berhasil disimulasikan.
                    </p>

                    <p className="mt-1 leading-relaxed">
                      Email pemulihan belum benar-benar dikirim.
                      Fitur ini akan aktif setelah backend
                      terintegrasi.
                    </p>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="h-12 w-full rounded-xl bg-blue-600 text-sm font-semibold hover:bg-blue-700"
              >
                Kirim Instruksi
              </Button>
            </form>

            <p className="mt-8 text-center text-sm text-slate-500">
              Ingat password Anda?{" "}
              <Link
                href="/login"
                className="font-semibold text-blue-600 hover:text-blue-700"
              >
                Masuk sekarang
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}