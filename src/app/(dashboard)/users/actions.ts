"use server";

import { revalidatePath } from "next/cache";

import { isAppRole } from "@/lib/auth/roles";
import { getSessionState } from "@/lib/auth/session";
import { UUID_PATTERN, normalizeName } from "@/lib/org-validation";
import { createClient } from "@/lib/supabase/server";
import {
  mapUserDbError,
  validateAssignmentItems,
  validateDeleteConfirmation,
  validateUserProfile,
  type AssignmentItem,
  type UserRow,
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

  // Ambil penugasan yang sudah tersimpan untuk membedakan data lama dan penugasan baru.
  const { data: existingAssignments, error: existingError } = await ctx.supabase
    .from("user_assignments")
    .select("org_node_id, position_id")
    .eq("user_id", userId);

  if (existingError) return fail(mapUserDbError(existingError));

  const existingKeys = new Set(
    (existingAssignments ?? []).map(
      (item) => `${item.org_node_id}|${item.position_id}`,
    ),
  );

  // Hanya pasangan baru yang wajib memakai unit dan jabatan aktif.
  const clean = items.map((item) => ({
    org_node_id: item.org_node_id,
    position_id: item.position_id,
  }));

  const newItems = clean.filter(
    (item) => !existingKeys.has(`${item.org_node_id}|${item.position_id}`),
  );

  if (newItems.length > 0) {
    const nodeIds = [...new Set(newItems.map((item) => item.org_node_id))];
    const positionIds = [...new Set(newItems.map((item) => item.position_id))];

    const [nodesResult, positionsResult] = await Promise.all([
      ctx.supabase
        .from("org_nodes")
        .select("id")
        .in("id", nodeIds)
        .eq("is_active", true),
      ctx.supabase
        .from("positions")
        .select("id")
        .in("id", positionIds)
        .eq("is_active", true),
    ]);

    if (nodesResult.error) return fail(mapUserDbError(nodesResult.error));
    if (positionsResult.error) return fail(mapUserDbError(positionsResult.error));

    if ((nodesResult.data ?? []).length !== nodeIds.length) {
      return fail("Unit atau departemen tidak ditemukan atau sudah nonaktif.");
    }

    if ((positionsResult.data ?? []).length !== positionIds.length) {
      return fail("Jabatan tidak ditemukan atau sudah nonaktif.");
    }
  }

  const { error } = await ctx.supabase.rpc("admin_set_user_assignments", {
    p_user: userId,
    p_items: clean,
  });

  if (error) return fail(mapUserDbError(error));

  refresh();

  return { ok: true };
}

/**
 * Hapus akun PERMANEN (tanpa perlu DBA). Pengamannya berlapis:
 *  - hanya Super Admin, dan tidak bisa menghapus akun sendiri;
 *  - konfirmasi (ketik email akun) diperiksa di SERVER terhadap data asli, bukan dipercaya dari klien;
 *  - database menolak menghapus Super Admin aktif terakhir dan akun yang punya riwayat
 *    (rapat/notulen/tugas, FK RESTRICT) agar riwayat tidak hilang: untuk itu pakai Nonaktifkan;
 *  - penghapusan dicatat di audit log pada transaksi yang sama (gagal hapus = tidak ada catatan palsu).
 */
export async function deleteUserAction(userId: string, typedConfirmation: string): Promise<ActionResult> {
  const ctx = await adminContext();

  if (!ctx) return fail(NOT_ALLOWED);
  if (!UUID_PATTERN.test(userId) || typeof typedConfirmation !== "string") return fail("Data tidak valid.");
  if (userId === ctx.selfId) return fail("Anda tidak dapat menghapus akun sendiri.");

  const { data, error: listError } = await ctx.supabase.rpc("admin_list_users");

  if (listError) return fail(mapUserDbError(listError));

  const user = ((data ?? []) as UserRow[]).find((row) => row.id === userId);

  if (!user) return fail("Pengguna tidak ditemukan.");

  if (!validateDeleteConfirmation(user.email || user.full_name, typedConfirmation)) {
    return fail("Konfirmasi tidak cocok. Ketik email akun persis seperti yang tertera.");
  }

  const { error } = await ctx.supabase.rpc("admin_delete_user", { p_user: userId });

  if (error) return fail(mapUserDbError(error, "delete"));

  refresh();

  return { ok: true };
}
