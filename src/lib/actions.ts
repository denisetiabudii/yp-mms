/**
 * Tipe, konstanta, dan data dummy modul Keputusan & Tindak Lanjut (action item).
 *
 * Sumber: PRD v1.0 FR-008..FR-010, bagian 8.2 (field action item), 10
 * (aturan bisnis), 14.3 (definisi metrik), 20.2 no. 6 (verifikasi).
 */

import { getMeeting, type MinuteStatus } from "@/lib/meetings";
import { MINUTES } from "@/lib/minutes";

/* ------------------------------ Konstanta ------------------------------ */

export const ACTION_STATUSES = [
  "Belum dimulai",
  "Berjalan",
  "Menunggu verifikasi",
  "Selesai",
  "Dibatalkan",
] as const;
export type ActionStatus = (typeof ACTION_STATUSES)[number];

export const PRIORITIES = ["Rendah", "Normal", "Tinggi", "Mendesak"] as const;
export type Priority = (typeof PRIORITIES)[number];

/**
 * Pengguna aktif (simulasi) untuk filter "Tugas Saya".
 * TODO: ganti dengan pengguna dari sesi Supabase.
 */
export const CURRENT_USER = "Budi Santoso";

/* -------------------------------- Tipe --------------------------------- */

export type ActionUpdate = {
  id: string;
  /** ISO 8601. */
  at: string;
  actor: string;
  action: string;
  status: ActionStatus;
  progress: number;
  note?: string;
  obstacle?: string;
  /** Tautan atau uraian bukti penyelesaian. */
  evidence?: string;
};

export type ActionItem = {
  id: string;
  number: string;
  title: string;
  /** Rapat/keputusan asal; kosong bila instruksi langsung. */
  meetingId?: string;
  decisionId?: string;
  pic: string;
  supporters: string[];
  /** YYYY-MM-DD (Asia/Jakarta). */
  deadline: string;
  priority: Priority;
  status: ActionStatus;
  /** 0–100, informasi tambahan (bukan pengganti status). */
  progress: number;
  expectedResult: string;
  verifier: string;
  /** Tanggal selesai (YYYY-MM-DD) untuk metrik on-time. */
  completedAt?: string;
  updates: ActionUpdate[];
};

/* ------------------------------ Data dummy ------------------------------ */

export const ACTION_ITEMS: ActionItem[] = [
  {
    id: "act-001",
    number: "AI-001",
    title: "Menyusun rincian dampak pergeseran anggaran operasional ke program",
    meetingId: "mtg-002",
    decisionId: "d1",
    pic: "Budi Santoso",
    supporters: ["Rizky Pratama"],
    deadline: "2026-11-09",
    priority: "Tinggi",
    status: "Berjalan",
    progress: 60,
    expectedResult: "Dokumen rincian dampak per pos anggaran untuk persetujuan Direktur.",
    verifier: "Ahmad Fauzi",
    updates: [
      { id: "u2", at: "2026-11-08T10:00:00+07:00", actor: "Budi Santoso", action: "Progres diperbarui", status: "Berjalan", progress: 60, note: "Data pos operasional selesai, pos program sedang dihitung.", obstacle: "Menunggu data realisasi dari Marketing." },
      { id: "u1", at: "2026-11-05T16:00:00+07:00", actor: "Ahmad Fauzi", action: "Action item dibuat", status: "Belum dimulai", progress: 0 },
    ],
  },
  {
    id: "act-002",
    number: "AI-002",
    title: "Menetapkan ketentuan batas penyerahan data realisasi (tanggal 3)",
    meetingId: "mtg-002",
    decisionId: "d2",
    pic: "Dewi Lestari",
    supporters: [],
    deadline: "2026-11-14",
    priority: "Normal",
    status: "Belum dimulai",
    progress: 0,
    expectedResult: "Surat edaran atau SOP singkat yang ditandatangani Direktur.",
    verifier: "Ahmad Fauzi",
    updates: [
      { id: "u1", at: "2026-11-05T16:05:00+07:00", actor: "Ahmad Fauzi", action: "Action item dibuat", status: "Belum dimulai", progress: 0 },
    ],
  },
  {
    id: "act-003",
    number: "AI-003",
    title: "Melengkapi dokumen sertifikasi tiga bidang lahan wakaf",
    meetingId: "mtg-003",
    decisionId: "d1",
    pic: "Hasan Basri",
    supporters: ["Nurul Hidayah"],
    deadline: "2026-11-20",
    priority: "Mendesak",
    status: "Berjalan",
    progress: 40,
    expectedResult: "Berkas lengkap dan terdaftar di kantor pertanahan.",
    verifier: "Ahmad Fauzi",
    updates: [
      { id: "u2", at: "2026-11-07T09:30:00+07:00", actor: "Hasan Basri", action: "Progres diperbarui", status: "Berjalan", progress: 40, note: "Dua dari tiga berkas sudah dilengkapi." },
      { id: "u1", at: "2026-11-03T15:00:00+07:00", actor: "Hasan Basri", action: "Action item dibuat", status: "Belum dimulai", progress: 0 },
    ],
  },
  {
    id: "act-004",
    number: "AI-004",
    title: "Menyusun rencana pemanfaatan lahan produktif",
    meetingId: "mtg-003",
    decisionId: "d2",
    pic: "Hasan Basri",
    supporters: [],
    deadline: "2026-11-08",
    priority: "Normal",
    status: "Menunggu verifikasi",
    progress: 100,
    expectedResult: "Dokumen rencana pemanfaatan per bidang lahan.",
    verifier: "Ahmad Fauzi",
    updates: [
      { id: "u2", at: "2026-11-08T14:00:00+07:00", actor: "Hasan Basri", action: "Diajukan untuk verifikasi", status: "Menunggu verifikasi", progress: 100, note: "Rencana telah disusun dan dibahas dengan pengurus.", evidence: "https://drive.example.com/rencana-lahan" },
      { id: "u1", at: "2026-11-03T15:05:00+07:00", actor: "Hasan Basri", action: "Action item dibuat", status: "Belum dimulai", progress: 0 },
    ],
  },
  {
    id: "act-005",
    number: "AI-005",
    title: "Mengumpulkan laporan realisasi Oktober dari seluruh departemen",
    meetingId: "mtg-002",
    pic: "Rizky Pratama",
    supporters: [],
    deadline: "2026-11-25",
    priority: "Rendah",
    status: "Selesai",
    progress: 100,
    expectedResult: "Seluruh laporan terkumpul di folder bersama.",
    verifier: "Budi Santoso",
    completedAt: "2026-11-07",
    updates: [
      { id: "u3", at: "2026-11-07T16:00:00+07:00", actor: "Budi Santoso", action: "Diverifikasi selesai", status: "Selesai", progress: 100 },
      { id: "u2", at: "2026-11-07T11:00:00+07:00", actor: "Rizky Pratama", action: "Diajukan untuk verifikasi", status: "Menunggu verifikasi", progress: 100, note: "Semua laporan sudah masuk.", evidence: "https://drive.example.com/laporan-oktober" },
      { id: "u1", at: "2026-11-05T16:10:00+07:00", actor: "Budi Santoso", action: "Action item dibuat (instruksi langsung)", status: "Belum dimulai", progress: 0 },
    ],
  },
];

/* ------------------------------- Helper -------------------------------- */

export function getAction(id: string) {
  return ACTION_ITEMS.find((item) => item.id === id);
}

/** Tanggal hari ini (YYYY-MM-DD) di zona waktu Asia/Jakarta. */
export function todayJakarta() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
}

export function isOpen(status: ActionStatus) {
  return status !== "Selesai" && status !== "Dibatalkan";
}

/** PRD 14.3: belum selesai dan deadline lebih kecil dari waktu sekarang. */
export function isOverdue(item: ActionItem, today = todayJakarta()) {
  return isOpen(item.status) && item.deadline < today;
}

/** PRD 14.3: selesai pada/sebelum deadline ÷ seluruh yang selesai. */
export function onTimeRate(items: ActionItem[]) {
  const done = items.filter((item) => item.status === "Selesai" && item.completedAt);
  if (done.length === 0) return null;

  const onTime = done.filter((item) => (item.completedAt as string) <= item.deadline);
  return Math.round((onTime.length / done.length) * 100);
}

/** Completion rate: selesai ÷ seluruh action item (tidak termasuk dibatalkan). */
export function completionRate(items: ActionItem[]) {
  const counted = items.filter((item) => item.status !== "Dibatalkan");
  if (counted.length === 0) return null;

  return Math.round(
    (counted.filter((item) => item.status === "Selesai").length / counted.length) * 100,
  );
}

/* ------------------------------ Keputusan ------------------------------ */

export const DECISION_STATUSES = [
  "Tanpa tindak lanjut",
  "Belum ada action item",
  "Dalam tindak lanjut",
  "Selesai",
] as const;
export type DecisionStatus = (typeof DECISION_STATUSES)[number];

export type DecisionRow = {
  key: string;
  meetingId: string;
  decisionId: string;
  text: string;
  basis: string;
  needsAction: boolean;
  minuteStatus: MinuteStatus;
  actions: ActionItem[];
  status: DecisionStatus;
};

/**
 * Susun daftar keputusan dari notulen + action item.
 * Aturan PRD: keputusan yang butuh aksi wajib punya minimal satu action item,
 * sehingga "Belum ada action item" ditandai sebagai pelanggaran aturan.
 */
export function buildDecisionRows(items: ActionItem[] = ACTION_ITEMS): DecisionRow[] {
  return MINUTES.flatMap((minute) =>
    minute.content.decisions.map((decision) => {
      const actions = items.filter(
        (item) => item.meetingId === minute.meetingId && item.decisionId === decision.id,
      );
      const active = actions.filter((item) => item.status !== "Dibatalkan");

      let status: DecisionStatus;
      if (!decision.needsAction) status = "Tanpa tindak lanjut";
      else if (active.length === 0) status = "Belum ada action item";
      else if (active.some((item) => isOpen(item.status))) status = "Dalam tindak lanjut";
      else status = "Selesai";

      return {
        key: `${minute.meetingId}:${decision.id}`,
        meetingId: minute.meetingId,
        decisionId: decision.id,
        text: decision.text,
        basis: decision.basis,
        needsAction: decision.needsAction,
        minuteStatus: minute.status,
        actions,
        status,
      };
    }),
  );
}

export function getMeetingTitle(meetingId?: string) {
  return meetingId ? getMeeting(meetingId)?.title : undefined;
}

/* ---------------------------- Gaya badge ---------------------------- */

export const actionStatusStyles: Record<ActionStatus, string> = {
  "Belum dimulai": "border-slate-200 bg-slate-100 text-slate-600",
  Berjalan: "border-blue-200 bg-blue-100 text-blue-700",
  "Menunggu verifikasi": "border-amber-200 bg-amber-100 text-amber-700",
  Selesai: "border-emerald-200 bg-emerald-100 text-emerald-700",
  Dibatalkan: "border-red-200 bg-red-100 text-red-700",
};

export const priorityStyles: Record<Priority, string> = {
  Rendah: "border-slate-200 bg-slate-50 text-slate-600",
  Normal: "border-sky-200 bg-sky-50 text-sky-700",
  Tinggi: "border-orange-200 bg-orange-50 text-orange-700",
  Mendesak: "border-red-200 bg-red-50 text-red-700",
};

export const decisionStatusStyles: Record<DecisionStatus, string> = {
  "Tanpa tindak lanjut": "border-slate-200 bg-slate-100 text-slate-600",
  "Belum ada action item": "border-red-200 bg-red-100 text-red-700",
  "Dalam tindak lanjut": "border-blue-200 bg-blue-100 text-blue-700",
  Selesai: "border-emerald-200 bg-emerald-100 text-emerald-700",
};