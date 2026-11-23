"use server";

import { revalidatePath } from "next/cache";

import { getSessionState } from "@/lib/auth/session";
import { UUID_PATTERN, normalizeName } from "@/lib/org-validation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  deriveUserStatus,
  mapInviteError,
  mapUserDbError,
  normalizeEmail,
  validateInviteFields,
  type InviteField,
  type InviteInput,
  type UserRow,
} from "@/lib/users-db";

/** `field` memberi tahu formulir kolom mana yang harus ditandai dan difokuskan. */
export type InviteResult = { ok: true; warning?: string } | { ok: false; error: string; field?: InviteField };

const fail = (error: string, field?: InviteField): InviteResult => ({ ok: false, error, field });

/** Urutan kolom di formulir: pesan pertama yang dikembalikan adalah kolom paling atas yang salah. */
const FIELD_ORDER: InviteField[] = ["fullName", "email", "employeeNo", "role", "items"];
const NOT_ALLOWED = "Anda tidak berwenang melakukan ini.";
const NOT_CONFIGURED = "Fitur undangan belum aktif: kunci server Supabase belum diatur (SUPABASE_SECRET_KEY).";

async function requireSuperAdmin() {
  const session = await getSessionState();

  return session.status === "ok" && session.user.role === "super_admin";
}

/**
 * Undang pengguna baru lewat email.
 * 1) Undangan dikirim memakai kunci rahasia (hanya di server).
 * 2) Role, nama/NOID, dan penugasan ditetapkan lewat fungsi database memakai SESI Super Admin
 *    (role TIDAK dikirim lewat metadata undangan karena metadata bisa dimanipulasi pengguna).
 * Bila langkah 2 gagal setelah undangan terkirim, hasilnya ok dengan peringatan: akun sudah ada dan
 * dapat dilengkapi dari halaman Pengguna.
 */
export async function inviteUserAction(input: InviteInput): Promise<InviteResult> {
  if (!(await requireSuperAdmin())) return fail(NOT_ALLOWED);

  const fieldErrors = validateInviteFields(input);
  const badField = FIELD_ORDER.find((field) => fieldErrors[field]);

  if (badField) return fail(fieldErrors[badField] as string, badField);

  const admin = createAdminClient();

  if (!admin) return fail(NOT_CONFIGURED);

  const supabase = await createClient();
  const email = normalizeEmail(input.email);
  const fullName = normalizeName(input.fullName);

  // Pra-cek duplikat agar pesannya jelas (Supabase tetap menolak bila lolos).
  const { data: existing, error: listError } = await supabase.rpc("admin_list_users");

  if (listError) return fail(mapUserDbError(listError));
  if (((existing ?? []) as UserRow[]).some((user) => (user.email ?? "").toLowerCase() === email)) {
    return fail(
      "Email ini sudah terdaftar. Cari akun tersebut di daftar Pengguna; bila statusnya Diundang, gunakan tombol Kirim ulang.",
      "email",
    );
  }

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { data: { full_name: fullName } });

  if (error || !data?.user) {
    console.error("[undang] gagal:", error?.code ?? error?.status ?? "tanpa kode");

    // Galat email (mis. kuota habis, alamat ditolak) ditempelkan ke kolom email agar langsung terlihat.
    return fail(mapInviteError(error), "email");
  }

  const userId = data.user.id;
  const problems: string[] = [];

  const steps: [string, () => PromiseLike<{ error: { code?: string; message?: string } | null }>][] = [
    ["nama/NOID", () => supabase.rpc("admin_update_user", { p_user: userId, p_full_name: fullName, p_employee_no: input.employeeNo.trim() || null })],
    ["role", () => supabase.rpc("admin_set_user_role", { p_user: userId, p_role: input.role })],
    ["penugasan", () =>
      supabase.rpc("admin_set_user_assignments", {
        p_user: userId,
        p_items: input.items.map((item) => ({ org_node_id: item.org_node_id, position_id: item.position_id })),
      })],
  ];

  for (const [label, step] of steps) {
    const { error: stepError } = await step();

    if (stepError) problems.push(`${label} gagal (${mapUserDbError(stepError)})`);
  }

  // Catat di audit log (fungsi database memeriksa Super Admin dan menulis jejak yang tidak bisa dipalsukan).
  const { error: auditError } = await supabase.rpc("admin_log_invite", {
    p_email: email,
    p_full_name: fullName,
    p_role: input.role,
    p_resend: false,
  });

  if (auditError) {
    console.error("[undang] audit gagal:", auditError.code ?? "tanpa kode");
    problems.push("pencatatan audit gagal");
  }

  revalidatePath("/users");
  revalidatePath("/organization");

  return problems.length > 0
    ? { ok: true, warning: `Undangan terkirim, tetapi ${problems.join("; ")}. Lengkapi dari halaman Pengguna.` }
    : { ok: true };
}

/**
 * Kirim ulang undangan untuk pengguna berstatus Diundang (belum membuat kata sandi).
 * Teruji: setiap permintaan benar-benar mengirim email baru. Karena itu antarmuka memberi jeda
 * 30 detik per pengguna, dan kuota email Supabase (SMTP bawaan) tetap perlu diperhatikan.
 */
export async function resendInviteAction(userId: string): Promise<InviteResult> {
  if (!(await requireSuperAdmin())) return fail(NOT_ALLOWED);
  if (!UUID_PATTERN.test(userId)) return fail("Data tidak valid.");

  const admin = createAdminClient();

  if (!admin) return fail(NOT_CONFIGURED);

  const supabase = await createClient();
  const { data, error: listError } = await supabase.rpc("admin_list_users");

  if (listError) return fail(mapUserDbError(listError));

  const user = ((data ?? []) as UserRow[]).find((row) => row.id === userId);

  if (!user || !user.email) return fail("Pengguna tidak ditemukan.");
  if (deriveUserStatus(user) !== "Diundang") return fail("Hanya pengguna berstatus Diundang yang bisa dikirimi ulang.");

  const { error } = await admin.auth.admin.inviteUserByEmail(user.email, { data: { full_name: user.full_name } });

  if (error) {
    console.error("[kirim ulang undangan] gagal:", error.code ?? error.status ?? "tanpa kode");

    return fail(mapInviteError(error, true));
  }

  const { error: auditError } = await supabase.rpc("admin_log_invite", {
    p_email: user.email,
    p_full_name: user.full_name,
    p_role: user.role,
    p_resend: true,
  });

  if (auditError) console.error("[kirim ulang undangan] audit gagal:", auditError.code ?? "tanpa kode");

  return { ok: true };
}
