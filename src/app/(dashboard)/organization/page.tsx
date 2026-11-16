import { buildOrgTree, computeMemberCounts, type OrgRow } from "@/lib/organization";
import { createClient } from "@/lib/supabase/server";

import { OrganizationView } from "./organization-view";

export default async function OrganizationPage() {
  const supabase = await createClient();

  // RLS: semua pengguna login boleh membaca struktur; halaman ini dibatasi Super Admin oleh layout.tsx.
  // CATATAN: PostgREST membatasi 1000 baris per permintaan. Bila penugasan melebihi itu,
  // pindahkan penghitungan anggota ke SQL (view/fungsi) agar tetap akurat.
  const [nodes, positions, assignments, activeProfiles] = await Promise.all([
    supabase.from("org_nodes").select("id, parent_id, kind, name, code, is_active, sort_order"),
    supabase.from("positions").select("id, name").order("name"),
    supabase.from("user_assignments").select("user_id, org_node_id, position_id"),
    supabase.from("profiles").select("id").eq("is_active", true),
  ]);

  const failed = [nodes, positions, assignments, activeProfiles].find((result) => result.error);

  // Dilempar ke error.tsx (pesan teknis tidak ditampilkan ke pengguna).
  if (failed?.error) throw new Error(`Gagal memuat organisasi: ${failed.error.code ?? failed.error.message}`);

  const rows = (nodes.data ?? []) as OrgRow[];
  const tree = buildOrgTree(rows);

  if (!tree) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="text-xl font-bold text-slate-800">Data organisasi belum tersedia</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Struktur awal belum disemai. Jalankan migrasi <span className="font-mono">20261112000000_org_structure.sql</span> di
          Supabase.
        </p>
      </div>
    );
  }

  const assignmentRows = (assignments.data ?? []) as { user_id: string; org_node_id: string; position_id: string }[];
  const activeIds = new Set<string>((activeProfiles.data ?? []).map((p: { id: string }) => p.id));
  const memberCounts = computeMemberCounts(rows, assignmentRows, activeIds);

  const used = new Map<string, number>();

  assignmentRows.forEach((a) => used.set(a.position_id, (used.get(a.position_id) ?? 0) + 1));

  const positionRows = ((positions.data ?? []) as { id: string; name: string }[]).map((p) => ({
    id: p.id,
    name: p.name,
    used: used.get(p.id) ?? 0,
  }));

  return <OrganizationView tree={tree} positions={positionRows} memberCounts={memberCounts} />;
}
