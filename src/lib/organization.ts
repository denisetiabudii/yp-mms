/**
 * Struktur organisasi dinamis (PRD bagian 6): Grup → Unit → Departemen → Divisi.
 * Data contoh; di produksi dari tabel master dan dapat diubah admin tanpa kode.
 */

import { DEPARTMENTS, UNITS } from "@/lib/meetings";

export type OrgKind = "Grup" | "Unit" | "Departemen" | "Divisi";

export type OrgNode = {
  id: string;
  name: string;
  kind: OrgKind;
  code?: string;
  active: boolean;
  children: OrgNode[];
};

/** Jenis anak yang boleh ditambahkan di bawah tiap level. */
export const CHILD_KIND: Record<OrgKind, OrgKind> = {
  Grup: "Unit",
  Unit: "Departemen",
  Departemen: "Divisi",
  Divisi: "Divisi",
};

/** Master jabatan (bukan role aplikasi — PRD bagian 6). */
export const INITIAL_POSITIONS = [
  "CEO",
  "Direktur",
  "Mudir",
  "Manager",
  "Kepala Divisi",
  "Koordinator",
  "Staff",
  "Notulis",
] as const;

// Contoh divisi di bawah Fundraising (opsional dalam PRD).
const SAMPLE_DIVISIONS: Record<string, string[]> = {
  "laz-fundraising": ["Fundraising Digital", "Fundraising Korporat"],
};

export const INITIAL_ORG: OrgNode = {
  id: "grup",
  name: "Yuk Peduli Grup",
  kind: "Grup",
  active: true,
  children: UNITS.map((unit) => ({
    id: unit.id,
    name: unit.name,
    kind: "Unit" as const,
    code: unit.code,
    active: true,
    children: DEPARTMENTS.filter((d) => d.unitId === unit.id).map((department) => ({
      id: department.id,
      name: department.name,
      kind: "Departemen" as const,
      code: department.code,
      active: true,
      children: (SAMPLE_DIVISIONS[department.id] ?? []).map((name, index) => ({
        id: `${department.id}-div-${index + 1}`,
        name,
        kind: "Divisi" as const,
        active: true,
        children: [],
      })),
    })),
  })),
};

/* ----------------------- Operasi pohon (immutable) ----------------------- */

export function mapNode(
  node: OrgNode,
  id: string,
  update: (target: OrgNode) => OrgNode,
): OrgNode {
  if (node.id === id) return update(node);

  return { ...node, children: node.children.map((child) => mapNode(child, id, update)) };
}

export function setActiveCascade(node: OrgNode, active: boolean): OrgNode {
  return { ...node, active, children: node.children.map((c) => setActiveCascade(c, active)) };
}

export function findNode(node: OrgNode, id: string): OrgNode | undefined {
  if (node.id === id) return node;

  for (const child of node.children) {
    const found = findNode(child, id);
    if (found) return found;
  }

  return undefined;
}

export function countDescendants(node: OrgNode): number {
  return node.children.reduce((sum, child) => sum + 1 + countDescendants(child), 0);
}

/* ------------------- Pembacaan dari database (Supabase) ------------------- */

/** Baris tabel public.org_nodes. */
export type OrgRow = {
  id: string;
  parent_id: string | null;
  kind: "grup" | "unit" | "departemen" | "divisi";
  name: string;
  code: string | null;
  is_active: boolean;
  sort_order: number;
};

const KIND_LABEL: Record<OrgRow["kind"], OrgKind> = {
  grup: "Grup",
  unit: "Unit",
  departemen: "Departemen",
  divisi: "Divisi",
};

/** Susun baris datar menjadi pohon. Mengembalikan null bila tidak ada grup (data belum disemai). */
export function buildOrgTree(rows: OrgRow[]): OrgNode | null {
  const byParent = new Map<string | null, OrgRow[]>();

  rows.forEach((row) => {
    const list = byParent.get(row.parent_id) ?? [];

    list.push(row);
    byParent.set(row.parent_id, list);
  });

  const build = (row: OrgRow): OrgNode => ({
    id: row.id,
    name: row.name,
    kind: KIND_LABEL[row.kind],
    code: row.code ?? undefined,
    active: row.is_active,
    children: (byParent.get(row.id) ?? [])
      .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
      .map(build),
  });

  const root = (byParent.get(null) ?? []).find((row) => row.kind === "grup");

  return root ? build(root) : null;
}

/**
 * Jumlah pengguna AKTIF per node, termasuk penugasan di turunannya
 * (orang yang ditugaskan di departemen ikut terhitung di unitnya).
 * Satu orang dengan beberapa penugasan di cabang yang sama dihitung sekali.
 */
export function computeMemberCounts(
  rows: OrgRow[],
  assignments: { user_id: string; org_node_id: string }[],
  activeUserIds: ReadonlySet<string>,
): Record<string, number> {
  const children = new Map<string, string[]>();

  rows.forEach((row) => {
    if (row.parent_id) children.set(row.parent_id, [...(children.get(row.parent_id) ?? []), row.id]);
  });

  const direct = new Map<string, Set<string>>();

  assignments.forEach((a) => {
    if (!activeUserIds.has(a.user_id)) return;
    direct.set(a.org_node_id, (direct.get(a.org_node_id) ?? new Set()).add(a.user_id));
  });

  const counts: Record<string, number> = {};

  const collect = (id: string): Set<string> => {
    const users = new Set(direct.get(id) ?? []);

    (children.get(id) ?? []).forEach((childId) => collect(childId).forEach((u) => users.add(u)));
    counts[id] = users.size;

    return users;
  };

  rows.filter((row) => row.parent_id === null).forEach((row) => collect(row.id));

  return counts;
}
