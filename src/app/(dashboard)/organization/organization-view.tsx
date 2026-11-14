"use client";

import * as React from "react";
import {
  Briefcase,
  Building2,
  ChevronDown,
  ChevronRight,
  Layers,
  Pencil,
  Plus,
  Power,
  Trash2,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CHILD_KIND, countDescendants, findNode, type OrgKind, type OrgNode } from "@/lib/organization";
import { CODE_PATTERN } from "@/lib/org-validation";

import {
  addOrgNodeAction,
  addPositionAction,
  removePositionAction,
  renameOrgNodeAction,
  setOrgNodeActiveAction,
  type ActionResult,
} from "./actions";

const kindStyles: Record<OrgKind, string> = {
  Grup: "border-purple-200 bg-purple-50 text-purple-700",
  Unit: "border-blue-200 bg-blue-50 text-blue-700",
  Departemen: "border-sky-200 bg-sky-50 text-sky-700",
  Divisi: "border-slate-200 bg-slate-100 text-slate-600",
};

const iconButton =
  "inline-flex size-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-blue-100 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-500";
const primaryButton =
  "inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-medium text-white transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40";
const secondaryButton =
  "inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40";

type Editing = { id: string; mode: "add" | "rename" } | null;
type Notice = { tone: "success" | "error"; text: string };

function validateNode(
  siblings: OrgNode[],
  selfId: string | null,
  kind: OrgKind,
  name: string,
  code: string,
) {
  const cleanName = name.trim();
  const cleanCode = code.trim();
  const others = siblings.filter((s) => s.id !== selfId);

  if (cleanName.length < 2 || cleanName.length > 80) return "Nama harus 2–80 karakter.";
  if (others.some((s) => s.name.toLowerCase() === cleanName.toLowerCase())) {
    return `Sudah ada ${kind.toLowerCase()} dengan nama tersebut pada tingkat ini.`;
  }

  if (kind === "Unit" || kind === "Departemen") {
    if (cleanCode && !CODE_PATTERN.test(cleanCode)) return "Kode terdiri dari 2–6 huruf kapital atau angka.";
    if (cleanCode && others.some((s) => s.code === cleanCode)) return "Kode sudah dipakai pada tingkat ini.";
  }

  return "";
}

function countByKind(node: OrgNode, kind: OrgKind): number {
  return (
    (node.kind === kind && node.active ? 1 : 0) +
    node.children.reduce((sum, child) => sum + countByKind(child, kind), 0)
  );
}

type Ctx = {
  collapsed: string[];
  editing: Editing;
  name: string;
  code: string;
  error: string;
  confirmId: string | null;
  memberCounts: Record<string, number>;
  pending: boolean;
  toggleCollapse: (id: string) => void;
  startEdit: (node: OrgNode, mode: "add" | "rename") => void;
  cancelEdit: () => void;
  setName: (value: string) => void;
  setCode: (value: string) => void;
  submit: () => void;
  askDeactivate: (node: OrgNode) => void;
  cancelConfirm: () => void;
  setActive: (node: OrgNode, active: boolean) => void;
};

function TreeNode({
  node,
  parentActive,
  ctx,
}: {
  node: OrgNode;
  parentActive: boolean;
  ctx: Ctx;
}) {
  const isRoot = node.kind === "Grup";
  const open = !ctx.collapsed.includes(node.id);
  const hasChildren = node.children.length > 0;
  const members = node.kind === "Divisi" ? null : (ctx.memberCounts[node.id] ?? 0);
  const childKind = CHILD_KIND[node.kind];
  const isEditingHere = ctx.editing?.id === node.id;
  const showCode = node.kind === "Unit" || node.kind === "Departemen";
  const formKind = ctx.editing?.mode === "add" ? childKind : node.kind;
  const needsCode = formKind === "Unit" || formKind === "Departemen";
  const affected = countDescendants(node);

  return (
    <li>
      <div
        className={`flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 ${
          node.active ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50"
        }`}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => ctx.toggleCollapse(node.id)}
            aria-expanded={open}
            aria-label={`${open ? "Ciutkan" : "Buka"} ${node.name}`}
            className={iconButton}
          >
            {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </button>
        ) : (
          <span className="inline-block size-8" aria-hidden="true" />
        )}

        <Badge variant="outline" className={kindStyles[node.kind]}>{node.kind}</Badge>

        <span className={`font-medium ${node.active ? "text-slate-800" : "text-slate-400 line-through"}`}>
          {node.name}
        </span>

        {showCode && node.code && (
          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600">{node.code}</span>
        )}

        {!node.active && (
          <Badge variant="outline" className="border-slate-200 bg-slate-100 text-slate-500">Nonaktif</Badge>
        )}

        {members !== null && (
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <Users className="size-3.5" />
            {members}
          </span>
        )}

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => ctx.startEdit(node, "add")}
            disabled={!node.active}
            aria-label={`Tambah ${childKind.toLowerCase()} di bawah ${node.name}`}
            title={node.active ? `Tambah ${childKind.toLowerCase()}` : "Aktifkan dulu untuk menambah"}
            className={iconButton}
          >
            <Plus className="size-4" />
          </button>

          {!isRoot && (
            <>
              <button
                type="button"
                onClick={() => ctx.startEdit(node, "rename")}
                aria-label={`Ubah ${node.name}`}
                title="Ubah nama"
                className={iconButton}
              >
                <Pencil className="size-4" />
              </button>

              {ctx.confirmId === node.id ? (
                <span className="flex items-center gap-1.5 pl-1">
                  <span className="text-xs text-slate-600">
                    Nonaktifkan{affected > 0 ? ` beserta ${affected} turunan` : ""}?
                  </span>
                  <button type="button" onClick={() => ctx.setActive(node, false)} className="h-7 rounded-md bg-red-600 px-2.5 text-xs font-medium text-white hover:bg-red-700">
                    Ya
                  </button>
                  <button type="button" onClick={ctx.cancelConfirm} className="h-7 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                    Batal
                  </button>
                </span>
              ) : node.active ? (
                <button
                  type="button"
                  onClick={() => ctx.askDeactivate(node)}
                  aria-label={`Nonaktifkan ${node.name}`}
                  title="Nonaktifkan"
                  className={`${iconButton} hover:bg-red-50 hover:text-red-600`}
                >
                  <Power className="size-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => ctx.setActive(node, true)}
                  disabled={!parentActive}
                  aria-label={`Aktifkan ${node.name}`}
                  title={parentActive ? "Aktifkan" : "Aktifkan induknya terlebih dahulu"}
                  className={`${iconButton} hover:bg-emerald-50 hover:text-emerald-700`}
                >
                  <Power className="size-4" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {isEditingHere && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            ctx.submit();
          }}
          noValidate
          className="ml-10 mt-2 space-y-2 rounded-lg border border-blue-200 bg-blue-50/50 p-3"
        >
          <p className="text-xs font-semibold text-blue-800">
            {ctx.editing?.mode === "add" ? `Tambah ${childKind.toLowerCase()} baru` : `Ubah ${node.kind.toLowerCase()}`}
          </p>

          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="flex-1">
              <label htmlFor="org-name" className="sr-only">Nama</label>
              <Input
                id="org-name"
                autoFocus
                value={ctx.name}
                onChange={(e) => ctx.setName(e.target.value)}
                placeholder="Nama"
                maxLength={80}
                aria-invalid={!!ctx.error}
                aria-describedby={ctx.error ? "org-error" : undefined}
              />
            </div>

            {needsCode && (
              <div className="sm:w-36">
                <label htmlFor="org-code" className="sr-only">Kode</label>
                <Input
                  id="org-code"
                  value={ctx.code}
                  onChange={(e) => ctx.setCode(e.target.value.toUpperCase())}
                  placeholder="Kode (opsional)"
                  maxLength={6}
                  className="font-mono"
                />
              </div>
            )}

            <div className="flex gap-2">
              <button type="submit" disabled={ctx.pending} className={`${primaryButton} disabled:cursor-not-allowed disabled:opacity-60`}>
                {ctx.pending ? "Menyimpan…" : "Simpan"}
              </button>
              <button type="button" onClick={ctx.cancelEdit} className={secondaryButton}>Batal</button>
            </div>
          </div>

          {needsCode && (
            <p className="text-xs text-slate-500">
              Kode dipakai pada nomor rapat. Mengubah kode hanya berlaku untuk rapat yang dibuat setelahnya.
            </p>
          )}
          {ctx.error && <p id="org-error" role="alert" className="text-xs text-red-600">{ctx.error}</p>}
        </form>
      )}

      {hasChildren && open && (
        <ul className="ml-5 mt-2 space-y-2 border-l border-slate-200 pl-4">
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} parentActive={node.active} ctx={ctx} />
          ))}
        </ul>
      )}
    </li>
  );
}

type PositionRow = { id: string; name: string; used: number };

export function OrganizationView({
  tree,
  positions,
  memberCounts,
}: {
  tree: OrgNode;
  positions: PositionRow[];
  memberCounts: Record<string, number>;
}) {
  const [pending, startTransition] = React.useTransition();
  const [collapsed, setCollapsed] = React.useState<string[]>([]);
  const [editing, setEditing] = React.useState<Editing>(null);
  const [name, setName] = React.useState("");
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState("");
  const [confirmId, setConfirmId] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<Notice | null>(null);

  const [positionName, setPositionName] = React.useState("");
  const [positionError, setPositionError] = React.useState("");

  /**
   * Jalankan Server Action. Data pohon datang dari props: setelah aksi berhasil,
   * revalidatePath di server memuat ulang halaman sehingga tampilan ikut berubah.
   */
  function run(action: () => Promise<ActionResult>, onSuccess: () => void, onError: (message: string) => void) {
    if (pending) return;

    startTransition(async () => {
      const result = await action();

      if (result.ok) onSuccess();
      else onError(result.error);
    });
  }

  function startEdit(node: OrgNode, mode: "add" | "rename") {
    setEditing({ id: node.id, mode });
    setName(mode === "rename" ? node.name : "");
    setCode(mode === "rename" ? (node.code ?? "") : "");
    setError("");
    setConfirmId(null);
    if (mode === "add") setCollapsed((current) => current.filter((id) => id !== node.id));
  }

  function cancelEdit() {
    setEditing(null);
    setError("");
  }

  function submit() {
    if (!editing) return;

    const target = findNode(tree, editing.id);
    if (!target) return;

    if (editing.mode === "add") {
      const kind = CHILD_KIND[target.kind];
      const problem = validateNode(target.children, null, kind, name, code);

      if (problem) return setError(problem);

      run(
        () => addOrgNodeAction(target.id, name, code),
        () => {
          setNotice({ tone: "success", text: `${kind} “${name.trim()}” ditambahkan di bawah ${target.name}.` });
          cancelEdit();
        },
        setError,
      );
    } else {
      const parent = findParent(tree, target.id);
      const problem = validateNode(parent?.children ?? [], target.id, target.kind, name, code);

      if (problem) return setError(problem);

      run(
        () => renameOrgNodeAction(target.id, name, code),
        () => {
          setNotice({ tone: "success", text: `${target.kind} diperbarui menjadi “${name.trim()}”.` });
          cancelEdit();
        },
        setError,
      );
    }
  }

  function setActive(node: OrgNode, active: boolean) {
    setConfirmId(null);

    run(
      () => setOrgNodeActiveAction(node.id, active),
      () =>
        setNotice({
          tone: "success",
          text: active
            ? `“${node.name}” diaktifkan kembali.`
            : `“${node.name}” dinonaktifkan. Riwayat rapat dan notulennya tetap tersimpan.`,
        }),
      (message) => setNotice({ tone: "error", text: message }),
    );
  }

  function addPosition(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const value = positionName.trim();

    if (value.length < 2 || value.length > 40) return setPositionError("Nama jabatan harus 2–40 karakter.");
    if (positions.some((p) => p.name.toLowerCase() === value.toLowerCase())) {
      return setPositionError("Jabatan tersebut sudah ada.");
    }

    run(
      () => addPositionAction(value),
      () => {
        setPositionName("");
        setPositionError("");
        setNotice({ tone: "success", text: `Jabatan “${value}” ditambahkan.` });
      },
      setPositionError,
    );
  }

  function removePosition(position: PositionRow) {
    run(
      () => removePositionAction(position.id),
      () => setNotice({ tone: "success", text: `Jabatan “${position.name}” dihapus dari daftar.` }),
      (message) => setNotice({ tone: "error", text: message }),
    );
  }

  const ctx: Ctx = {
    collapsed,
    editing,
    name,
    code,
    error,
    confirmId,
    memberCounts,
    pending,
    toggleCollapse: (id) =>
      setCollapsed((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id])),
    startEdit,
    cancelEdit,
    setName: (value) => {
      setName(value);
      setError("");
    },
    setCode: (value) => {
      setCode(value);
      setError("");
    },
    submit,
    askDeactivate: (node) => {
      setEditing(null);
      setConfirmId(node.id);
    },
    cancelConfirm: () => setConfirmId(null),
    setActive,
  };

  const summary = [
    { label: "Unit Aktif", value: countByKind(tree, "Unit"), icon: Building2, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Departemen Aktif", value: countByKind(tree, "Departemen"), icon: Layers, color: "text-sky-600", bg: "bg-sky-50" },
    { label: "Divisi Aktif", value: countByKind(tree, "Divisi"), icon: Layers, color: "text-slate-600", bg: "bg-slate-100" },
    { label: "Jabatan", value: positions.length, icon: Briefcase, color: "text-purple-600", bg: "bg-purple-50" },
  ];

  return (
    <div className="space-y-6" aria-busy={pending}>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Struktur Organisasi</h1>
        <p className="text-sm text-muted-foreground">
          Kelola unit, departemen, divisi, dan jabatan. Struktur bersifat dinamis; data lama dinonaktifkan,
          bukan dihapus, agar riwayat rapat tetap utuh.
        </p>
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
            notice.tone === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {notice.text}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="border-[#DBEAFE] shadow-sm">
          <CardHeader className="border-b bg-[#F8FAFC]">
            <CardTitle className="text-base">Hierarki</CardTitle>
            <p className="text-xs text-muted-foreground">
              Angka di samping nama adalah jumlah pengguna aktif. Grup → Unit → Departemen → Divisi.
            </p>
          </CardHeader>
          <CardContent className="p-5">
            <ul className="space-y-2">
              <TreeNode node={tree} parentActive ctx={ctx} />
            </ul>
          </CardContent>
        </Card>

        <Card className="h-fit border-[#DBEAFE] shadow-sm">
          <CardHeader className="border-b bg-[#F8FAFC]">
            <CardTitle className="text-base">Master Jabatan</CardTitle>
            <p className="text-xs text-muted-foreground">Jabatan berbeda dari role aplikasi.</p>
          </CardHeader>
          <CardContent className="space-y-4 p-5">
            <ul className="divide-y divide-slate-100">
              {positions.map((position) => (
                <li key={position.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="text-sm text-slate-800">{position.name}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">{position.used} penugasan</span>
                    <button
                      type="button"
                      onClick={() => removePosition(position)}
                      disabled={position.used > 0 || pending}
                      aria-label={`Hapus jabatan ${position.name}`}
                      title={position.used > 0 ? "Masih dipakai penugasan pengguna" : "Hapus"}
                      className={`${iconButton} hover:bg-red-50 hover:text-red-600`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </span>
                </li>
              ))}
            </ul>

            <form onSubmit={addPosition} noValidate className="space-y-2">
              <label htmlFor="position-name" className="text-sm font-medium text-slate-700">Tambah jabatan</label>
              <div className="flex gap-2">
                <Input
                  id="position-name"
                  value={positionName}
                  onChange={(e) => {
                    setPositionName(e.target.value);
                    setPositionError("");
                  }}
                  aria-invalid={!!positionError}
                  aria-describedby={positionError ? "position-error" : undefined}
                  maxLength={40}
                />
                <button type="submit" disabled={pending} className={`${primaryButton} disabled:cursor-not-allowed disabled:opacity-60`}>
                  Tambah
                </button>
              </div>
              {positionError && <p id="position-error" role="alert" className="text-xs text-red-600">{positionError}</p>}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/** Cari induk dari sebuah node. */
function findParent(root: OrgNode, childId: string): OrgNode | undefined {
  for (const child of root.children) {
    if (child.id === childId) return root;

    const found = findParent(child, childId);
    if (found) return found;
  }

  return undefined;
}