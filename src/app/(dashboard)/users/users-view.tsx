"use client";

import * as React from "react";
import Link from "next/link";
import {
  MailPlus,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/feedback/toast-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { APP_ROLES, ROLE_LABELS, type AppRole } from "@/lib/auth/roles";
import { normalizeName } from "@/lib/org-validation";
import { formatDateTime } from "@/lib/minutes";
import {
  MAX_ASSIGNMENTS,
  validateAssignmentItems,
  validateDeleteConfirmation,
  validateUserProfile,
  type NodeOption,
  type UserStatus,
} from "@/lib/users-db";

import {
  deleteUserAction,
  setUserActiveAction,
  setUserAssignmentsAction,
  updateUserProfileAction,
  updateUserRoleAction,
  type ActionResult,
} from "./actions";
import { resendInviteAction } from "./invite/actions";

export type UserVM = {
  id: string;
  name: string;
  email: string;
  employeeNo: string;
  role: AppRole;
  status: UserStatus;
  lastLogin: string | null;
  assignments: { orgNodeId: string; positionId: string }[];
};

type PositionOption = { id: string; name: string; active: boolean };
type DraftItem = { key: number; orgNodeId: string; positionId: string };
type Draft = { name: string; employeeNo: string; items: DraftItem[] };
const selectClass =
  "h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";
const primaryButton =
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-60";
const secondaryButton =
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-60";

const statusStyles: Record<UserStatus, string> = {
  Aktif: "border-emerald-200 bg-emerald-100 text-emerald-700",
  Diundang: "border-amber-200 bg-amber-100 text-amber-700",
  Nonaktif: "border-slate-200 bg-slate-100 text-slate-600",
};

const STATUSES: UserStatus[] = ["Aktif", "Diundang", "Nonaktif"];

export function UsersView({
  users,
  nodeOptions,
  positions,
  selfId,
}: {
  users: UserVM[];
  nodeOptions: NodeOption[];
  positions: PositionOption[];
  selfId: string;
}) {
  const [pending, startTransition] = React.useTransition();
  const draftKey = React.useRef(1);

  const [search, setSearch] = React.useState("");
  const [role, setRole] = React.useState("all");
  const [unit, setUnit] = React.useState("all");
  const [status, setStatus] = React.useState("all");
  const [confirmId, setConfirmId] = React.useState<string | null>(null);
  const toast = useToast();
  const [cooldownIds, setCooldownIds] = React.useState<string[]>([]);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [deleteTyped, setDeleteTyped] = React.useState("");

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [draftError, setDraftError] = React.useState("");

  const nodeById = new Map(nodeOptions.map((n) => [n.id, n]));
  const positionById = new Map(positions.map((p) => [p.id, p]));
  const unitOptions = nodeOptions.filter((n) => n.kind === "unit");

  const keyword = search.trim().toLowerCase();

  const filtered = users.filter((user) => {
    const haystack = [user.name, user.email, user.employeeNo]
      .join(" ")
      .toLowerCase();
    const inUnit =
      unit === "all" ||
      user.assignments.some((a) => {
        const node = nodeById.get(a.orgNodeId);

        return unit === "grup" ? node?.kind === "grup" : node?.unitId === unit;
      });

    return (
      (!keyword || haystack.includes(keyword)) &&
      (role === "all" || user.role === role) &&
      inUnit &&
      (status === "all" || user.status === status)
    );
  });

  const count = (s: UserStatus) => users.filter((u) => u.status === s).length;

  /** Jalankan Server Action; hasilnya dimuat ulang dari server lewat revalidatePath. */
  function run(
    action: () => Promise<ActionResult>,
    onSuccess: () => void,
    onError: (message: string) => void,
  ) {
    if (pending) return;

    startTransition(async () => {
      const result = await action();

      if (result.ok) onSuccess();
      else onError(result.error);
    });
  }

  function changeRole(user: UserVM, next: AppRole) {
    if (next === user.role) return;

    run(
      () => updateUserRoleAction(user.id, next),
      () =>
        toast.success(`Role ${user.name} diubah menjadi ${ROLE_LABELS[next]}.`),
      (message) => toast.error(`Role ${user.name} tidak diubah. ${message}`),
    );
  }

  function setActive(user: UserVM, active: boolean) {
    setConfirmId(null);

    run(
      () => setUserActiveAction(user.id, active),
      () =>
        toast.success(
          active
            ? `${user.name} diaktifkan kembali.`
            : `${user.name} dinonaktifkan. Ia tidak dapat masuk lagi, tetapi riwayatnya tetap tersimpan.`,
        ),
      (message) =>
        toast.error(
          `${user.name} tidak ${active ? "diaktifkan" : "dinonaktifkan"}. ${message}`,
        ),
    );
  }

  /** Setiap kirim ulang benar-benar mengirim email baru (kuota email terbatas), jadi diberi jeda 30 detik. */
  function resendInvite(user: UserVM) {
    run(
      () => resendInviteAction(user.id),
      () => {
        toast.success(
          `Undangan dikirim ulang ke ${user.email}. Pengguna perlu membuka email terbaru.`,
        );
        setCooldownIds((current) => [...current, user.id]);
        setTimeout(
          () =>
            setCooldownIds((current) => current.filter((id) => id !== user.id)),
          30_000,
        );
      },
      (message) =>
        toast.error(`Undangan ke ${user.email} tidak terkirim. ${message}`),
    );
  }

  function askDelete(user: UserVM) {
    setConfirmId(null);
    setEditingId(null);
    setDraft(null);
    setDeleteId(user.id);
    setDeleteTyped("");
  }

  function cancelDelete() {
    setDeleteId(null);
    setDeleteTyped("");
  }

  function confirmDelete(user: UserVM) {
    run(
      () => deleteUserAction(user.id, deleteTyped),
      () => {
        toast.success(
          `Akun ${user.name} dihapus permanen dan tercatat di audit log.`,
        );
        cancelDelete();
      },
      (message) => toast.error(`Akun ${user.name} tidak dihapus. ${message}`),
    );
  }

  function startEdit(user: UserVM) {
    setEditingId(user.id);
    setDraftError("");
    setConfirmId(null);
    setDraft({
      name: user.name,
      employeeNo: user.employeeNo,
      items: user.assignments.map((a) => ({
        key: draftKey.current++,
        orgNodeId: a.orgNodeId,
        positionId: a.positionId,
      })),
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(null);
    setDraftError("");
  }

  function updateItem(key: number, patch: Partial<DraftItem>) {
    setDraft((current) =>
      current
        ? {
            ...current,
            items: current.items.map((i) =>
              i.key === key ? { ...i, ...patch } : i,
            ),
          }
        : current,
    );
    setDraftError("");
  }

  function saveEdit(user: UserVM) {
    if (!draft) return;

    const profileProblem = validateUserProfile(draft.name, draft.employeeNo);

    if (profileProblem) return setDraftError(profileProblem);
    if (draft.items.some((i) => !i.orgNodeId || !i.positionId)) {
      return setDraftError("Setiap penugasan wajib memiliki unit dan jabatan.");
    }

    const items = draft.items.map((i) => ({
      org_node_id: i.orgNodeId,
      position_id: i.positionId,
    }));
    const itemsProblem = validateAssignmentItems(items);

    if (itemsProblem) return setDraftError(itemsProblem);

    const sig = (list: { org_node_id: string; position_id: string }[]) =>
      JSON.stringify(
        list.map((i) => `${i.org_node_id}|${i.position_id}`).sort(),
      );
    const before = user.assignments.map((a) => ({
      org_node_id: a.orgNodeId,
      position_id: a.positionId,
    }));

    const profileChanged =
      normalizeName(draft.name) !== user.name ||
      draft.employeeNo.trim() !== user.employeeNo;
    const assignmentsChanged = sig(items) !== sig(before);

    if (!profileChanged && !assignmentsChanged)
      return setDraftError("Belum ada perubahan untuk disimpan.");

    startTransition(async () => {
      if (profileChanged) {
        const result = await updateUserProfileAction(
          user.id,
          draft.name,
          draft.employeeNo,
        );

        if (!result.ok) return setDraftError(result.error);
      }

      if (assignmentsChanged) {
        const result = await setUserAssignmentsAction(user.id, items);

        if (!result.ok) {
          return setDraftError(
            profileChanged
              ? `Profil tersimpan, tetapi penugasan gagal: ${result.error}`
              : result.error,
          );
        }
      }

      toast.success(`Data ${normalizeName(draft.name)} diperbarui.`);
      cancelEdit();
    });
  }

  const summary = [
    {
      label: "Total Pengguna",
      value: users.length,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Aktif",
      value: count("Aktif"),
      icon: UserCheck,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Menunggu Undangan",
      value: count("Diundang"),
      icon: MailPlus,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "Nonaktif",
      value: count("Nonaktif"),
      icon: UserX,
      color: "text-slate-600",
      bg: "bg-slate-100",
    },
  ];

  return (
    <div className="space-y-6" aria-busy={pending}>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pengguna</h1>
          <p className="text-sm text-muted-foreground">
            Kelola akun, role, dan penugasan. Pengguna dibuat melalui undangan
            email.
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
          <Card
            key={item.label}
            className="border-[#DBEAFE] border-t-2 border-t-blue-500 shadow-sm transition hover:shadow-md"
          >
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

            <select
              aria-label="Filter role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className={selectClass}
            >
              <option value="all">Semua Role</option>
              {APP_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className={selectClass}
            >
              <option value="all">Semua Unit</option>
              <option value="grup">Tingkat grup</option>
              {unitOptions.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={selectClass}
            >
              <option value="all">Semua Status</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-5 py-4 text-left font-semibold">
                    Pengguna
                  </th>
                  <th className="px-5 py-4 text-left font-semibold">Role</th>
                  <th className="px-5 py-4 text-left font-semibold">
                    Penugasan
                  </th>
                  <th className="px-5 py-4 text-left font-semibold">Status</th>
                  <th className="px-5 py-4 text-left font-semibold">
                    Terakhir Masuk
                  </th>
                  <th className="px-5 py-4 text-center font-semibold">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((user) => {
                  const isSelf = user.id === selfId;
                  const editing = editingId === user.id && draft;

                  return (
                    <React.Fragment key={user.id}>
                      <tr className="border-t border-slate-100 align-top transition hover:bg-blue-50/40">
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-800">
                            {user.name}
                            {isSelf && (
                              <span className="ml-2 text-xs font-normal text-blue-600">
                                (Anda)
                              </span>
                            )}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {user.email}
                          </p>
                          {user.employeeNo && (
                            <p className="mt-0.5 text-xs text-slate-400">
                              NOID {user.employeeNo}
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <select
                            aria-label={`Role ${user.name}`}
                            value={user.role}
                            onChange={(e) =>
                              changeRole(user, e.target.value as AppRole)
                            }
                            disabled={
                              pending || isSelf || user.status === "Nonaktif"
                            }
                            title={
                              isSelf
                                ? "Tidak dapat mengubah role akun sendiri"
                                : undefined
                            }
                            className={`${selectClass} h-8 text-xs`}
                          >
                            {APP_ROLES.map((r) => (
                              <option key={r} value={r}>
                                {ROLE_LABELS[r]}
                              </option>
                            ))}
                          </select>
                          {user.role === "super_admin" && (
                            <p className="mt-1 flex items-center gap-1 text-[11px] text-amber-700">
                              <ShieldCheck className="size-3" />
                              Akses penuh
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          {user.assignments.length === 0 ? (
                            <p className="text-xs text-amber-700">
                              Belum ada penugasan
                            </p>
                          ) : (
                            <ul className="space-y-1 text-xs text-slate-600">
                              {user.assignments.map((a) => (
                                <li key={`${a.orgNodeId}-${a.positionId}`}>
                                  <span className="font-medium text-slate-700">
                                    {positionById.get(a.positionId)?.name ??
                                      "—"}
                                  </span>
                                  {positionById.get(a.positionId)?.active ===
                                    false && (
                                    <span className="text-slate-400">
                                      {" "}
                                      (nonaktif)
                                    </span>
                                  )}
                                  {" · "}
                                  {nodeById.get(a.orgNodeId)?.label ?? "—"}
                                  {nodeById.get(a.orgNodeId)?.active ===
                                    false && (
                                    <span className="text-slate-400">
                                      {" "}
                                      (nonaktif)
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <Badge
                            variant="outline"
                            className={statusStyles[user.status]}
                          >
                            {user.status}
                          </Badge>
                        </td>

                        <td className="px-5 py-4 text-xs text-slate-600">
                          {user.lastLogin
                            ? formatDateTime(user.lastLogin)
                            : "Belum pernah"}
                        </td>

                        <td className="px-5 py-4 text-center">
                          <div className="flex flex-col items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => startEdit(user)}
                              disabled={pending}
                              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-blue-50 hover:text-blue-700 disabled:opacity-60"
                            >
                              <Pencil className="size-3.5" />
                              Ubah
                            </button>

                            {user.status === "Diundang" && (
                              <button
                                type="button"
                                onClick={() => resendInvite(user)}
                                disabled={
                                  pending || cooldownIds.includes(user.id)
                                }
                                title="Mengirim email undangan baru"
                                className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {cooldownIds.includes(user.id)
                                  ? "Terkirim (tunggu 30 dtk)"
                                  : "Kirim ulang"}
                              </button>
                            )}

                            {confirmId === user.id ? (
                              <div className="flex flex-col items-center gap-1.5">
                                <p className="text-xs text-slate-600">
                                  Nonaktifkan {user.name}?
                                </p>
                                <div className="flex gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setActive(user, false)}
                                    disabled={pending}
                                    className="h-7 rounded-md bg-red-600 px-2.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
                                  >
                                    Ya
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmId(null)}
                                    className="h-7 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                  >
                                    Batal
                                  </button>
                                </div>
                              </div>
                            ) : user.status === "Nonaktif" ? (
                              <button
                                type="button"
                                onClick={() => setActive(user, true)}
                                disabled={pending}
                                className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-60"
                              >
                                Aktifkan
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmId(user.id)}
                                disabled={pending || isSelf}
                                title={
                                  isSelf
                                    ? "Tidak dapat menonaktifkan akun sendiri"
                                    : undefined
                                }
                                className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Nonaktifkan
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => askDelete(user)}
                              disabled={pending || isSelf}
                              title={
                                isSelf
                                  ? "Tidak dapat menghapus akun sendiri"
                                  : "Hapus akun permanen"
                              }
                              className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-slate-500 transition hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <Trash2 className="size-3.5" />
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>

                      {deleteId === user.id && (
                        <tr className="bg-red-50/60">
                          <td colSpan={6} className="px-5 py-5">
                            <form
                              onSubmit={(event) => {
                                event.preventDefault();
                                if (
                                  validateDeleteConfirmation(
                                    user.email || user.name,
                                    deleteTyped,
                                  )
                                )
                                  confirmDelete(user);
                              }}
                              noValidate
                              className="max-w-2xl space-y-3"
                              aria-label={`Hapus akun ${user.name}`}
                            >
                              <p className="text-sm font-semibold text-red-800">
                                Hapus akun {user.name} secara permanen?
                              </p>

                              <ul className="list-disc space-y-1 pl-5 text-xs leading-5 text-red-800">
                                <li>
                                  Akun, akses login, dan penugasannya dihapus
                                  dan <strong>tidak dapat dikembalikan</strong>.
                                </li>
                                <li>
                                  Penghapusan tercatat di Audit Log (siapa,
                                  kapan, dan email yang dihapus).
                                </li>
                                <li>
                                  Akun yang sudah punya riwayat (rapat, notulen,
                                  atau tugas){" "}
                                  <strong>tidak dapat dihapus</strong> demi
                                  menjaga riwayat; untuk itu gunakan{" "}
                                  <strong>Nonaktifkan</strong>.
                                </li>
                              </ul>

                              <div className="space-y-1.5">
                                <label
                                  htmlFor={`delete-confirm-${user.id}`}
                                  className="text-sm font-medium text-slate-700"
                                >
                                  Ketik{" "}
                                  <span className="rounded bg-white px-1.5 py-0.5 font-mono text-xs text-red-700">
                                    {user.email || user.name}
                                  </span>{" "}
                                  untuk mengonfirmasi
                                </label>
                                <Input
                                  id={`delete-confirm-${user.id}`}
                                  value={deleteTyped}
                                  onChange={(e) =>
                                    setDeleteTyped(e.target.value)
                                  }
                                  autoComplete="off"
                                  autoCapitalize="none"
                                  spellCheck={false}
                                  autoFocus
                                />
                              </div>

                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="submit"
                                  disabled={
                                    pending ||
                                    !validateDeleteConfirmation(
                                      user.email || user.name,
                                      deleteTyped,
                                    )
                                  }
                                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-medium text-white transition hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  <Trash2 className="size-4" />
                                  {pending ? "Menghapus…" : "Hapus permanen"}
                                </button>

                                {user.status !== "Nonaktif" && !isSelf && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      cancelDelete();
                                      setConfirmId(user.id);
                                    }}
                                    className={secondaryButton}
                                  >
                                    Nonaktifkan saja
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={cancelDelete}
                                  disabled={pending}
                                  className={secondaryButton}
                                >
                                  Batal
                                </button>
                              </div>
                            </form>
                          </td>
                        </tr>
                      )}

                      {editing && draft && (
                        <tr className="bg-blue-50/40">
                          <td colSpan={6} className="px-5 py-5">
                            <form
                              onSubmit={(event) => {
                                event.preventDefault();
                                saveEdit(user);
                              }}
                              noValidate
                              className="space-y-4"
                              aria-label={`Ubah data ${user.name}`}
                            >
                              <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                  <label
                                    htmlFor="edit-name"
                                    className="text-sm font-medium text-slate-700"
                                  >
                                    Nama lengkap
                                  </label>
                                  <Input
                                    id="edit-name"
                                    value={draft.name}
                                    onChange={(e) => {
                                      setDraft({
                                        ...draft,
                                        name: e.target.value,
                                      });
                                      setDraftError("");
                                    }}
                                    maxLength={120}
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <label
                                    htmlFor="edit-no"
                                    className="text-sm font-medium text-slate-700"
                                  >
                                    NOID
                                  </label>
                                  <Input
                                    id="edit-no"
                                    value={draft.employeeNo}
                                    onChange={(e) => {
                                      setDraft({
                                        ...draft,
                                        employeeNo: e.target.value,
                                      });
                                      setDraftError("");
                                    }}
                                    maxLength={30}
                                  />
                                </div>
                              </div>

                              <fieldset className="space-y-2">
                                <legend className="text-sm font-medium text-slate-700">
                                  Penugasan
                                </legend>

                                {draft.items.map((item, index) => (
                                  <div
                                    key={item.key}
                                    className="grid gap-2 sm:grid-cols-[1fr_14rem_2.25rem] sm:items-center"
                                  >
                                    <select
                                      aria-label={`Unit penugasan ${index + 1}`}
                                      value={item.orgNodeId}
                                      onChange={(e) =>
                                        updateItem(item.key, {
                                          orgNodeId: e.target.value,
                                        })
                                      }
                                      className={selectClass}
                                    >
                                      <option value="">
                                        Pilih unit / departemen…
                                      </option>
                                      {nodeOptions
                                        .filter(
                                          (n) =>
                                            n.active || n.id === item.orgNodeId,
                                        )
                                        .map((n) => (
                                          <option key={n.id} value={n.id}>
                                            {n.label}
                                            {n.active ? "" : " (nonaktif)"}
                                          </option>
                                        ))}
                                    </select>

                                    <select
                                      aria-label={`Jabatan penugasan ${index + 1}`}
                                      value={item.positionId}
                                      onChange={(e) =>
                                        updateItem(item.key, {
                                          positionId: e.target.value,
                                        })
                                      }
                                      className={selectClass}
                                    >
                                      <option value="">Pilih jabatan…</option>
                                      {positions
                                        .filter(
                                          (p) =>
                                            p.active ||
                                            p.id === item.positionId,
                                        )
                                        .map((p) => (
                                          <option key={p.id} value={p.id}>
                                            {p.name}
                                            {p.active ? "" : " (nonaktif)"}
                                          </option>
                                        ))}
                                    </select>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        setDraft({
                                          ...draft,
                                          items: draft.items.filter(
                                            (i) => i.key !== item.key,
                                          ),
                                        })
                                      }
                                      aria-label={`Hapus penugasan ${index + 1}`}
                                      className="inline-flex size-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                                    >
                                      <Trash2 className="size-4" />
                                    </button>
                                  </div>
                                ))}

                                {draft.items.length === 0 && (
                                  <p className="text-xs text-amber-700">
                                    Tanpa penugasan, pengguna tidak punya
                                    cakupan unit.
                                  </p>
                                )}

                                <button
                                  type="button"
                                  onClick={() =>
                                    setDraft({
                                      ...draft,
                                      items: [
                                        ...draft.items,
                                        {
                                          key: draftKey.current++,
                                          orgNodeId: "",
                                          positionId: "",
                                        },
                                      ],
                                    })
                                  }
                                  disabled={
                                    draft.items.length >= MAX_ASSIGNMENTS
                                  }
                                  className={secondaryButton}
                                >
                                  <Plus className="size-4" />
                                  Tambah penugasan
                                </button>
                              </fieldset>

                              {draftError && (
                                <p
                                  role="alert"
                                  className="text-sm text-red-600"
                                >
                                  {draftError}
                                </p>
                              )}

                              <div className="flex gap-2">
                                <button
                                  type="submit"
                                  disabled={pending}
                                  className={primaryButton}
                                >
                                  {pending ? "Menyimpan…" : "Simpan"}
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEdit}
                                  disabled={pending}
                                  className={secondaryButton}
                                >
                                  Batal
                                </button>
                              </div>
                            </form>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}

                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-12 text-center text-muted-foreground"
                    >
                      {users.length === 0
                        ? "Belum ada pengguna."
                        : "Tidak ada pengguna yang sesuai dengan filter."}
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
