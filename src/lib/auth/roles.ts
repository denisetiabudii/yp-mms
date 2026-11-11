/** Role aplikasi (PRD bagian 5). Harus sama dengan enum public.app_role di database. */
export const APP_ROLES = [
  "super_admin",
  "ceo",
  "direktur_unit",
  "manager",
  "kepala_divisi",
  "notulis",
  "staff",
  "pimpinan_rapat",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "Super Admin Grup",
  ceo: "CEO Grup",
  direktur_unit: "Direktur/Mudir Unit",
  manager: "Manager",
  kepala_divisi: "Kepala Divisi/Koordinator",
  notulis: "Notulis",
  staff: "Staff/Karyawan",
  pimpinan_rapat: "Pimpinan Rapat",
};

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && (APP_ROLES as readonly string[]).includes(value);
}
