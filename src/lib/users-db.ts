/**
 * Logika murni untuk halaman Pengguna yang tersambung database.
 * Dipakai di server (Server Action memvalidasi ulang) dan klien (umpan balik cepat).
 */

import type { OrgRow } from "@/lib/organization";
import { UUID_PATTERN, normalizeName } from "@/lib/org-validation";

/** Baris hasil fungsi public.admin_list_users(). */
export type UserRow = {
  id: string;
  email: string | null;
  full_name: string;
  employee_no: string | null;
  role: string;
  is_active: boolean;
  invited_at: string | null;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
  created_at: string;
};

export type UserStatus = "Aktif" | "Diundang" | "Nonaktif";

/** Nonaktif > Diundang (diundang tetapi belum pernah masuk) > Aktif. */
export function deriveUserStatus(row: Pick<UserRow, "is_active" | "invited_at" | "last_sign_in_at">): UserStatus {
  if (!row.is_active) return "Nonaktif";
  if (!row.last_sign_in_at && row.invited_at) return "Diundang";

  return "Aktif";
}

export type NodeOption = {
  id: string;
  /** Jalur tanpa akar grup, mis. "LAZ Yuk Peduli › Program". */
  label: string;
  kind: OrgRow["kind"];
  active: boolean;
  /** id unit induk (atau dirinya bila unit); null untuk grup. */
  unitId: string | null;
};

/** Pilihan node organisasi berurutan seperti pohon, lengkap dengan jalur dan unit induknya. */
export function buildNodeOptions(rows: OrgRow[]): NodeOption[] {
  const byParent = new Map<string | null, OrgRow[]>();

  rows.forEach((row) => byParent.set(row.parent_id, [...(byParent.get(row.parent_id) ?? []), row]));

  const out: NodeOption[] = [];

  const walk = (row: OrgRow, path: string[], unitId: string | null) => {
    const nextUnit = row.kind === "unit" ? row.id : unitId;
    const names = row.kind === "grup" ? [] : [...path, row.name];

    out.push({
      id: row.id,
      label: row.kind === "grup" ? row.name : names.join(" › "),
      kind: row.kind,
      active: row.is_active,
      unitId: row.kind === "grup" ? null : nextUnit,
    });

    (byParent.get(row.id) ?? [])
      .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
      .forEach((child) => walk(child, names, nextUnit));
  };

  (byParent.get(null) ?? []).forEach((root) => walk(root, [], null));

  return out;
}

export type AssignmentItem = { org_node_id: string; position_id: string };

export const MAX_ASSIGNMENTS = 20;

/** Pesan masalah untuk daftar penugasan, atau null bila valid. */
export function validateAssignmentItems(items: unknown): string | null {
  if (!Array.isArray(items)) return "Format penugasan tidak valid.";
  if (items.length > MAX_ASSIGNMENTS) return `Maksimal ${MAX_ASSIGNMENTS} penugasan per pengguna.`;

  const seen = new Set<string>();

  for (const item of items) {
    const node = (item as AssignmentItem | null)?.org_node_id;
    const position = (item as AssignmentItem | null)?.position_id;

    if (typeof node !== "string" || typeof position !== "string") return "Setiap penugasan wajib memiliki unit dan jabatan.";
    if (!UUID_PATTERN.test(node) || !UUID_PATTERN.test(position)) return "Format penugasan tidak valid.";

    const key = `${node}|${position}`;

    if (seen.has(key)) return "Ada penugasan ganda.";
    seen.add(key);
  }

  return null;
}

/** Validasi nama lengkap dan NOID (aturan sama dengan fungsi admin_update_user di database). */
export function validateUserProfile(fullName: string, employeeNo: string) {
  const name = normalizeName(fullName);

  if (name.length < 2 || name.length > 120) return "Nama lengkap harus 2–120 karakter.";
  if (employeeNo.trim().length > 30) return "NOID maksimal 30 karakter.";

  return null;
}

type DbError = { code?: string; message?: string } | null | undefined;

/** Terjemahkan galat database/fungsi admin menjadi pesan pengguna; galat tak dikenal dibuat generik. */
export function mapUserDbError(error: DbError) {
  const message = error?.message ?? "";

  switch (error?.code) {
    case "42501":
      return "Anda tidak berwenang melakukan ini.";
    case "23505":
      if (message.includes("employee_no")) return "NOID sudah dipakai pengguna lain.";
      return "Ada penugasan ganda.";
    case "23503":
      return "Unit atau jabatan tidak ditemukan.";
    case "23502":
      return "Data tidak lengkap.";
    case "22P02":
      return "Data tidak valid.";
    case "P0001":
      return message || "Terjadi kesalahan. Coba lagi.";
    default:
      return "Terjadi kesalahan. Coba lagi.";
  }
}
