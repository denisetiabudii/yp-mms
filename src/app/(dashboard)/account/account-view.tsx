"use client";

import * as React from "react";
import { Eye, EyeOff, Loader2, LogOut, Mail, ShieldCheck, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PASSWORD_MIN } from "@/lib/auth/password";

import {
  changePasswordAction,
  signOutOthersAction,
  updateProfileAction,
  type FormState,
} from "./actions";

const primaryButton =
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-60";
const secondaryButton =
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-60";

const initial: FormState = {};

function Feedback({ state, id }: { state: FormState; id: string }) {
  if (state.error) {
    return (
      <div id={id} role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        {state.error}
      </div>
    );
  }

  if (state.success) {
    return (
      <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
        {state.success}
      </div>
    );
  }

  return null;
}

export function AccountView({
  fullName,
  email,
  roleLabel,
}: {
  fullName: string;
  email: string;
  roleLabel: string;
}) {
  const [profileState, profileAction, profilePending] = React.useActionState(updateProfileAction, initial);
  const [passwordState, passwordAction, passwordPending] = React.useActionState(changePasswordAction, initial);
  const [sessionState, sessionAction, sessionPending] = React.useActionState(signOutOthersAction, initial);
  const [showPasswords, setShowPasswords] = React.useState(false);

  const inputType = showPasswords ? "text" : "password";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Akun Saya</h1>
        <p className="text-sm text-muted-foreground">Kelola profil dan keamanan akun Anda.</p>
      </div>

      {/* PROFIL */}
      <Card className="border-[#DBEAFE] shadow-sm">
        <CardHeader className="border-b bg-[#F8FAFC]">
          <CardTitle className="flex items-center gap-2 text-base">
            <UserRound className="size-4 text-blue-600" />
            Profil
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <form action={profileAction} noValidate className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="fullName" className="text-sm font-medium text-slate-700">Nama lengkap</label>
              <Input
                id="fullName"
                name="fullName"
                defaultValue={fullName}
                maxLength={120}
                autoComplete="name"
                required
                aria-invalid={!!profileState.error}
                aria-describedby={profileState.error ? "profile-feedback" : undefined}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-slate-700">Email</p>
                <p className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-600">
                  <Mail className="size-4 text-slate-400" />
                  <span className="truncate">{email || "—"}</span>
                </p>
                <p className="text-xs text-muted-foreground">Email diubah oleh administrator.</p>
              </div>

              <div className="space-y-1.5">
                <p className="text-sm font-medium text-slate-700">Role</p>
                <p className="flex h-9 items-center">
                  <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">{roleLabel}</Badge>
                </p>
                <p className="text-xs text-muted-foreground">Role diatur oleh administrator.</p>
              </div>
            </div>

            <Feedback state={profileState} id="profile-feedback" />

            <div className="flex justify-end">
              <button type="submit" disabled={profilePending} className={primaryButton}>
                {profilePending && <Loader2 className="size-4 animate-spin" />}
                Simpan profil
              </button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* KATA SANDI */}
      <Card className="border-[#DBEAFE] shadow-sm">
        <CardHeader className="border-b bg-[#F8FAFC]">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="size-4 text-blue-600" />
            Ganti Kata Sandi
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <form action={passwordAction} noValidate className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="current" className="text-sm font-medium text-slate-700">Kata sandi saat ini</label>
              <Input id="current" name="current" type={inputType} autoComplete="current-password" maxLength={128} required />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="new-password" className="text-sm font-medium text-slate-700">Kata sandi baru</label>
                <Input
                  id="new-password"
                  name="password"
                  type={inputType}
                  autoComplete="new-password"
                  minLength={PASSWORD_MIN}
                  maxLength={128}
                  required
                  aria-describedby="password-rules"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="confirm" className="text-sm font-medium text-slate-700">Ulangi kata sandi baru</label>
                <Input id="confirm" name="confirm" type={inputType} autoComplete="new-password" maxLength={128} required />
              </div>
            </div>

            <p id="password-rules" className="text-xs text-muted-foreground">
              Minimal {PASSWORD_MIN} karakter dengan kombinasi huruf dan angka. Setelah diganti, sesi di perangkat
              lain akan diakhiri.
            </p>

            <button
              type="button"
              onClick={() => setShowPasswords((current) => !current)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700"
            >
              {showPasswords ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              {showPasswords ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
            </button>

            <Feedback state={passwordState} id="password-feedback" />

            <div className="flex justify-end">
              <button type="submit" disabled={passwordPending} className={primaryButton}>
                {passwordPending && <Loader2 className="size-4 animate-spin" />}
                Ganti kata sandi
              </button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* SESI */}
      <Card className="border-[#DBEAFE] shadow-sm">
        <CardHeader className="border-b bg-[#F8FAFC]">
          <CardTitle className="flex items-center gap-2 text-base">
            <LogOut className="size-4 text-blue-600" />
            Sesi Login
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-5">
          <p className="text-sm text-slate-600">
            Jika Anda masuk di perangkat lain (atau perangkat hilang), akhiri semua sesi di perangkat tersebut.
            Sesi di perangkat ini tetap aktif.
          </p>

          <Feedback state={sessionState} id="session-feedback" />

          <form action={sessionAction}>
            <button type="submit" disabled={sessionPending} className={secondaryButton}>
              {sessionPending && <Loader2 className="size-4 animate-spin" />}
              Keluar dari perangkat lain
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
