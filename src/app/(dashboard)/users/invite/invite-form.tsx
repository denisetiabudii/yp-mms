"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, KeyRound, Loader2, Plus, Trash2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { APP_ROLES, ROLE_LABELS, type AppRole } from "@/lib/auth/roles";
import { MAX_ASSIGNMENTS, normalizeEmail, validateInvite, type NodeOption } from "@/lib/users-db";

import { inviteUserAction } from "./actions";

const controlClass =
  "h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 aria-[invalid=true]:border-red-400 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";
const primaryButton =
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-60";
const secondaryButton =
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-60";

type Row = { key: number; orgNodeId: string; positionId: string };

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
  const nextKey = React.useRef(2);

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [employeeNo, setEmployeeNo] = React.useState("");
  const [role, setRole] = React.useState<AppRole>("staff");
  const [rows, setRows] = React.useState<Row[]>([{ key: 1, orgNodeId: "", positionId: "" }]);
  const [error, setError] = React.useState("");
  const [sent, setSent] = React.useState<{ email: string; warning?: string } | null>(null);

  function updateRow(key: number, patch: Partial<Row>) {
    setRows((current) => current.map((r) => (r.key === key ? { ...r, ...patch } : r)));
    setError("");
  }

  function reset() {
    setName("");
    setEmail("");
    setEmployeeNo("");
    setRole("staff");
    setRows([{ key: nextKey.current++, orgNodeId: "", positionId: "" }]);
    setError("");
    setSent(null);
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pending) return;

    if (rows.some((r) => !r.orgNodeId || !r.positionId)) {
      return setError("Setiap penugasan wajib memiliki unit dan jabatan.");
    }

    const input = {
      email,
      fullName: name,
      employeeNo,
      role,
      items: rows.map((r) => ({ org_node_id: r.orgNodeId, position_id: r.positionId })),
    };
    const problem = validateInvite(input);

    if (problem) return setError(problem);

    startTransition(async () => {
      const result = await inviteUserAction(input);

      if (result.ok) setSent({ email: normalizeEmail(email), warning: result.warning });
      else setError(result.error);
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
              Email undangan dikirim ke <strong>{sent.email}</strong>. Pengguna membuat kata sandi sendiri lewat tautan di email
              tersebut. Tautan berlaku singkat.
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
        {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <Card className="border-[#DBEAFE] shadow-sm">
          <CardHeader className="border-b bg-[#F8FAFC]">
            <CardTitle className="text-base">Data Pengguna</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 p-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="invite-name" className="text-sm font-medium text-slate-700">Nama lengkap <span className="text-red-500">*</span></label>
              <Input id="invite-name" value={name} onChange={(e) => { setName(e.target.value); setError(""); }} maxLength={120} autoComplete="off" />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="invite-email" className="text-sm font-medium text-slate-700">Email <span className="text-red-500">*</span></label>
              <Input
                id="invite-email"
                type="email"
                inputMode="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                maxLength={254}
                autoCapitalize="none"
                autoComplete="off"
                spellCheck={false}
              />
              <p className="text-xs text-muted-foreground">Harus email aktif milik pengguna.</p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="invite-no" className="text-sm font-medium text-slate-700">NOID karyawan</label>
              <Input id="invite-no" value={employeeNo} onChange={(e) => { setEmployeeNo(e.target.value); setError(""); }} maxLength={30} autoComplete="off" />
              <p className="text-xs text-muted-foreground">Opsional. Hanya data, bukan kata sandi.</p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="invite-role" className="text-sm font-medium text-slate-700">Role aplikasi <span className="text-red-500">*</span></label>
              <select id="invite-role" value={role} onChange={(e) => setRole(e.target.value as AppRole)} className={controlClass}>
                {APP_ROLES.map((r) => (<option key={r} value={r}>{ROLE_LABELS[r]}</option>))}
              </select>
              <p className="text-xs text-muted-foreground">
                {role === "super_admin" ? "Super Admin memiliki akses penuh ke seluruh sistem. Berikan seperlunya." : "Menentukan hak akses di aplikasi (bukan jabatan)."}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#DBEAFE] shadow-sm">
          <CardHeader className="border-b bg-[#F8FAFC]">
            <CardTitle className="text-base">Penugasan <span className="text-red-500">*</span></CardTitle>
            <p className="text-xs text-muted-foreground">Satu pengguna dapat bertugas di beberapa unit atau departemen.</p>
          </CardHeader>
          <CardContent className="space-y-4 p-5">
            {rows.map((row, index) => (
              <div key={row.key} className="grid gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-[1fr_14rem_2.25rem] sm:items-center">
                <select
                  aria-label={`Unit penugasan ${index + 1}`}
                  value={row.orgNodeId}
                  onChange={(e) => updateRow(row.key, { orgNodeId: e.target.value })}
                  className={controlClass}
                >
                  <option value="">Pilih unit / departemen…</option>
                  {nodes.map((n) => (<option key={n.id} value={n.id}>{n.label}</option>))}
                </select>

                <select
                  aria-label={`Jabatan penugasan ${index + 1}`}
                  value={row.positionId}
                  onChange={(e) => updateRow(row.key, { positionId: e.target.value })}
                  className={controlClass}
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
