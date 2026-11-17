import type { OrgRow } from "@/lib/organization";
import { isAdminClientConfigured } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { buildNodeOptions } from "@/lib/users-db";

import { InviteForm } from "./invite-form";

export default async function InviteUserPage() {
  const supabase = await createClient();

  const [nodes, positions] = await Promise.all([
    supabase.from("org_nodes").select("id, parent_id, kind, name, code, is_active, sort_order"),
    supabase.from("positions").select("id, name, is_active").eq("is_active", true).order("name"),
  ]);

  const failed = [nodes, positions].find((result) => result.error);

  // Dilempar ke error.tsx (pesan teknis tidak ditampilkan ke pengguna).
  if (failed?.error) throw new Error(`Gagal memuat pilihan undangan: ${failed.error.code ?? failed.error.message}`);

  return (
    <InviteForm
      // Hanya node aktif yang boleh dipilih untuk penugasan baru.
      nodes={buildNodeOptions((nodes.data ?? []) as OrgRow[]).filter((n) => n.active)}
      positions={((positions.data ?? []) as { id: string; name: string }[]).map((p) => ({ id: p.id, name: p.name }))}
      configured={isAdminClientConfigured()}
    />
  );
}
