/**
 * Tipe dan data contoh Audit Log (FR-016, PRD bagian 15):
 * aktor, aktivitas, objek, waktu, dan perubahan penting.
 */

export const AUDIT_ACTIONS = [
  "Masuk",
  "Masuk gagal",
  "Keluar",
  "Buat",
  "Ubah",
  "Ajukan",
  "Setujui",
  "Minta revisi",
  "Verifikasi",
  "Undang",
  "Ubah role",
  "Nonaktifkan",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_OBJECTS = [
  "Akun",
  "Pengguna",
  "Organisasi",
  "Rapat",
  "Notulen",
  "Keputusan",
  "Action item",
] as const;
export type AuditObject = (typeof AUDIT_OBJECTS)[number];

export type AuditChange = { field: string; before?: string; after?: string };

export type AuditEvent = {
  id: string;
  /** ISO 8601. */
  at: string;
  actor: string;
  action: AuditAction;
  objectType: AuditObject;
  objectLabel: string;
  summary: string;
  changes?: AuditChange[];
  /** Alamat contoh dari blok dokumentasi RFC 5737. */
  ip?: string;
};

export const AUDIT_EVENTS: AuditEvent[] = [
  { id: "a14", at: "2026-11-11T08:30:00+07:00", actor: "Nurul Hidayah", action: "Masuk", objectType: "Akun", objectLabel: "nurul.hidayah@contoh.org", summary: "Berhasil masuk.", ip: "203.0.113.24" },
  { id: "a13", at: "2026-11-11T08:05:00+07:00", actor: "Administrator Sistem", action: "Masuk", objectType: "Akun", objectLabel: "admin@contoh.org", summary: "Berhasil masuk.", ip: "203.0.113.10" },
  { id: "a12", at: "2026-11-10T21:12:00+07:00", actor: "(tidak dikenal)", action: "Masuk gagal", objectType: "Akun", objectLabel: "budi.santoso@contoh.org", summary: "Kata sandi salah (3 kali berturut-turut).", ip: "198.51.100.77" },
  { id: "a11", at: "2026-11-08T14:00:00+07:00", actor: "Hasan Basri", action: "Ajukan", objectType: "Action item", objectLabel: "AI-004 Menyusun rencana pemanfaatan lahan produktif", summary: "Diajukan untuk verifikasi.", changes: [{ field: "Status", before: "Berjalan", after: "Menunggu verifikasi" }, { field: "Progres", before: "70%", after: "100%" }], ip: "203.0.113.31" },
  { id: "a10", at: "2026-11-08T10:00:00+07:00", actor: "Budi Santoso", action: "Ubah", objectType: "Action item", objectLabel: "AI-001 Menyusun rincian dampak pergeseran anggaran", summary: "Progres diperbarui.", changes: [{ field: "Progres", before: "30%", after: "60%" }], ip: "203.0.113.18" },
  { id: "a09", at: "2026-11-06T09:15:00+07:00", actor: "Nurul Hidayah", action: "Ajukan", objectType: "Notulen", objectLabel: "Evaluasi Anggaran Kuartal IV (YP/LAZ/KEU/004/XI/2026)", summary: "Notulen versi 1 diajukan untuk review.", changes: [{ field: "Status", before: "Draft", after: "Menunggu Review" }], ip: "203.0.113.24" },
  { id: "a08", at: "2026-11-05T16:00:00+07:00", actor: "Ahmad Fauzi", action: "Buat", objectType: "Action item", objectLabel: "AI-001 Menyusun rincian dampak pergeseran anggaran", summary: "Action item dibuat dari keputusan rapat.", ip: "203.0.113.12" },
  { id: "a07", at: "2026-11-03T14:10:00+07:00", actor: "Hasan Basri", action: "Setujui", objectType: "Notulen", objectLabel: "Rapat Pengelolaan Aset Wakaf (YP/WKF/UMUM/002/XI/2026)", summary: "Notulen disetujui dan dikunci.", changes: [{ field: "Status", before: "Menunggu Review", after: "Disetujui" }], ip: "203.0.113.40" },
  { id: "a06", at: "2026-11-02T09:20:00+07:00", actor: "Administrator Sistem", action: "Ubah role", objectType: "Pengguna", objectLabel: "Nurul Hidayah", summary: "Role pengguna diubah.", changes: [{ field: "Role", before: "Staff/Karyawan", after: "Notulis" }], ip: "203.0.113.10" },
  { id: "a05", at: "2026-11-01T10:05:00+07:00", actor: "Administrator Sistem", action: "Undang", objectType: "Pengguna", objectLabel: "yusuf.maulana@contoh.org", summary: "Undangan dikirim.", changes: [{ field: "Role", after: "Direktur/Mudir Unit" }, { field: "Penugasan", after: "RTQ Madinatul Quran — Mudir" }], ip: "203.0.113.10" },
  { id: "a04", at: "2026-10-28T11:00:00+07:00", actor: "Nurul Hidayah", action: "Buat", objectType: "Notulen", objectLabel: "Rapat Evaluasi Semester TKQ (YP/TKQ/UMUM/003/X/2026)", summary: "Draft notulen dibuat.", ip: "203.0.113.24" },
  { id: "a03", at: "2026-10-20T18:00:00+07:00", actor: "Umar Faruq", action: "Ubah", objectType: "Rapat", objectLabel: "Rapat Kepanitiaan Peringatan Hari Besar", summary: "Rapat dibatalkan.", changes: [{ field: "Status", before: "Dijadwalkan", after: "Dibatalkan" }], ip: "203.0.113.55" },
  { id: "a02", at: "2026-09-12T10:30:00+07:00", actor: "Administrator Sistem", action: "Nonaktifkan", objectType: "Pengguna", objectLabel: "Umar Faruq", summary: "Akun dinonaktifkan.", changes: [{ field: "Status", before: "Aktif", after: "Nonaktif" }], ip: "203.0.113.10" },
  { id: "a01", at: "2026-09-01T09:00:00+07:00", actor: "Administrator Sistem", action: "Buat", objectType: "Organisasi", objectLabel: "Fundraising Digital", summary: "Divisi ditambahkan di bawah Fundraising.", ip: "203.0.113.10" },
];

/**
 * Menetralkan sel CSV agar tidak dieksekusi sebagai rumus di Excel/Sheets
 * (CSV injection): sel yang diawali = + - @ diberi awalan apostrof.
 */
export function csvCell(value: string) {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;

  return `"${safe.replace(/"/g, '""')}"`;
}