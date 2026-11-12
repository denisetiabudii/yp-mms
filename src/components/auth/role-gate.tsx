import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";

import type { AppRole } from "@/lib/auth/roles";
import { getSessionState } from "@/lib/auth/session";

/**
 * Pembatas akses sisi server untuk halaman administrasi.
 * Dipakai di layout.tsx tiap folder admin. Ini lapisan UI; data sensitif
 * tetap harus dilindungi RLS dan pemeriksaan di Server Action.
 */
export async function RoleGate({
  roles,
  children,
}: {
  roles: readonly AppRole[];
  children: ReactNode;
}) {
  const session = await getSessionState();

  if (session.status !== "ok") redirect("/login");

  if (!roles.includes(session.user.role)) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
          <ShieldAlert className="size-7" />
        </div>
        <h1 className="text-xl font-bold text-slate-800">Akses ditolak</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Halaman ini hanya untuk administrator. Hubungi administrator bila Anda memerlukan akses.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
