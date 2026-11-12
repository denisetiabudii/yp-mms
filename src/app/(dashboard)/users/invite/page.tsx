"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Plus, Trash2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { APP_ROLES, ROLE_LABELS, type AppRole } from "@/lib/auth/roles";
import { DEPARTMENTS, UNITS } from "@/lib/meetings";
import { INITIAL_POSITIONS } from "@/lib/organization";
import { GROUP_ID, USERS } from "@/lib/users";

const controlClass =
  "h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 aria-[invalid=true]:border-red-400 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";
const primaryButton =
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40";
const secondaryButton =
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type AssignmentDraft = { key: number; unitId: string; departmentId: string; position: string };
type FormErrors = Partial<Record<"name" | "email" | "assignment", string>>;

function Field({
  id, label, required, error, hint, children,
}: {
  id: string; label: string; required?: boolean; error?: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p id={`${id}-error`} role="alert" className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

export default function InviteUserPage() {
  const nextKey = React.useRef(2);

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [employeeNo, setEmployeeNo] = React.useState("");
  const [role, setRole] = React.useState<AppRole>("staff");
  const [assignments, setAssignments] = React.useState<AssignmentDraft[]>([
    { key: 1, unitId: "", departmentId: "", position: "" },
  ]);
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [sentTo, setSentTo] = React.useState<string | null>(null);

  function updateAssignment(key: number, patch: Partial<AssignmentDraft>) {
    setAssignments((current) => current.map((a) => (a.key === key ? { ...a, ...patch } : a)));
    setErrors((current) => ({ ...current, assignment: undefined }));
  }

  function addAssignment() {
    setAssignments((current) => [...current, { key: nextKey.current++, unitId: "", departmentId: "", position: "" }]);
  }

  function removeAssignment(key: number) {
    setAssignments((current) => (current.length === 1 ? current : current.filter((a) => a.key !== key)));
  }

  function validate(): FormErrors {
    const next: FormErrors = {};
    const mail = email.trim().toLowerCase();

    if (!name.trim()) next.name = "Nama lengkap wajib diisi.";

    if (!mail) next.email = "Email wajib diisi.";
    else if (mail.length > 254 || !EMAIL_PATTERN.test(mail)) next.email = "Format email tidak valid.";
    else if (USERS.some((u) => u.email.toLowerCase() === mail)) next.email = "Email ini sudah terdaftar.";

    if (assignments.some((a) => !a.unitId || !a.position)) {
      next.assignment = "Setiap penugasan wajib memiliki unit dan jabatan.";
    } else {
      const seen = new Set(assignments.map((a) => `${a.unitId}|${a.departmentId}|${a.position}`));
      if (seen.size !== assignments.length) next.assignment = "Ada penugasan yang sama lebih dari satu kali.";
    }

    return next;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const result = validate();
    setErrors(result);

    if (Object.keys(result).length > 0) {
      const firstId = { name: "field-name", email: "field-email", assignment: "field-unit-0" }[
        Object.keys(result)[0] as keyof FormErrors
      ];
      document.getElementById(firstId)?.focus();
      return;
    }

    // TODO: Server Action memakai secret key Supabase (auth.admin.inviteUserByEmail),
    // lalu set role & penugasan di tabel server. Role TIDAK boleh dikirim lewat metadata
    // yang dikontrol pengguna; tetapkan di server setelah akun dibuat.
    setSentTo(email.trim().toLowerCase());
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (sentTo) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="border-emerald-200 shadow-sm">
          <CardContent className="space-y-4 p-8 text-center">
            <CheckCircle2 className="mx-auto size-12 text-emerald-600" />
            <h1 className="text-xl font-bold">Data undangan lolos validasi</h1>
            <p className="text-sm text-muted-foreground">
              Undangan untuk <strong>{sentTo}</strong> belum benar-benar terkirim karena fitur ini belum
              tersambung ke backend.
            </p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/users" className={primaryButton}>Kembali ke daftar pengguna</Link>
              <button type="button" onClick={() => setSentTo(null)} className={secondaryButton}>Ubah lagi</button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const errorCount = Object.keys(errors).length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-3">
        <Link href="/users" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-700">
          <ArrowLeft className="size-4" />
          Kembali ke daftar pengguna
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Undang Pengguna</h1>
          <p className="text-sm text-muted-foreground">
            Pengguna menerima email berisi tautan untuk membuat kata sandi sendiri. Kolom bertanda{" "}
            <span className="text-red-500">*</span> wajib diisi.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {errorCount > 0 && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Terdapat {errorCount} isian yang perlu diperbaiki.
          </div>
        )}

        <Card className="border-[#DBEAFE] shadow-sm">
          <CardHeader className="border-b bg-[#F8FAFC]">
            <CardTitle className="text-base">Data Pengguna</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 p-5 sm:grid-cols-2">
            <Field id="field-name" label="Nama lengkap" required error={errors.name}>
              <Input
                id="field-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? "field-name-error" : undefined}
                maxLength={120}
              />
            </Field>

            <Field id="field-email" label="Email" required error={errors.email} hint="Harus email aktif milik pengguna.">
              <Input
                id="field-email"
                type="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "field-email-error" : undefined}
                autoCapitalize="none"
                spellCheck={false}
                maxLength={254}
              />
            </Field>

            <Field id="field-employeeNo" label="NOID karyawan" hint="Opsional. Hanya sebagai data, bukan kata sandi.">
              <Input id="field-employeeNo" value={employeeNo} onChange={(e) => setEmployeeNo(e.target.value)} maxLength={30} />
            </Field>

            <Field
              id="field-role"
              label="Role aplikasi"
              required
              hint={role === "super_admin" ? "Super Admin memiliki akses penuh ke seluruh sistem. Berikan seperlunya." : "Menentukan hak akses di aplikasi (bukan jabatan)."}
            >
              <select id="field-role" value={role} onChange={(e) => setRole(e.target.value as AppRole)} className={controlClass}>
                {APP_ROLES.map((r) => (<option key={r} value={r}>{ROLE_LABELS[r]}</option>))}
              </select>
            </Field>
          </CardContent>
        </Card>

        <Card className="border-[#DBEAFE] shadow-sm">
          <CardHeader className="border-b bg-[#F8FAFC]">
            <CardTitle className="text-base">Penugasan <span className="text-red-500">*</span></CardTitle>
            <p className="text-xs text-muted-foreground">
              Satu pengguna dapat bertugas di beberapa unit atau departemen.
            </p>
          </CardHeader>
          <CardContent className="space-y-4 p-5">
            {assignments.map((a, index) => {
              const departments = DEPARTMENTS.filter((d) => d.unitId === a.unitId);

              return (
                <div key={a.key} className="grid gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-[1fr_1fr_1fr_2.25rem] sm:items-center">
                  <select
                    id={`field-unit-${index}`}
                    aria-label={`Unit penugasan ${index + 1}`}
                    value={a.unitId}
                    onChange={(e) => updateAssignment(a.key, { unitId: e.target.value, departmentId: "" })}
                    aria-invalid={!!errors.assignment && !a.unitId}
                    className={controlClass}
                  >
                    <option value="">Pilih unit…</option>
                    <option value={GROUP_ID}>Yuk Peduli Grup</option>
                    {UNITS.map((u) => (<option key={u.id} value={u.id}>{u.name}</option>))}
                  </select>

                  <select
                    aria-label={`Departemen penugasan ${index + 1}`}
                    value={a.departmentId}
                    onChange={(e) => updateAssignment(a.key, { departmentId: e.target.value })}
                    disabled={departments.length === 0}
                    className={controlClass}
                  >
                    <option value="">{departments.length === 0 ? "Tanpa departemen" : "Seluruh unit"}</option>
                    {departments.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
                  </select>

                  <select
                    aria-label={`Jabatan penugasan ${index + 1}`}
                    value={a.position}
                    onChange={(e) => updateAssignment(a.key, { position: e.target.value })}
                    aria-invalid={!!errors.assignment && !a.position}
                    className={controlClass}
                  >
                    <option value="">Pilih jabatan…</option>
                    {INITIAL_POSITIONS.map((p) => (<option key={p} value={p}>{p}</option>))}
                  </select>

                  <button
                    type="button"
                    onClick={() => removeAssignment(a.key)}
                    disabled={assignments.length === 1}
                    aria-label={`Hapus penugasan ${index + 1}`}
                    className="inline-flex size-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              );
            })}

            {errors.assignment && <p role="alert" className="text-xs text-red-600">{errors.assignment}</p>}

            <button type="button" onClick={addAssignment} className={secondaryButton}>
              <Plus className="size-4" />
              Tambah penugasan
            </button>
          </CardContent>
        </Card>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link href="/users" className={secondaryButton}>Batal</Link>
          <button type="submit" className={primaryButton}>Kirim Undangan</button>
        </div>
      </form>
    </div>
  );
}
