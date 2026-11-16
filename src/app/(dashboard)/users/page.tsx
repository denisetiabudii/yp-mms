import { isAppRole, type AppRole } from "@/lib/auth/roles";
import { getSessionState } from "@/lib/auth/session";
import type { OrgRow } from "@/lib/organization";
import { createClient } from "@/lib/supabase/server";
import { buildNodeOptions, deriveUserStatus, type UserRow } from "@/lib/users-db";

import { UsersView, type UserVM } from "./users-view";

export default async function UsersPage() {
  const session = await getSessionState();
  const supabase = await createClient();

  // admin_list_users() hanya mau dijalankan Super Admin (dicek di database); layout.tsx juga membatasi halaman ini.
  const [users, nodes, positions, assignments] = await Promise.all([
    supabase.rpc("admin_list_users"),
    supabase.from("org_nodes").select("id, parent_id, kind, name, code, is_active, sort_order"),
    supabase.from("positions").select("id, name, is_active").order("name"),
    supabase.from("user_assignments").select("user_id, org_node_id, position_id"),
  ]);

  const failed = [users, nodes, positions, assignments].find((result) => result.error);

  // Dilempar ke error.tsx (pesan teknis tidak ditampilkan ke pengguna).
  if (failed?.error) throw new Error(`Gagal memuat pengguna: ${failed.error.code ?? failed.error.message}`);

  const byUser = new Map<string, { orgNodeId: string; positionId: string }[]>();

  ((assignments.data ?? []) as { user_id: string; org_node_id: string; position_id: string }[]).forEach((a) =>
    byUser.set(a.user_id, [...(byUser.get(a.user_id) ?? []), { orgNodeId: a.org_node_id, positionId: a.position_id }]),
  );

  const rows = (users.data ?? []) as UserRow[];

  const vm: UserVM[] = rows.map((row) => ({
    id: row.id,
    name: row.full_name,
    email: row.email ?? "",
    employeeNo: row.employee_no ?? "",
    role: (isAppRole(row.role) ? row.role : "staff") as AppRole,
    status: deriveUserStatus(row),
    lastLogin: row.last_sign_in_at,
    assignments: byUser.get(row.id) ?? [],
  }));

  return (
    <UsersView
      users={vm}
      nodeOptions={buildNodeOptions((nodes.data ?? []) as OrgRow[])}
      positions={((positions.data ?? []) as { id: string; name: string; is_active: boolean }[]).map((p) => ({
        id: p.id,
        name: p.name,
        active: p.is_active,
      }))}
      selfId={session.status === "ok" ? session.user.id : ""}
    />
  );
}
