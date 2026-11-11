/**
 * Tipe dan data contoh modul Pengguna (FR-003).
 * Penugasan dibuat many-to-many (PRD bagian 6): satu pengguna bisa punya
 * lebih dari satu unit/departemen/jabatan.
 */

import type { AppRole } from "@/lib/auth/roles";
import { DEPARTMENTS, UNITS } from "@/lib/meetings";

export const USER_STATUSES = ["Aktif", "Diundang", "Nonaktif"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export type Assignment = {
  /** id unit, atau "grup" untuk penugasan tingkat grup. */
  unitId: string;
  departmentId?: string;
  position: string;
};

export type UserRecord = {
  id: string;
  name: string;
  email: string;
  employeeNo?: string;
  role: AppRole;
  assignments: Assignment[];
  status: UserStatus;
  /** ISO 8601. */
  lastLogin?: string;
};

export const GROUP_ID = "grup";

export function unitLabel(unitId: string) {
  return unitId === GROUP_ID
    ? "Yuk Peduli Grup"
    : (UNITS.find((unit) => unit.id === unitId)?.name ?? unitId);
}

export function departmentLabel(departmentId?: string) {
  return DEPARTMENTS.find((department) => department.id === departmentId)?.name;
}

export const USERS: UserRecord[] = [
  { id: "usr-01", name: "Administrator Sistem", email: "admin@contoh.org", role: "super_admin", assignments: [{ unitId: GROUP_ID, position: "Staff" }], status: "Aktif", lastLogin: "2026-11-11T08:05:00+07:00" },
  { id: "usr-02", name: "Hj. Aisyah Rahman", email: "ceo@contoh.org", employeeNo: "YP-0001", role: "ceo", assignments: [{ unitId: GROUP_ID, position: "CEO" }], status: "Aktif", lastLogin: "2026-11-10T16:40:00+07:00" },
  { id: "usr-03", name: "Ahmad Fauzi", email: "ahmad.fauzi@contoh.org", employeeNo: "YP-0012", role: "direktur_unit", assignments: [{ unitId: "laz", position: "Direktur" }], status: "Aktif", lastLogin: "2026-11-11T07:50:00+07:00" },
  { id: "usr-04", name: "Siti Rahmawati", email: "siti.rahmawati@contoh.org", employeeNo: "YP-0023", role: "manager", assignments: [{ unitId: "laz", departmentId: "laz-program", position: "Manager" }], status: "Aktif", lastLogin: "2026-11-10T13:15:00+07:00" },
  { id: "usr-05", name: "Budi Santoso", email: "budi.santoso@contoh.org", employeeNo: "YP-0027", role: "manager", assignments: [{ unitId: "laz", departmentId: "laz-keuangan", position: "Manager" }], status: "Aktif", lastLogin: "2026-11-09T09:30:00+07:00" },
  { id: "usr-06", name: "Dewi Lestari", email: "dewi.lestari@contoh.org", employeeNo: "YP-0031", role: "kepala_divisi", assignments: [{ unitId: "laz", departmentId: "laz-crm", position: "Kepala Divisi" }], status: "Aktif", lastLogin: "2026-11-08T11:00:00+07:00" },
  { id: "usr-07", name: "Rizky Pratama", email: "rizky.pratama@contoh.org", employeeNo: "YP-0045", role: "staff", assignments: [{ unitId: "laz", departmentId: "laz-fundraising", position: "Staff" }], status: "Aktif", lastLogin: "2026-11-10T10:20:00+07:00" },
  { id: "usr-08", name: "Nurul Hidayah", email: "nurul.hidayah@contoh.org", employeeNo: "YP-0048", role: "notulis", assignments: [{ unitId: "laz", departmentId: "laz-program", position: "Notulis" }, { unitId: "wakaf", position: "Notulis" }], status: "Aktif", lastLogin: "2026-11-11T08:30:00+07:00" },
  { id: "usr-09", name: "Hasan Basri", email: "hasan.basri@contoh.org", employeeNo: "YP-0015", role: "direktur_unit", assignments: [{ unitId: "wakaf", position: "Mudir" }], status: "Aktif", lastLogin: "2026-11-07T14:45:00+07:00" },
  { id: "usr-10", name: "Fatimah Azzahra", email: "fatimah.azzahra@contoh.org", employeeNo: "YP-0052", role: "direktur_unit", assignments: [{ unitId: "tkq", position: "Mudir" }], status: "Aktif", lastLogin: "2026-10-30T09:00:00+07:00" },
  { id: "usr-11", name: "Yusuf Maulana", email: "yusuf.maulana@contoh.org", role: "direktur_unit", assignments: [{ unitId: "rtq", position: "Mudir" }], status: "Diundang" },
  { id: "usr-12", name: "Umar Faruq", email: "umar.faruq@contoh.org", employeeNo: "YP-0060", role: "kepala_divisi", assignments: [{ unitId: "masjid", position: "Koordinator" }], status: "Nonaktif", lastLogin: "2026-09-12T10:10:00+07:00" },
];