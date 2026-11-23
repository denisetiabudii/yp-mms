"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, CheckCircle2, KeyRound, Loader2, Plus, Trash2 } from "lucide-react";

import { useToast } from "@/components/feedback/toast-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { APP_ROLES, ROLE_LABELS, type AppRole } from "@/lib/auth/roles";
import {
  MAX_ASSIGNMENTS,
  normalizeEmail,
  validateInviteFields,
  type InviteField,
  type NodeOption,
} from "@/lib/users-db";

import { inviteUserAction } from "./actions";

const controlClass =
  "h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 aria-[invalid=true]:border-red-400 aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-red-400/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";
const primaryButton =
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-60";
const secondaryButton =
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-60";

type Row = { key: number; orgNodeId: string; positionId: string };
type Errors = Partial<Record<InviteField, string>>;

/** Urutan kolom di formulir (menentukan kolom yang difokuskan pertama) dan nama yang tampil di ringkasan. */
const FIELDS: { field: InviteField; id: string; label: string }[] = [
  { field: "fullName", id: "invite-name", label: "Nama lengkap" },
  { field: "email", id: "invite-email", label: "Email" },
  { field: "employeeNo", id: "invite-no", label: "NOID" },
  { field: "role", id: "invite-role", label: "Role" },
  { field: "items", id: "invite-unit-0", label: "Penugasan" },
];

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;

  return (
    <p id={id} role="alert" className="flex items-start gap-1.5 text-xs font-medium text-red-600">
      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
      <span>{message}</span>
    </p>
  );
}

export function InviteForm({
  nodes,
  positions,
  configured,
}: {
  nodes: NodeOption[];
  positions: { id: string; name: string }[];
  configured: boolean;
}) {
  const [pending, startTransition] = React.useTransition();
  const toast = useToast();
  const nextKey = React.useRef(2);

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [employeeNo, setEmployeeNo] = React.useState("");
  const [role, setRole] = React.useState<AppRole>("staff");
  const [rows, setRows] = React.useState<Row[]>([{ key: 1, orgNodeId: "", positionId: "" }]);
  const [errors, setErrors] = React.useState<Errors>({});
  const [sent, setSent] = React.useState<{ email: string; warning?: string } | null>(null);

  const errorList = FIELDS.filter(({ field }) => errors[field]);

  /** Tandai kolom bermasalah, lalu pindahkan fokus dan gulir ke kolom pertama yang salah. */
  function showErrors(next: Errors) {
    setErrors(next);

    const first = FIELDS.find(({ field }) => next[field]);

    if (first) {
      const element = document.getElementById(first.id);

      element?.focus();
      element?.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }

  function clear(field: InviteField) {
    setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));
  }

  function updateRow(key: number, patch: Partial<Row>) {
    setRows((current) => current.map((r) => (r.key === key ? { ...r, ...patch } : r)));
    clear("items");
  }

  function reset() {
    setName("");
    setEmail("");
    setEmployeeNo("");
    setRole("staff");
    setRows([{ key: nextKey.current++, orgNodeId: "", positionId: "" }]);
    setErrors({});
    setSent(null);
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pending) return;

    const input = {
      email,
      fullName: name,
      employeeNo,
      role,
      items: rows.filter((r) => r.orgNodeId && r.positionId).map((r) => ({ org_node_id: r.orgNodeId, position_id: r.positionId })),
    };

    const found = validateInviteFields(input);

    // Baris penugasan yang belum lengkap dilaporkan terpisah dari "tidak ada penugasan".
    if (rows.some((r) => !r.orgNodeId || !r.positionId) && !found.items) {
      found.items = "Lengkapi unit dan jabatan di setiap baris penugasan, atau hapus baris yang kosong.";
    }

    if (Object.keys(found).length > 0) return showErrors(found);

    setErrors({});

    startTransition(async () => {
      const result = await inviteUserAction(input);

      if (result.ok) return setSent({ email: normalizeEmail(email), warning: result.warning });

      // Kegagalan dari server: tandai kolomnya (bila diketahui) DAN tampilkan toast agar tidak terlewat.
      toast.error(`Undangan tidak dikirim. ${result.error}`);
      showErrors(result.field ? { [result.field]: result.error } : {});
    });
  }

  if (sent) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card className={sent.warning ? "border-amber-200 shadow-sm" : "border-emerald-200 shadow-sm"}>
          <CardContent className="space-y-4 p-8 text-center">
            <CheckCircle2 className={`mx-auto size-12 ${sent.warning ? "text-amber-500" : "text-emerald-600"}`} />
            <h1 className="text-xl font-bold">Undangan dikirim</h1>
            <p className="text-sm text-muted-foreground">
              Email undangan dikirim ke <strong>{sent.email}</strong>. Akun baru aktif setelah pengguna membuat kata sandi
              lewat tautan di email tersebut. Sampai saat itu statusnya <strong>Diundang</strong>.
            </p>
            {sent.warning && (
              <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-800">
                {sent.warning}
              </p>
            )}
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/users" className={primaryButton}>Ke daftar pengguna</Link>
              <button type="button" onClick={reset} className={secondaryButton}>Undang yang lain</button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
            Pengguna menerima email berisi tautan untuk membuat kata sandi sendiri. Semua kolom wajib diisi kecuali NOID.
          </p>
        </div>
      </div>

      {!configured && (
        <div role="alert" className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <KeyRound className="mt-0.5 size-4 shrink-0" />
          <span>
            Fitur undangan belum aktif karena kunci server Supabase belum diatur. Isi <span className="font-mono">SUPABASE_SECRET_KEY</span> di{" "}
            <span className="font-mono">.env.local</span> lalu mulai ulang server. Sementara itu, pengguna dapat diundang lewat
            Dashboard Supabase (Authentication → Users → Invite user).
          </span>
        </div>
      )}

      <form onSubmit={submit} noValidate className="space-y-6">
        <Card className="border-[#DBEAFE] shadow-sm">
          <CardHeader className="border-b bg-[#F8FAFC]">
            <CardTitle className="text-base">Data Pengguna</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 p-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="invite-name" className="text-sm font-medium text-slate-700">Nama lengkap <span className="text-red-500">*</span></label>
              <Input
                id="invite-name"
                value={name}
                onChange={(e) => { setName(e.target.value); clear("fullName"); }}
                maxLength={120}
                autoComplete="off"
                aria-invalid={!!errors.fullName}
                aria-describedby={errors.fullName ? "invite-name-error" : undefined}
              />
              <FieldError id="invite-name-error" message={errors.fullName} />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="invite-email" className="text-sm font-medium text-slate-700">Email <span className="text-red-500">*</span></label>
              <Input
                id="invite-email"
                type="email"
                inputMode="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); clear("email"); }}
                maxLength={254}
                autoCapitalize="none"
                autoComplete="off"
                spellCheck={false}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "invite-email-error" : undefined}
              />
              {errors.email ? (
                <FieldError id="invite-email-error" message={errors.email} />
              ) : (
                <p className="text-xs text-muted-foreground">Harus email aktif milik pengguna.</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="invite-no" className="text-sm font-medium text-slate-700">NOID karyawan</label>
              <Input
                id="invite-no"
                value={employeeNo}
                onChange={(e) => { setEmployeeNo(e.target.value); clear("employeeNo"); }}
                maxLength={30}
                autoComplete="off"
                aria-invalid={!!errors.employeeNo}
                aria-describedby={errors.employeeNo ? "invite-no-error" : undefined}
              />
              {errors.employeeNo ? (
                <FieldError id="invite-no-error" message={errors.employeeNo} />
              ) : (
                <p className="text-xs text-muted-foreground">Opsional. Hanya data, bukan kata sandi.</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="invite-role" className="text-sm font-medium text-slate-700">Role aplikasi <span className="text-red-500">*</span></label>
              <select
                id="invite-role"
                value={role}
                onChange={(e) => { setRole(e.target.value as AppRole); clear("role"); }}
                className={controlClass}
                aria-invalid={!!errors.role}
                aria-describedby={errors.role ? "invite-role-error" : undefined}
              >
                {APP_ROLES.map((r) => (<option key={r} value={r}>{ROLE_LABELS[r]}</option>))}
              </select>
              {errors.role ? (
                <FieldError id="invite-role-error" message={errors.role} />
              ) : (
                <p className="text-xs text-muted-foreground">
                  {role === "super_admin" ? "Super Admin memiliki akses penuh ke seluruh sistem. Berikan seperlunya." : "Menentukan hak akses di aplikasi (bukan jabatan)."}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className={`shadow-sm ${errors.items ? "border-red-300" : "border-[#DBEAFE]"}`}>
          <CardHeader className="border-b bg-[#F8FAFC]">
            <CardTitle className="text-base">Penugasan <span className="text-red-500">*</span></CardTitle>
            <p className="text-xs text-muted-foreground">Satu pengguna dapat bertugas di beberapa unit atau departemen.</p>
          </CardHeader>
          <CardContent className="space-y-4 p-5">
            {rows.map((row, index) => (
              <div key={row.key} className="grid gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-[1fr_14rem_2.25rem] sm:items-center">
                <select
                  id={`invite-unit-${index}`}
                  aria-label={`Unit penugasan ${index + 1}`}
                  value={row.orgNodeId}
                  onChange={(e) => updateRow(row.key, { orgNodeId: e.target.value })}
                  className={controlClass}
                  aria-invalid={!!errors.items && !row.orgNodeId}
                  aria-describedby={errors.items && index === 0 ? "invite-items-error" : undefined}
                >
                  <option value="">Pilih unit / departemen…</option>
                  {nodes.map((n) => (<option key={n.id} value={n.id}>{n.label}</option>))}
                </select>

                <select
                  aria-label={`Jabatan penugasan ${index + 1}`}
                  value={row.positionId}
                  onChange={(e) => updateRow(row.key, { positionId: e.target.value })}
                  className={controlClass}
                  aria-invalid={!!errors.items && !row.positionId}
                >
                  <option value="">Pilih jabatan…</option>
                  {positions.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
                </select>

                <button
                  type="button"
                  onClick={() => setRows((current) => (current.length === 1 ? current : current.filter((r) => r.key !== row.key)))}
                  disabled={rows.length === 1}
                  aria-label={`Hapus penugasan ${index + 1}`}
                  className="inline-flex size-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}

            <FieldError id="invite-items-error" message={errors.items} />

            <button
              type="button"
              onClick={() => setRows((current) => [...current, { key: nextKey.current++, orgNodeId: "", positionId: "" }])}
              disabled={rows.length >= MAX_ASSIGNMENTS}
              className={secondaryButton}
            >
              <Plus className="size-4" />
              Tambah penugasan
            </button>
          </CardContent>
        </Card>

        {/* Ringkasan kesalahan tepat di atas tombol kirim, agar terlihat tanpa menggulir ke atas */}
        {errorList.length > 0 && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <p className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="size-4" />
              Undangan belum dapat dikirim — {errorList.length} isian perlu diperbaiki:
            </p>
            <ul className="mt-1.5 list-disc space-y-0.5 pl-9 text-xs">
              {errorList.map(({ field, id, label }) => (
                <li key={field}>
                  <button
                    type="button"
                    onClick={() => {
                      const element = document.getElementById(id);

                      element?.focus();
                      element?.scrollIntoView({ block: "center", behavior: "smooth" });
                    }}
                    className="text-left underline decoration-red-300 underline-offset-2 hover:decoration-red-600"
                  >
                    <strong>{label}:</strong> {errors[field]}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link href="/users" className={secondaryButton}>Batal</Link>
          <button type="submit" disabled={pending || !configured} className={primaryButton}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            {pending ? "Mengirim…" : "Kirim Undangan"}
          </button>
        </div>
      </form>
    </div>
  );
}
