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
