import type { ReactNode } from "react";

import { RoleGate } from "@/components/auth/role-gate";

// PRD bagian 13: Administrasi dan Audit Log untuk admin berwenang.
// Tambahkan role lain (mis. auditor) di sini bila diperlukan.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <RoleGate roles={["super_admin"]}>{children}</RoleGate>;
}
