"use server";

import { revalidatePath } from "next/cache";

import { getSessionState } from "@/lib/auth/session";
import {
  UUID_PATTERN,
  mapOrgDbError,
  normalizeName,
  validateOrgInput,
  validatePositionName,
} from "@/lib/org-validation";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

type DbKind = "grup" | "unit" | "departemen" | "divisi";

/** Jenis anak yang boleh dibuat di bawah tiap jenis induk (ditentukan di SERVER, bukan dipercaya dari klien). */
const CHILD_OF: Record<DbKind, DbKind> = {
  grup: "unit",
  unit: "departemen",
  departemen: "divisi",
  divisi: "divisi",
};

const fail = (error: string): ActionResult => ({ ok: false, error });
const NOT_FOUND = "Data tidak ditemukan atau Anda tidak berwenang.";

/**
 * Server Action adalah endpoint publik: setiap aksi memeriksa sendiri bahwa
 * pemanggilnya Super Admin. RLS di database adalah lapisan kedua.
 */
async function adminClient() {
  const session = await getSessionState();

  if (session.status !== "ok" || session.user.role !== "super_admin") return null;

  return createClient();
}

export async function addOrgNodeAction(parentId: string, name: string, code: string): Promise<ActionResult> {
  const supabase = await adminClient();

  if (!supabase) return fail("Anda tidak berwenang melakukan ini.");
  if (!UUID_PATTERN.test(parentId)) return fail("Data tidak valid.");

  const { data: parent, error: parentError } = await supabase
    .from("org_nodes")
    .select("id, kind, is_active")
    .eq("id", parentId)
    .maybeSingle();

  if (parentError) return fail(mapOrgDbError(parentError));
  if (!parent) return fail("Induk tidak ditemukan.");
  if (!parent.is_active) return fail("Aktifkan induknya terlebih dahulu.");

  const kind = CHILD_OF[parent.kind as DbKind];
  const needsCode = kind === "unit" || kind === "departemen";
  const problem = validateOrgInput(name, code, needsCode);

  if (problem) return fail(problem);

  const { data: last } = await supabase
    .from("org_nodes")
    .select("sort_order")
    .eq("parent_id", parentId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("org_nodes").insert({
    parent_id: parentId,
    kind,
    name: normalizeName(name),
    code: needsCode && code.trim() ? code.trim() : null,
    sort_order: (last?.sort_order ?? 0) + 1,
  });

  if (error) return fail(mapOrgDbError(error));

  // TODO: catat ke audit_logs (tabel dibuat di tahap audit) — aktor, aksi "Buat", objek Organisasi.
  revalidatePath("/organization");

  return { ok: true };
}

export async function renameOrgNodeAction(id: string, name: string, code: string): Promise<ActionResult> {
  const supabase = await adminClient();

  if (!supabase) return fail("Anda tidak berwenang melakukan ini.");
  if (!UUID_PATTERN.test(id)) return fail("Data tidak valid.");

  const { data: node, error: readError } = await supabase.from("org_nodes").select("id, kind").eq("id", id).maybeSingle();

  if (readError) return fail(mapOrgDbError(readError));
  if (!node) return fail(NOT_FOUND);

  const needsCode = node.kind === "unit" || node.kind === "departemen";
  const problem = validateOrgInput(name, code, needsCode);

  if (problem) return fail(problem);

  const patch: { name: string; code?: string | null } = { name: normalizeName(name) };

  if (needsCode) patch.code = code.trim() || null;

  // .select("id") agar pembaruan yang diam-diam ditolak RLS (0 baris) terdeteksi.
  const { data, error } = await supabase.from("org_nodes").update(patch).eq("id", id).select("id");

  if (error) return fail(mapOrgDbError(error));
  if (!data || data.length === 0) return fail(NOT_FOUND);

  revalidatePath("/organization");

  return { ok: true };
}

/** Nonaktifkan/aktifkan. Trigger database menonaktifkan seluruh turunan dan menjaga aturan induk. */
export async function setOrgNodeActiveAction(id: string, active: boolean): Promise<ActionResult> {
  const supabase = await adminClient();

  if (!supabase) return fail("Anda tidak berwenang melakukan ini.");
  if (!UUID_PATTERN.test(id) || typeof active !== "boolean") return fail("Data tidak valid.");

  const { data, error } = await supabase.from("org_nodes").update({ is_active: active }).eq("id", id).select("id");

  if (error) return fail(mapOrgDbError(error));
  if (!data || data.length === 0) return fail(NOT_FOUND);

  revalidatePath("/organization");

  return { ok: true };
}

export async function addPositionAction(name: string): Promise<ActionResult> {
  const supabase = await adminClient();

  if (!supabase) return fail("Anda tidak berwenang melakukan ini.");

  const problem = validatePositionName(name);

  if (problem) return fail(problem);

  const { error } = await supabase.from("positions").insert({ name: normalizeName(name) });

  if (error) return fail(mapOrgDbError(error));

  revalidatePath("/organization");

  return { ok: true };
}

/** Jabatan yang masih dipakai penugasan ditolak database (FK restrict) → pesan jelas. */
export async function removePositionAction(id: string): Promise<ActionResult> {
  const supabase = await adminClient();

  if (!supabase) return fail("Anda tidak berwenang melakukan ini.");
  if (!UUID_PATTERN.test(id)) return fail("Data tidak valid.");

  const { data, error } = await supabase.from("positions").delete().eq("id", id).select("id");

  if (error) return fail(mapOrgDbError(error));
  if (!data || data.length === 0) return fail(NOT_FOUND);

  revalidatePath("/organization");

  return { ok: true };
}
