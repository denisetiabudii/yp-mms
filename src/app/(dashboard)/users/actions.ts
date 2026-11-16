"use server";

import { revalidatePath } from "next/cache";

import { isAppRole } from "@/lib/auth/roles";
import { getSessionState } from "@/lib/auth/session";
import { UUID_PATTERN, normalizeName } from "@/lib/org-validation";
import { createClient } from "@/lib/supabase/server";
import {
  mapUserDbError,
  validateAssignmentItems,
  validateUserProfile,
  type AssignmentItem,
} from "@/lib/users-db";

export type ActionResult = { ok: true } | { ok: false; error: string };

const fail = (error: string): ActionResult => ({ ok: false, error });
const NOT_ALLOWED = "Anda tidak berwenang melakukan ini.";

/**
 * Server Action adalah endpoint publik: tiap aksi memastikan pemanggil Super Admin.
 * Perubahan sebenarnya dilakukan lewat fungsi database (SECURITY DEFINER) yang
 * memeriksa ulang hak akses dan menjaga aturan "minimal satu Super Admin aktif".
 */
async function adminContext() {
  const session = await getSessionState();

  if (session.status !== "ok" || session.user.role !== "super_admin") return null;

  return { supabase: await createClient(), selfId: session.user.id };
}

function refresh() {
  revalidatePath("/users");
  revalidatePath("/organization"); // jumlah anggota per unit ikut berubah
}

export async function updateUserRoleAction(userId: string, role: string): Promise<ActionResult> {
  const ctx = await adminContext();

  if (!ctx) return fail(NOT_ALLOWED);
  if (!UUID_PATTERN.test(userId) || !isAppRole(role)) return fail("Data tidak valid.");
  // Mencegah mengunci diri sendiri secara tidak sengaja.
  if (userId === ctx.selfId) return fail("Anda tidak dapat mengubah role akun sendiri.");

  const { error } = await ctx.supabase.rpc("admin_set_user_role", { p_user: userId, p_role: role });

  if (error) return fail(mapUserDbError(error));

  // TODO: catat ke audit_logs (aktor, aksi "Ubah role", sebelum → sesudah) saat tabel audit tersedia.
  refresh();

  return { ok: true };
}

export async function setUserActiveAction(userId: string, active: boolean): Promise<ActionResult> {
  const ctx = await adminContext();

  if (!ctx) return fail(NOT_ALLOWED);
  if (!UUID_PATTERN.test(userId) || typeof active !== "boolean") return fail("Data tidak valid.");
  if (userId === ctx.selfId && !active) return fail("Anda tidak dapat menonaktifkan akun sendiri.");

  const { error } = await ctx.supabase.rpc("admin_set_user_active", { p_user: userId, p_active: active });

  if (error) return fail(mapUserDbError(error));

  // Akun nonaktif langsung ditolak di login dan di layout dashboard (profil is_active = false).
  refresh();

  return { ok: true };
}

export async function updateUserProfileAction(userId: string, fullName: string, employeeNo: string): Promise<ActionResult> {
  const ctx = await adminContext();

  if (!ctx) return fail(NOT_ALLOWED);
  if (!UUID_PATTERN.test(userId)) return fail("Data tidak valid.");

  const problem = validateUserProfile(fullName, employeeNo);

  if (problem) return fail(problem);

  const { error } = await ctx.supabase.rpc("admin_update_user", {
    p_user: userId,
    p_full_name: normalizeName(fullName),
    p_employee_no: employeeNo.trim() || null,
  });

  if (error) return fail(mapUserDbError(error));

  refresh();
  revalidatePath("/", "layout"); // nama di header bila yang diubah adalah akun yang sedang login

  return { ok: true };
}

export async function setUserAssignmentsAction(userId: string, items: AssignmentItem[]): Promise<ActionResult> {
  const ctx = await adminContext();

  if (!ctx) return fail(NOT_ALLOWED);
  if (!UUID_PATTERN.test(userId)) return fail("Data tidak valid.");

  const problem = validateAssignmentItems(items);

  if (problem) return fail(problem);

  // Hanya dua field yang diteruskan (bukan objek mentah dari klien).
  const clean = items.map((item) => ({ org_node_id: item.org_node_id, position_id: item.position_id }));
  const { error } = await ctx.supabase.rpc("admin_set_user_assignments", { p_user: userId, p_items: clean });

  if (error) return fail(mapUserDbError(error));

  refresh();

  return { ok: true };
}
