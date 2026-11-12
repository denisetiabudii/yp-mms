"use client";

import * as React from "react";
import Link from "next/link";
import { MailPlus, Search, ShieldCheck, UserCheck, UserX, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { APP_ROLES, ROLE_LABELS, type AppRole } from "@/lib/auth/roles";
import { UNITS } from "@/lib/meetings";
import { formatDateTime } from "@/lib/minutes";
import {
  GROUP_ID,
  USERS,
  USER_STATUSES,
  departmentLabel,
  unitLabel,
  type UserRecord,
  type UserStatus,
} from "@/lib/users";

const selectClass =
  "h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

const statusStyles: Record<UserStatus, string> = {
  Aktif: "border-emerald-200 bg-emerald-100 text-emerald-700",
  Diundang: "border-amber-200 bg-amber-100 text-amber-700",
  Nonaktif: "border-slate-200 bg-slate-100 text-slate-600",
};

type Notice = { tone: "success" | "error"; text: string };

export default function UsersPage() {
  const [users, setUsers] = React.useState<UserRecord[]>(USERS);
  const [search, setSearch] = React.useState("");
  const [role, setRole] = React.useState("all");
  const [unit, setUnit] = React.useState("all");
  const [status, setStatus] = React.useState("all");
  const [confirmId, setConfirmId] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<Notice | null>(null);

  const keyword = search.trim().toLowerCase();

  const filtered = users.filter((user) => {
    const haystack = [user.name, user.email, user.employeeNo ?? ""].join(" ").toLowerCase();

    return (
      (!keyword || haystack.includes(keyword)) &&
      (role === "all" || user.role === role) &&
      (unit === "all" || user.assignments.some((a) => a.unitId === unit)) &&
      (status === "all" || user.status === status)
    );
  });

  const count = (s: UserStatus) => users.filter((user) => user.status === s).length;

  /** Aturan: harus selalu ada minimal satu Super Admin aktif. */
  function isLastSuperAdmin(user: UserRecord) {
    return (
      user.role === "super_admin" &&
      user.status === "Aktif" &&
      users.filter((u) => u.role === "super_admin" && u.status === "Aktif").length === 1
    );
  }

  function changeRole(user: UserRecord, next: AppRole) {
    if (next === user.role) return;

    if (user.role === "super_admin" && isLastSuperAdmin(user)) {
      setNotice({ tone: "error", text: "Minimal harus ada satu Super Admin aktif. Role tidak diubah." });
      return;
    }

    // TODO: Server Action — validasi hak akses di server dan catat ke audit_logs.
    setUsers((current) => current.map((u) => (u.id === user.id ? { ...u, role: next } : u)));
    setNotice({
      tone: "success",
      text: `Role ${user.name} diubah menjadi ${ROLE_LABELS[next]}. Perubahan akan tercatat di Audit Log.`,
    });
  }

  function setUserStatus(user: UserRecord, next: UserStatus) {
    if (next === "Nonaktif" && isLastSuperAdmin(user)) {
      setNotice({ tone: "error", text: "Super Admin aktif terakhir tidak boleh dinonaktifkan." });
      setConfirmId(null);
      return;
    }

    setUsers((current) => current.map((u) => (u.id === user.id ? { ...u, status: next } : u)));
    setConfirmId(null);
    setNotice({
      tone: "success",
      text:
        next === "Nonaktif"
          ? `${user.name} dinonaktifkan. Ia tidak dapat masuk lagi, tetapi riwayatnya tetap tersimpan.`
          : `${user.name} diaktifkan kembali.`,
    });
  }

  function resendInvite(user: UserRecord) {
    // TODO: Server Action memakai secret key Supabase untuk mengirim ulang undangan.
    setNotice({ tone: "success", text: `Undangan untuk ${user.email} akan dikirim ulang (belum tersambung backend).` });
  }

  const summary = [
    { label: "Total Pengguna", value: users.length, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Aktif", value: count("Aktif"), icon: UserCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Menunggu Undangan", value: count("Diundang"), icon: MailPlus, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Nonaktif", value: count("Nonaktif"), icon: UserX, color: "text-slate-600", bg: "bg-slate-100" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pengguna</h1>
          <p className="text-sm text-muted-foreground">
            Kelola akun, role, dan penugasan. Pengguna dibuat melalui undangan email.
          </p>
        </div>

        <Link
          href="/users/invite"
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
        >
          <MailPlus className="size-4" />
          Undang Pengguna
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summary.map((item) => (
          <Card key={item.label} className="border-[#DBEAFE] border-t-2 border-t-blue-500 shadow-sm transition hover:shadow-md">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="mt-2 text-2xl font-bold">{item.value}</p>
              </div>
              <div className={`rounded-xl p-3 ${item.bg}`}>
                <item.icon className={`size-5 ${item.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {notice && (
        <div
          role={notice.tone === "error" ? "alert" : "status"}
          className={`rounded-lg border px-4 py-3 text-sm ${
            notice.tone === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {notice.text}
        </div>
      )}

      <Card className="overflow-hidden border-[#DBEAFE] shadow-sm">
        <div className="space-y-3 border-b bg-[#F8FAFC] p-5">
          <div className="flex flex-wrap gap-3">
            <div className="relative sm:w-72">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Cari pengguna"
                placeholder="Cari nama, email, NOID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border-slate-200 pl-9"
              />
            </div>

            <select aria-label="Filter role" value={role} onChange={(e) => setRole(e.target.value)} className={selectClass}>
              <option value="all">Semua Role</option>
              {APP_ROLES.map((r) => (<option key={r} value={r}>{ROLE_LABELS[r]}</option>))}
            </select>

            <select aria-label="Filter unit" value={unit} onChange={(e) => setUnit(e.target.value)} className={selectClass}>
              <option value="all">Semua Unit</option>
              <option value={GROUP_ID}>Yuk Peduli Grup</option>
              {UNITS.map((u) => (<option key={u.id} value={u.id}>{u.name}</option>))}
            </select>

            <select aria-label="Filter status" value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}>
              <option value="all">Semua Status</option>
              {USER_STATUSES.map((s) => (<option key={s} value={s}>{s}</option>))}
            </select>
          </div>
        </div>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-5 py-4 text-left font-semibold">Pengguna</th>
                  <th className="px-5 py-4 text-left font-semibold">Role</th>
                  <th className="px-5 py-4 text-left font-semibold">Penugasan</th>
                  <th className="px-5 py-4 text-left font-semibold">Status</th>
                  <th className="px-5 py-4 text-left font-semibold">Terakhir Masuk</th>
                  <th className="px-5 py-4 text-center font-semibold">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((user) => (
                  <tr key={user.id} className="border-t border-slate-100 align-top transition hover:bg-blue-50/40">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-800">{user.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{user.email}</p>
                      {user.employeeNo && <p className="mt-0.5 text-xs text-slate-400">NOID {user.employeeNo}</p>}
                    </td>

                    <td className="px-5 py-4">
                      <select
                        aria-label={`Role ${user.name}`}
                        value={user.role}
                        onChange={(e) => changeRole(user, e.target.value as AppRole)}
                        disabled={user.status === "Nonaktif"}
                        className={`${selectClass} h-8 text-xs disabled:bg-slate-50 disabled:text-slate-400`}
                      >
                        {APP_ROLES.map((r) => (<option key={r} value={r}>{ROLE_LABELS[r]}</option>))}
                      </select>
                      {user.role === "super_admin" && (
                        <p className="mt-1 flex items-center gap-1 text-[11px] text-amber-700">
                          <ShieldCheck className="size-3" />
                          Akses penuh
                        </p>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <ul className="space-y-1 text-xs text-slate-600">
                        {user.assignments.map((a) => (
                          <li key={`${a.unitId}-${a.departmentId ?? ""}-${a.position}`}>
                            <span className="font-medium text-slate-700">{a.position}</span>
                            {" · "}
                            {unitLabel(a.unitId)}
                            {a.departmentId && ` · ${departmentLabel(a.departmentId)}`}
                          </li>
                        ))}
                      </ul>
                    </td>

                    <td className="px-5 py-4">
                      <Badge variant="outline" className={statusStyles[user.status]}>{user.status}</Badge>
                    </td>

                    <td className="px-5 py-4 text-xs text-slate-600">
                      {user.lastLogin ? formatDateTime(user.lastLogin) : "Belum pernah"}
                    </td>

                    <td className="px-5 py-4 text-center">
                      {confirmId === user.id ? (
                        <div className="flex flex-col items-center gap-1.5">
                          <p className="text-xs text-slate-600">Nonaktifkan {user.name}?</p>
                          <div className="flex gap-1.5">
                            <button type="button" onClick={() => setUserStatus(user, "Nonaktif")} className="h-7 rounded-md bg-red-600 px-2.5 text-xs font-medium text-white hover:bg-red-700">
                              Ya
                            </button>
                            <button type="button" onClick={() => setConfirmId(null)} className="h-7 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                              Batal
                            </button>
                          </div>
                        </div>
                      ) : user.status === "Aktif" ? (
                        <button type="button" onClick={() => setConfirmId(user.id)} className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-red-600 transition hover:bg-red-50">
                          Nonaktifkan
                        </button>
                      ) : user.status === "Nonaktif" ? (
                        <button type="button" onClick={() => setUserStatus(user, "Aktif")} className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50">
                          Aktifkan
                        </button>
                      ) : (
                        <button type="button" onClick={() => resendInvite(user)} className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-blue-700 transition hover:bg-blue-50">
                          Kirim ulang
                        </button>
                      )}
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      Tidak ada pengguna yang sesuai dengan filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t bg-slate-50/70 px-5 py-3">
            <p className="text-xs text-muted-foreground">
              Menampilkan {filtered.length} dari {users.length} pengguna
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
