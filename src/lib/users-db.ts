/**
 * Logika murni untuk halaman Pengguna yang tersambung database.
 * Dipakai di server (Server Action memvalidasi ulang) dan klien (umpan balik cepat).
 */

import { isAppRole } from "@/lib/auth/roles";
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
  /** Sudah membuat kata sandi? (mengklik tautan undangan saja belum cukup) */
  password_set: boolean;
};

export type UserStatus = "Aktif" | "Diundang" | "Nonaktif";

/**
 * Nonaktif > Diundang > Aktif.
 * "Diundang" = diundang tetapi BELUM membuat kata sandi. Mengklik tautan undangan sudah
 * membuat sesi login, jadi "pernah masuk" tidak bisa dipakai sebagai tanda akun sudah aktif.
 */
export function deriveUserStatus(row: Pick<UserRow, "is_active" | "invited_at" | "password_set">): UserStatus {
  if (!row.is_active) return "Nonaktif";
  if (row.invited_at && !row.password_set) return "Diundang";

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

/** Aturan sama dengan fungsi admin_update_user di database. Dipisah per kolom agar kedua pesan bisa tampil sekaligus. */
export function validateFullName(fullName: string) {
  const name = normalizeName(fullName);

  return name.length < 2 || name.length > 120 ? "Nama lengkap harus 2–120 karakter." : null;
}

export function validateEmployeeNo(employeeNo: string) {
  return employeeNo.trim().length > 30 ? "NOID maksimal 30 karakter." : null;
}

/** Pesan pertama (nama dahulu), atau null bila keduanya valid. */
export function validateUserProfile(fullName: string, employeeNo: string) {
  return validateFullName(fullName) ?? validateEmployeeNo(employeeNo);
}

type DbError = { code?: string; message?: string } | null | undefined;

/** Terjemahkan galat database/fungsi admin menjadi pesan pengguna; galat tak dikenal dibuat generik. */
export function mapUserDbError(error: DbError, context?: "delete") {
  const message = error?.message ?? "";

  switch (error?.code) {
    case "42501":
      return "Anda tidak berwenang melakukan ini.";
    case "23505":
      if (message.includes("employee_no")) return "NOID sudah dipakai pengguna lain.";
      return "Ada penugasan ganda.";
    case "23503":
      return context === "delete"
        ? "Akun ini memiliki riwayat (rapat, notulen, atau tugas) sehingga tidak dapat dihapus permanen. Gunakan Nonaktifkan agar riwayatnya tetap utuh."
        : "Unit atau jabatan tidak ditemukan.";
    case "23502":
      return "Data tidak lengkap.";
    case "22P02":
      return "Data tidak valid.";
    case "P0001":
      return message || "Terjadi kesalahan. Coba lagi.";
    case "42883":
      return "Fungsi database belum terpasang. Jalankan migrasi terbaru di Supabase.";
    default:
      return "Terjadi kesalahan. Coba lagi.";
  }
}

/* ------------------------------- Undangan ------------------------------- */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const normalizeEmail = (value: string) => value.trim().toLowerCase();

export type InviteInput = {
  email: string;
  fullName: string;
  employeeNo: string;
  role: string;
  items: AssignmentItem[];
};

export type InviteField = "email" | "fullName" | "employeeNo" | "role" | "items";

/** Kesalahan per kolom (kosong = valid). Menerima nilai apa pun karena data klien tidak dipercaya. */
export function validateInviteFields(input: unknown): Partial<Record<InviteField, string>> {
  const data = input as Partial<InviteInput> | null;
  const errors: Partial<Record<InviteField, string>> = {};

  if (!data || typeof data !== "object") return { email: "Data undangan tidak valid." };

  const email = typeof data.email === "string" ? normalizeEmail(data.email) : "";

  if (typeof data.email !== "string") errors.email = "Data undangan tidak valid.";
  else if (!email) errors.email = "Email wajib diisi. Gunakan email aktif milik pengguna.";
  else if (email.length > 254 || !EMAIL_PATTERN.test(email)) errors.email = "Format email tidak valid. Contoh: nama@perusahaan.org";

  if (typeof data.fullName !== "string") errors.fullName = "Data undangan tidak valid.";
  else {
    const problem = validateFullName(data.fullName);

    if (problem) errors.fullName = problem;
  }

  if (typeof data.employeeNo !== "string") errors.employeeNo = "Data undangan tidak valid.";
  else {
    const problem = validateEmployeeNo(data.employeeNo);

    if (problem) errors.employeeNo = problem;
  }

  if (typeof data.role !== "string" || !isAppRole(data.role)) errors.role = "Pilih role aplikasi.";

  if (!Array.isArray(data.items) || data.items.length === 0) errors.items = "Minimal satu penugasan wajib diisi (unit dan jabatan).";
  else {
    const problem = validateAssignmentItems(data.items);

    if (problem) errors.items = problem;
  }

  return errors;
}

/** Pesan pertama dari validateInviteFields (urutan kolom di formulir), atau null bila valid. */
export function validateInvite(input: unknown): string | null {
  const errors = validateInviteFields(input);
  const order: InviteField[] = ["fullName", "email", "employeeNo", "role", "items"];
  const first = order.find((field) => errors[field]);

  return first ? (errors[first] as string) : null;
}

/** Konfirmasi hapus: pengguna harus mengetik email akun (atau nama bila tanpa email) persis. */
export function validateDeleteConfirmation(expected: string, typed: string) {
  const a = expected.trim().toLowerCase();

  return a.length > 0 && a === typed.trim().toLowerCase();
}

type InviteError = { status?: number; code?: string; message?: string } | null | undefined;

/**
 * Terjemahkan galat Supabase Auth Admin menjadi pesan pengguna. Pesan mentah tidak
 * ditampilkan; galat tak dikenal dibuat generik. `resend` = konteks kirim ulang.
 */
export function mapInviteError(error: InviteError, resend = false) {
  const code = error?.code ?? "";
  const message = (error?.message ?? "").toLowerCase();

  if (code === "email_exists" || code === "user_already_exists" || message.includes("already been registered")) {
    return resend
      ? "Kirim ulang otomatis tidak berhasil untuk akun ini. Kirim ulang lewat Dashboard Supabase (Authentication → Users)."
      : "Email ini sudah terdaftar.";
  }

  if (error?.status === 429 || code.startsWith("over_") || message.includes("rate limit")) {
    return "Batas pengiriman email tercapai. Coba lagi nanti, atau pasang SMTP sendiri di Supabase.";
  }

  if (code === "email_address_invalid" || message.includes("invalid email")) return "Alamat email tidak valid.";

  if (error?.status === 401 || error?.status === 403 || message.includes("invalid api key") || message.includes("not allowed")) {
    return "Kunci server Supabase tidak valid atau tidak berizin. Periksa SUPABASE_SECRET_KEY.";
  }

  return "Gagal mengirim undangan. Coba lagi.";
}
