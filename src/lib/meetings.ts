/**
 * Tipe, konstanta, dan data dummy modul Rapat (YP-MMS).
 * Semua halaman Rapat memakai file ini supaya status/istilah seragam
 * dan nanti mudah diganti dengan data Supabase.
 *
 * Sumber: PRD v1.0 bagian 6 (struktur organisasi), 8 (FR-004..FR-006),
 * 10 (aturan bisnis), 15.1 (klasifikasi), 20.2 (keputusan terbuka).
 */

/* ------------------------------ Konstanta ------------------------------ */

export const CLASSIFICATIONS = ["Umum", "Internal", "Rahasia"] as const;
export type Classification = (typeof CLASSIFICATIONS)[number];

export const MEETING_STATUSES = [
  "Dijadwalkan",
  "Berlangsung",
  "Selesai",
  "Dibatalkan",
] as const;
export type MeetingStatus = (typeof MEETING_STATUSES)[number];

export const MINUTE_STATUSES = [
  "Belum dibuat",
  "Draft",
  "Menunggu Review",
  "Revisi",
  "Disetujui",
  "Ditolak",
] as const;
export type MinuteStatus = (typeof MINUTE_STATUSES)[number];

/** Keputusan terbuka no. 5 di PRD: daftar status kehadiran. */
export const ATTENDANCE_STATUSES = [
  "Belum konfirmasi",
  "Hadir",
  "Online",
  "Terlambat",
  "Izin",
  "Sakit",
  "Tidak hadir",
] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const MEETING_MODES = ["Luring", "Daring", "Hibrida"] as const;
export type MeetingMode = (typeof MEETING_MODES)[number];

/** FR-019: jenis rapat / template notulen. */
export const MEETING_TYPES = [
  { id: "rutin", name: "Rapat Rutin" },
  { id: "koordinasi", name: "Rapat Koordinasi" },
  { id: "evaluasi", name: "Rapat Evaluasi" },
  { id: "keputusan", name: "Rapat Pengambilan Keputusan" },
  { id: "khusus", name: "Rapat Khusus" },
] as const;

/** Unit/lembaga (PRD bagian 6). Di produksi diambil dari master data. */
export const UNITS = [
  { id: "laz", code: "LAZ", name: "LAZ Yuk Peduli" },
  { id: "wakaf", code: "WKF", name: "Badan Wakaf Yuk Peduli" },
  { id: "tkq", code: "TKQ", name: "TKQ Madinatul Quran" },
  { id: "rtq", code: "RTQ", name: "RTQ Madinatul Quran" },
  { id: "masjid", code: "MSJ", name: "Kemasjidan" },
] as const;

/** Departemen (terutama LAZ). */
export const DEPARTMENTS = [
  { id: "laz-fundraising", unitId: "laz", code: "FND", name: "Fundraising" },
  { id: "laz-program", unitId: "laz", code: "PRG", name: "Program" },
  { id: "laz-keuangan", unitId: "laz", code: "KEU", name: "Keuangan" },
  { id: "laz-crm", unitId: "laz", code: "CRM", name: "CRM" },
  { id: "laz-marketing", unitId: "laz", code: "MKT", name: "Marketing" },
] as const;

/** Pengguna dummy untuk pilihan pimpinan, notulis, dan peserta. */
export const PEOPLE = [
  { id: "u1", name: "Ahmad Fauzi", position: "Direktur LAZ", unitId: "laz" },
  { id: "u2", name: "Siti Rahmawati", position: "Manager Program", unitId: "laz" },
  { id: "u3", name: "Budi Santoso", position: "Manager Keuangan", unitId: "laz" },
  { id: "u4", name: "Dewi Lestari", position: "Kepala Divisi CRM", unitId: "laz" },
  { id: "u5", name: "Rizky Pratama", position: "Staff Fundraising", unitId: "laz" },
  { id: "u6", name: "Nurul Hidayah", position: "Notulis", unitId: "laz" },
  { id: "u7", name: "Hasan Basri", position: "Mudir Badan Wakaf", unitId: "wakaf" },
  { id: "u8", name: "Fatimah Azzahra", position: "Kepala TKQ", unitId: "tkq" },
  { id: "u9", name: "Yusuf Maulana", position: "Mudir RTQ", unitId: "rtq" },
  { id: "u10", name: "Umar Faruq", position: "Koordinator Kemasjidan", unitId: "masjid" },
] as const;

/* -------------------------------- Tipe --------------------------------- */

export type AgendaItem = {
  order: number;
  topic: string;
  owner: string;
  durationMinutes?: number;
};

export type MeetingParticipant = {
  name: string;
  position: string;
  attendance: AttendanceStatus;
  note?: string;
};

export type Meeting = {
  id: string;
  /** Nomor rapat yang dapat dibaca manusia (format masih keputusan terbuka #4). */
  number: string;
  title: string;
  purpose: string;
  typeId: (typeof MEETING_TYPES)[number]["id"];
  unitId: (typeof UNITS)[number]["id"];
  departmentId?: (typeof DEPARTMENTS)[number]["id"];
  /** Format YYYY-MM-DD, zona waktu Asia/Jakarta. */
  date: string;
  /** Format HH:mm. */
  startTime: string;
  endTime: string;
  mode: MeetingMode;
  location: string;
  link?: string;
  leader: string;
  notetaker: string;
  classification: Classification;
  status: MeetingStatus;
  minuteStatus: MinuteStatus;
  decisionCount: number;
  actionItemCount: number;
  agenda: AgendaItem[];
  participants: MeetingParticipant[];
};

/* ------------------------------ Data dummy ------------------------------ */

export const MEETINGS: Meeting[] = [
  {
    id: "mtg-001",
    number: "YP/LAZ/PRG/001/XI/2026",
    title: "Rapat Koordinasi Program Ramadan",
    purpose: "Menyamakan rencana program dan pembagian tugas antar departemen.",
    typeId: "koordinasi",
    unitId: "laz",
    departmentId: "laz-program",
    date: "2026-11-12",
    startTime: "09:00",
    endTime: "10:30",
    mode: "Hibrida",
    location: "Ruang Meeting Utama",
    link: "https://meet.example.com/yp-program",
    leader: "Siti Rahmawati",
    notetaker: "Nurul Hidayah",
    classification: "Internal",
    status: "Dijadwalkan",
    minuteStatus: "Belum dibuat",
    decisionCount: 0,
    actionItemCount: 0,
    agenda: [
      { order: 1, topic: "Evaluasi program tahun berjalan", owner: "Siti Rahmawati", durationMinutes: 30 },
      { order: 2, topic: "Rencana program Ramadan", owner: "Dewi Lestari", durationMinutes: 40 },
      { order: 3, topic: "Pembagian tugas dan target", owner: "Ahmad Fauzi", durationMinutes: 20 },
    ],
    participants: [
      { name: "Siti Rahmawati", position: "Manager Program", attendance: "Belum konfirmasi" },
      { name: "Dewi Lestari", position: "Kepala Divisi CRM", attendance: "Hadir" },
      { name: "Rizky Pratama", position: "Staff Fundraising", attendance: "Belum konfirmasi" },
      { name: "Nurul Hidayah", position: "Notulis", attendance: "Hadir" },
    ],
  },
  {
    id: "mtg-002",
    number: "YP/LAZ/KEU/004/XI/2026",
    title: "Evaluasi Anggaran Kuartal IV",
    purpose: "Meninjau realisasi anggaran dan menetapkan penyesuaian.",
    typeId: "evaluasi",
    unitId: "laz",
    departmentId: "laz-keuangan",
    date: "2026-11-05",
    startTime: "13:00",
    endTime: "14:30",
    mode: "Luring",
    location: "Ruang Diskusi",
    leader: "Budi Santoso",
    notetaker: "Nurul Hidayah",
    classification: "Rahasia",
    status: "Selesai",
    minuteStatus: "Menunggu Review",
    decisionCount: 2,
    actionItemCount: 3,
    agenda: [
      { order: 1, topic: "Realisasi anggaran Oktober", owner: "Budi Santoso", durationMinutes: 45 },
      { order: 2, topic: "Usulan penyesuaian anggaran", owner: "Ahmad Fauzi", durationMinutes: 45 },
    ],
    participants: [
      { name: "Budi Santoso", position: "Manager Keuangan", attendance: "Hadir" },
      { name: "Ahmad Fauzi", position: "Direktur LAZ", attendance: "Hadir" },
      { name: "Nurul Hidayah", position: "Notulis", attendance: "Hadir" },
      { name: "Rizky Pratama", position: "Staff Fundraising", attendance: "Izin", note: "Dinas luar kota" },
    ],
  },
  {
    id: "mtg-003",
    number: "YP/WKF/UMUM/002/XI/2026",
    title: "Rapat Pengelolaan Aset Wakaf",
    purpose: "Menetapkan prioritas pengelolaan dan pemanfaatan aset wakaf.",
    typeId: "keputusan",
    unitId: "wakaf",
    date: "2026-11-02",
    startTime: "10:00",
    endTime: "11:30",
    mode: "Luring",
    location: "Kantor Badan Wakaf",
    leader: "Hasan Basri",
    notetaker: "Nurul Hidayah",
    classification: "Internal",
    status: "Selesai",
    minuteStatus: "Disetujui",
    decisionCount: 3,
    actionItemCount: 4,
    agenda: [
      { order: 1, topic: "Inventarisasi aset", owner: "Hasan Basri", durationMinutes: 30 },
      { order: 2, topic: "Rencana pemanfaatan lahan", owner: "Hasan Basri", durationMinutes: 60 },
    ],
    participants: [
      { name: "Hasan Basri", position: "Mudir Badan Wakaf", attendance: "Hadir" },
      { name: "Nurul Hidayah", position: "Notulis", attendance: "Terlambat" },
    ],
  },
  {
    id: "mtg-004",
    number: "YP/TKQ/UMUM/003/X/2026",
    title: "Rapat Evaluasi Semester TKQ",
    purpose: "Evaluasi capaian belajar santri dan rencana semester berikutnya.",
    typeId: "evaluasi",
    unitId: "tkq",
    date: "2026-10-28",
    startTime: "08:00",
    endTime: "09:30",
    mode: "Luring",
    location: "Ruang Guru TKQ",
    leader: "Fatimah Azzahra",
    notetaker: "Nurul Hidayah",
    classification: "Umum",
    status: "Selesai",
    minuteStatus: "Draft",
    decisionCount: 1,
    actionItemCount: 2,
    agenda: [
      { order: 1, topic: "Capaian hafalan santri", owner: "Fatimah Azzahra" },
      { order: 2, topic: "Rencana kegiatan semester genap", owner: "Fatimah Azzahra" },
    ],
    participants: [
      { name: "Fatimah Azzahra", position: "Kepala TKQ", attendance: "Hadir" },
      { name: "Nurul Hidayah", position: "Notulis", attendance: "Hadir" },
    ],
  },
  {
    id: "mtg-005",
    number: "YP/MSJ/UMUM/001/X/2026",
    title: "Rapat Kepanitiaan Peringatan Hari Besar",
    purpose: "Membentuk panitia dan menyusun rencana kegiatan.",
    typeId: "khusus",
    unitId: "masjid",
    date: "2026-10-20",
    startTime: "19:30",
    endTime: "21:00",
    mode: "Daring",
    location: "Online",
    link: "https://meet.example.com/yp-kemasjidan",
    leader: "Umar Faruq",
    notetaker: "Nurul Hidayah",
    classification: "Umum",
    status: "Dibatalkan",
    minuteStatus: "Belum dibuat",
    decisionCount: 0,
    actionItemCount: 0,
    agenda: [{ order: 1, topic: "Pembentukan panitia", owner: "Umar Faruq" }],
    participants: [
      { name: "Umar Faruq", position: "Koordinator Kemasjidan", attendance: "Belum konfirmasi" },
    ],
  },
];

/* ------------------------------- Helper -------------------------------- */

export function getMeeting(id: string) {
  return MEETINGS.find((meeting) => meeting.id === id);
}

export function getUnit(id: string) {
  return UNITS.find((unit) => unit.id === id);
}

export function getDepartment(id?: string) {
  return DEPARTMENTS.find((department) => department.id === id);
}

export function getMeetingType(id: string) {
  return MEETING_TYPES.find((type) => type.id === id);
}

/** Format tanggal Indonesia, dikunci ke Asia/Jakarta (aturan bisnis PRD). */
export function formatDate(
  date: string,
  options: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "short",
    year: "numeric",
  },
) {
  return new Date(`${date}T00:00:00+07:00`).toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
    ...options,
  });
}

export function formatTimeRange(start: string, end: string) {
  return `${start.replace(":", ".")} - ${end.replace(":", ".")} WIB`;
}

const ROMAN_MONTHS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

/**
 * Pratinjau nomor rapat. Nomor urut final dibuat server/database
 * (jangan dihitung di klien agar tidak bentrok).
 */
export function previewMeetingNumber(
  unitId: string,
  departmentId: string | undefined,
  date: string,
) {
  const unit = getUnit(unitId);
  const department = getDepartment(departmentId);
  const [year, month] = date ? date.split("-") : ["", ""];
  const roman = month ? ROMAN_MONTHS[Number(month) - 1] ?? "…" : "…";

  return [
    "YP",
    unit?.code ?? "…",
    department?.code ?? "UMUM",
    "(otomatis)",
    roman,
    year || "…",
  ].join("/");
}

/* ---------------------------- Gaya badge status ---------------------------- */

export const meetingStatusStyles: Record<MeetingStatus, string> = {
  Dijadwalkan: "border-blue-200 bg-blue-100 text-blue-700",
  Berlangsung: "border-emerald-200 bg-emerald-100 text-emerald-700",
  Selesai: "border-slate-200 bg-slate-100 text-slate-600",
  Dibatalkan: "border-red-200 bg-red-100 text-red-700",
};

export const minuteStatusStyles: Record<MinuteStatus, string> = {
  "Belum dibuat": "border-slate-200 bg-slate-50 text-slate-500",
  Draft: "border-slate-200 bg-slate-100 text-slate-600",
  "Menunggu Review": "border-amber-200 bg-amber-100 text-amber-700",
  Revisi: "border-orange-200 bg-orange-100 text-orange-700",
  Disetujui: "border-emerald-200 bg-emerald-100 text-emerald-700",
  Ditolak: "border-red-200 bg-red-100 text-red-700",
};

export const classificationStyles: Record<Classification, string> = {
  Umum: "border-sky-200 bg-sky-50 text-sky-700",
  Internal: "border-violet-200 bg-violet-50 text-violet-700",
  Rahasia: "border-rose-200 bg-rose-50 text-rose-700",
};

export const attendanceStyles: Record<AttendanceStatus, string> = {
  "Belum konfirmasi": "border-slate-200 bg-slate-100 text-slate-600",
  Hadir: "border-emerald-200 bg-emerald-100 text-emerald-700",
  Online: "border-sky-200 bg-sky-100 text-sky-700",
  Terlambat: "border-amber-200 bg-amber-100 text-amber-700",
  Izin: "border-blue-200 bg-blue-100 text-blue-700",
  Sakit: "border-orange-200 bg-orange-100 text-orange-700",
  "Tidak hadir": "border-rose-200 bg-rose-100 text-rose-700",
};