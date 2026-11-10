/**
 * Tipe dan data dummy modul Notulen (YP-MMS).
 * Satu rapat memiliki satu notulen; id notulen = id rapat.
 *
 * Sumber: PRD v1.0 FR-007, FR-011, FR-019, bagian 8.1, 10 (aturan bisnis:
 * notulen disetujui read-only, perubahan lewat versi/amandemen).
 */

import type { Meeting, MinuteStatus } from "@/lib/meetings";

export type AgendaNote = {
  agendaOrder: number;
  discussion: string;
};

export type MinuteDecision = {
  id: string;
  text: string;
  basis: string;
  /** Jika true, wajib dibuatkan action item (PRD aturan bisnis). */
  needsAction: boolean;
};

export type MinuteContent = {
  agendaNotes: AgendaNote[];
  conclusion: string;
  obstacles: string;
  recommendations: string;
  decisions: MinuteDecision[];
};

export type MinuteEvent = {
  id: string;
  /** ISO 8601. */
  at: string;
  actor: string;
  action: string;
  note?: string;
};

/** Snapshot isi notulen setiap kali diajukan untuk review. */
export type MinuteVersion = {
  version: number;
  savedAt: string;
  savedBy: string;
  reason: string;
  content: MinuteContent;
};

export type Minute = {
  meetingId: string;
  status: MinuteStatus;
  content: MinuteContent;
  versions: MinuteVersion[];
  events: MinuteEvent[];
  approvedBy?: string;
  approvedAt?: string;
};

/* ------------------------------ Data dummy ------------------------------ */

const mtg002Content: MinuteContent = {
  agendaNotes: [
    {
      agendaOrder: 1,
      discussion:
        "Realisasi anggaran Oktober mencapai 87% dari rencana. Pos operasional terserap sesuai rencana, sedangkan pos program tertunda karena beberapa kegiatan bergeser ke November.",
    },
    {
      agendaOrder: 2,
      discussion:
        "Diusulkan pergeseran sebagian anggaran pos operasional ke pos program. Direktur meminta rincian dampak sebelum disetujui.",
    },
  ],
  conclusion:
    "Realisasi anggaran Oktober dinilai wajar. Pergeseran anggaran disetujui bersyarat dengan rincian dampak dari Keuangan.",
  obstacles: "Data realisasi dari dua departemen terlambat diserahkan.",
  recommendations:
    "Tetapkan batas waktu penyerahan data realisasi paling lambat tanggal 3 setiap bulan.",
  decisions: [
    {
      id: "d1",
      text: "Pergeseran anggaran operasional ke program disetujui bersyarat.",
      basis: "Realisasi program tertinggal dan kebutuhan operasional masih di bawah plafon.",
      needsAction: true,
    },
    {
      id: "d2",
      text: "Batas penyerahan data realisasi ditetapkan tanggal 3 setiap bulan.",
      basis: "Mencegah keterlambatan laporan keuangan bulanan.",
      needsAction: true,
    },
  ],
};

const mtg003Content: MinuteContent = {
  agendaNotes: [
    {
      agendaOrder: 1,
      discussion:
        "Inventarisasi mencatat 12 bidang aset wakaf; 9 bidang telah bersertifikat dan 3 bidang masih dalam proses.",
    },
    {
      agendaOrder: 2,
      discussion:
        "Dibahas pemanfaatan lahan produktif untuk program wakaf produktif dan pengelolaan lahan yang belum bersertifikat.",
    },
  ],
  conclusion:
    "Seluruh aset akan dikelola sesuai prioritas: penyelesaian sertifikat lebih dulu, lalu pemanfaatan produktif.",
  obstacles: "Proses sertifikasi tiga bidang lahan memerlukan dokumen tambahan.",
  recommendations: "Bentuk tim kecil untuk menyelesaikan administrasi sertifikasi.",
  decisions: [
    {
      id: "d1",
      text: "Penyelesaian sertifikat tiga bidang lahan menjadi prioritas triwulan ini.",
      basis: "Status hukum aset harus jelas sebelum dimanfaatkan.",
      needsAction: true,
    },
    {
      id: "d2",
      text: "Pemanfaatan lahan produktif dimulai dari bidang yang sudah bersertifikat.",
      basis: "Meminimalkan risiko hukum.",
      needsAction: true,
    },
    {
      id: "d3",
      text: "Laporan aset wakaf disampaikan setiap triwulan.",
      basis: "Akuntabilitas kepada pengurus.",
      needsAction: false,
    },
  ],
};

const mtg004Content: MinuteContent = {
  agendaNotes: [
    {
      agendaOrder: 1,
      discussion: "Capaian hafalan santri secara umum sesuai target; sebagian santri perlu pendampingan tambahan.",
    },
    { agendaOrder: 2, discussion: "" },
  ],
  conclusion: "",
  obstacles: "",
  recommendations: "",
  decisions: [],
};

export const MINUTES: Minute[] = [
  {
    meetingId: "mtg-002",
    status: "Menunggu Review",
    content: mtg002Content,
    versions: [
      {
        version: 1,
        savedAt: "2026-11-06T09:15:00+07:00",
        savedBy: "Nurul Hidayah",
        reason: "Diajukan untuk review",
        content: mtg002Content,
      },
    ],
    events: [
      { id: "e2", at: "2026-11-06T09:15:00+07:00", actor: "Nurul Hidayah", action: "Diajukan untuk review", note: "Versi 1" },
      { id: "e1", at: "2026-11-05T15:00:00+07:00", actor: "Nurul Hidayah", action: "Notulen dibuat" },
    ],
  },
  {
    meetingId: "mtg-003",
    status: "Disetujui",
    content: mtg003Content,
    versions: [
      {
        version: 1,
        savedAt: "2026-11-03T08:30:00+07:00",
        savedBy: "Nurul Hidayah",
        reason: "Diajukan untuk review",
        content: mtg003Content,
      },
    ],
    events: [
      { id: "e3", at: "2026-11-03T14:10:00+07:00", actor: "Hasan Basri", action: "Disetujui", note: "Sudah sesuai dengan hasil rapat." },
      { id: "e2", at: "2026-11-03T08:30:00+07:00", actor: "Nurul Hidayah", action: "Diajukan untuk review", note: "Versi 1" },
      { id: "e1", at: "2026-11-02T12:00:00+07:00", actor: "Nurul Hidayah", action: "Notulen dibuat" },
    ],
    approvedBy: "Hasan Basri",
    approvedAt: "2026-11-03T14:10:00+07:00",
  },
  {
    meetingId: "mtg-004",
    status: "Draft",
    content: mtg004Content,
    versions: [],
    events: [
      { id: "e1", at: "2026-10-28T11:00:00+07:00", actor: "Nurul Hidayah", action: "Notulen dibuat" },
    ],
  },
];

/* ------------------------------- Helper -------------------------------- */

export function getMinute(meetingId: string) {
  return MINUTES.find((minute) => minute.meetingId === meetingId);
}

/** Notulen kosong untuk rapat yang belum punya notulen (template per agenda). */
export function createBlankMinute(meeting: Meeting): Minute {
  return {
    meetingId: meeting.id,
    status: "Belum dibuat",
    content: {
      agendaNotes: meeting.agenda.map((item) => ({
        agendaOrder: item.order,
        discussion: "",
      })),
      conclusion: "",
      obstacles: "",
      recommendations: "",
      decisions: [],
    },
    versions: [],
    events: [],
  };
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}