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


/**
 * Bentuk data org_nodes dari Supabase.
 * Nilai kind di database menggunakan enum huruf kecil.
 */
export type OrgDbKind = "grup" | "unit" | "departemen" | "divisi";

export type OrgRow = {
  id: string;
  parent_id: string | null;
  kind: OrgDbKind;
  name: string;
  code: string | null;
  is_active: boolean;
  sort_order: number;
};


/**
 * Mengubah baris org_nodes dari database menjadi pohon OrgNode
 * yang digunakan oleh OrganizationView.
 *
 * Mengembalikan null jika struktur organisasi belum memiliki Grup.
 */
export function buildOrgTree(rows: OrgRow[]): OrgNode | null {
  const kindMap: Record<OrgDbKind, OrgKind> = {
    grup: "Grup",
    unit: "Unit",
    departemen: "Departemen",
    divisi: "Divisi",
  };

  // Urutkan berdasarkan sort_order, lalu nama.
  const sortedRows = [...rows].sort(
    (a, b) =>
      a.sort_order - b.sort_order ||
      a.name.localeCompare(b.name),
  );

  // Siapkan seluruh node terlebih dahulu agar relasi induk-anak tersedia.
  const nodeMap = new Map<string, OrgNode>();

  for (const row of sortedRows) {
    nodeMap.set(row.id, {
      id: row.id,
      name: row.name,
      kind: kindMap[row.kind],
      code: row.code ?? undefined,
      active: row.is_active,
      children: [],
    });
  }

  let root: OrgNode | null = null;

  // Hubungkan setiap node dengan induknya.
  for (const row of sortedRows) {
    const node = nodeMap.get(row.id)!;

    if (row.parent_id === null) {
      if (node.kind !== "Grup") return null;
      root = node;
      continue;
    }

    const parent = nodeMap.get(row.parent_id);

    // Struktur tidak valid jika induknya tidak ditemukan.
    if (!parent) return null;

    parent.children.push(node);
  }

  return root;
}

/**
 * Menghitung jumlah pengguna aktif pada setiap node organisasi.
 *
 * Penugasan berada pada node terdalam.
 * Jumlah anggota juga dihitung pada seluruh induknya.
 * Satu pengguna hanya dihitung satu kali pada setiap node,
 * meskipun memiliki beberapa jabatan atau penugasan.
 */
export function computeMemberCounts(
  rows: OrgRow[],
  assignments: {
    user_id: string;
    org_node_id: string;
    position_id: string;
  }[],
  activeProfileIds: Set<string>,
): Record<string, number> {
  const nodeMap = new Map(rows.map((row) => [row.id, row]));

  // Set mencegah pengguna yang sama dihitung berulang.
  const membersByNode = new Map<string, Set<string>>();

  for (const assignment of assignments) {
    const { user_id, org_node_id } = assignment;

    // Abaikan profil yang tidak aktif.
    if (!activeProfileIds.has(user_id)) continue;

    const assignedNode = nodeMap.get(org_node_id);

    // Abaikan penugasan pada node yang tidak tersedia atau nonaktif.
    if (!assignedNode || !assignedNode.is_active) continue;

    // Hitung pengguna pada node penugasan dan seluruh induknya.
    let current: OrgRow | undefined = assignedNode;
    const visited = new Set<string>();

    while (current) {
      // Perlindungan jika terdapat relasi melingkar.
      if (visited.has(current.id)) break;
      visited.add(current.id);

      if (!current.is_active) break;

      if (!membersByNode.has(current.id)) {
        membersByNode.set(current.id, new Set<string>());
      }

      membersByNode.get(current.id)!.add(user_id);

      current = current.parent_id
        ? nodeMap.get(current.parent_id)
        : undefined;
    }
  }

  // Konversi hasil Set menjadi Record<string, number>.
  return Object.fromEntries(
    Array.from(membersByNode, ([nodeId, members]) => [
      nodeId,
      members.size,
    ]),
  );
}
