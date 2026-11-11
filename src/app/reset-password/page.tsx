"use client";

import * as React from "react";
import { Eye, EyeOff, Loader2, LockKeyhole, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { updatePasswordAction, type ResetState } from "./actions";

const initialState: ResetState = {};

export default function ResetPasswordPage() {
  const [state, formAction, pending] = React.useActionState(updatePasswordAction, initialState);
  const [show, setShow] = React.useState(false);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-blue-100 bg-white p-8 shadow-xl">
        <div className="mb-6">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <ShieldCheck className="h-7 w-7" />
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Buat Kata Sandi Baru</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Gunakan minimal 10 karakter dengan kombinasi huruf dan angka.
          </p>
        </div>

        <form action={formAction} className="space-y-5" noValidate>
          <div className="space-y-2">
            <label htmlFor="new-password" className="text-sm font-medium text-slate-700">
              Kata sandi baru
            </label>

            <div className="relative">
              <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="new-password"
                name="password"
                type={show ? "text" : "password"}
                autoComplete="new-password"
                minLength={10}
                maxLength={128}
                required
                aria-invalid={!!state.error}
                aria-describedby={state.error ? "reset-error" : undefined}
                className="h-11 pl-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShow((current) => !current)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label={show ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="confirm-password" className="text-sm font-medium text-slate-700">
              Ulangi kata sandi
            </label>

            <div className="relative">
              <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="confirm-password"
                name="confirm"
                type={show ? "text" : "password"}
                autoComplete="new-password"
                maxLength={128}
                required
                className="h-11 pl-10"
              />
            </div>
          </div>

          {state.error && (
            <div
              id="reset-error"
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {state.error}
            </div>
          )}

          <Button
            type="submit"
            disabled={pending}
            className="h-11 w-full gap-2 bg-blue-600 font-semibold text-white hover:bg-blue-700"
          >
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Menyimpan…
              </>
            ) : (
              "Simpan Kata Sandi"
            )}
          </Button>
        </form>
      </div>
    </main>
  );
}
