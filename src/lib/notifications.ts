/**
 * Notifikasi dalam aplikasi (FR-014, PRD 16.1).
 *
 * Pada fase frontend, notifikasi DITURUNKAN dari data rapat, notulen, dan
 * action item. Di produksi, tiap kejadian menulis baris ke tabel
 * `notifications` (penerima, jenis, tautan, read_at) dari Server Action/trigger,
 * dan fungsi ini digantikan query ke tabel tersebut.
 */

import { addDays, diffDays } from "@/lib/dates";
import { ACTION_ITEMS, isOpen, isOverdue } from "@/lib/actions";
import { MEETINGS, formatDate, formatTimeRange } from "@/lib/meetings";
import { MINUTES } from "@/lib/minutes";

export type NotificationKind =
  | "undangan"
  | "pengingat"
  | "dibatalkan"
  | "notulen-review"
  | "notulen-revisi"
  | "notulen-disetujui"
  | "tugas-baru"
  | "deadline"
  | "terlambat"
  | "verifikasi"
  | "tugas-selesai";

export type NotificationCategory = "Rapat" | "Notulen" | "Tugas";

export const KIND_CATEGORY: Record<NotificationKind, NotificationCategory> = {
  undangan: "Rapat",
  pengingat: "Rapat",
  dibatalkan: "Rapat",
  "notulen-review": "Notulen",
  "notulen-revisi": "Notulen",
  "notulen-disetujui": "Notulen",
  "tugas-baru": "Tugas",
  deadline: "Tugas",
  terlambat: "Tugas",
  verifikasi: "Tugas",
  "tugas-selesai": "Tugas",
};

export type Notification = {
  /** Deterministik (jenis + objek) agar status baca bisa disimpan per pengguna. */
  id: string;
  kind: NotificationKind;
  category: NotificationCategory;
  title: string;
  body: string;
  /** ISO 8601. */
  at: string;
  href: string;
  urgent?: boolean;
};

const at = (date: string, time = "09:00") => `${date}T${time}:00+07:00`;

/** Tanggal (YYYY-MM-DD, Asia/Jakarta) dari waktu ISO. */
export function dateOf(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
}

export function buildNotifications(user: string, today: string): Notification[] {
  const list: Notification[] = [];

  const add = (kind: NotificationKind, id: string, title: string, body: string, when: string, href: string, urgent = false) =>
    list.push({ id: `${kind}:${id}`, kind, category: KIND_CATEGORY[kind], title, body, at: when, href, urgent });

  /* ------------------------------- Rapat ------------------------------- */
  MEETINGS.forEach((m) => {
    const participant = m.participants.find((p) => p.name === user);

    if (!participant) return;

    const detail = `${formatDate(m.date)}, ${formatTimeRange(m.startTime, m.endTime)} · ${m.location}`;

    if (m.status === "Dijadwalkan") {
      add(
        "undangan",
        m.id,
        `Undangan rapat: ${m.title}`,
        participant.attendance === "Belum konfirmasi" ? `${detail}. Mohon konfirmasi kehadiran.` : detail,
        at(addDays(m.date, -3)),
        `/meetings/${m.id}`,
      );

      const days = diffDays(today, m.date);

      if (days >= 0 && days <= 1) {
        add("pengingat", m.id, days === 0 ? `Rapat hari ini: ${m.title}` : `Rapat besok: ${m.title}`, detail, at(today, "07:00"), `/meetings/${m.id}`, days === 0);
      }
    }

    if (m.status === "Dibatalkan") {
      add("dibatalkan", m.id, `Rapat dibatalkan: ${m.title}`, `Rapat yang dijadwalkan ${formatDate(m.date)} tidak jadi dilaksanakan.`, at(m.date, "18:00"), `/meetings/${m.id}`);
    }
  });

  /* ------------------------------ Notulen ------------------------------ */
  MINUTES.forEach((minute) => {
    const meeting = MEETINGS.find((m) => m.id === minute.meetingId);

    if (!meeting) return;

    const latest = (action: string) => minute.events.find((e) => e.action === action)?.at;
    const href = `/minutes/${meeting.id}`;

    if (minute.status === "Menunggu Review" && meeting.leader === user) {
      add("notulen-review", meeting.id, `Notulen menunggu tinjauan Anda`, `${meeting.title} — diajukan ${meeting.notetaker || "notulis"}.`, latest("Diajukan untuk review") ?? at(meeting.date), href, true);
    }

    if ((minute.status === "Revisi" || minute.status === "Ditolak") && meeting.notetaker === user) {
      const when = latest("Revisi diminta") ?? latest("Ditolak") ?? at(meeting.date);

      add("notulen-revisi", meeting.id, minute.status === "Revisi" ? "Notulen dikembalikan untuk revisi" : "Notulen ditolak", meeting.title, when, href, true);
    }

    if (minute.status === "Disetujui" && meeting.notetaker === user) {
      add("notulen-disetujui", meeting.id, "Notulen disetujui", `${meeting.title} — disetujui ${minute.approvedBy ?? meeting.leader}.`, minute.approvedAt ?? latest("Disetujui") ?? at(meeting.date), href);
    }
  });

  /* ---------------------------- Action item ---------------------------- */
  ACTION_ITEMS.forEach((item) => {
    const href = `/action-items/${item.id}`;
    const isPic = item.pic === user;
    const update = (action: string) => item.updates.find((u) => u.action === action)?.at;

    if (isPic || item.supporters.includes(user)) {
      const created = item.updates.find((u) => u.action.startsWith("Action item dibuat"))?.at;

      if (created) {
        add("tugas-baru", item.id, `Tugas baru: ${item.title}`, `${isPic ? "Anda PIC" : "Anda pendukung"} · deadline ${formatDate(item.deadline)}.`, created, href);
      }
    }

    if (isPic && isOpen(item.status)) {
      const days = diffDays(today, item.deadline);

      if (isOverdue(item, today)) {
        add("terlambat", item.id, `Tugas terlambat: ${item.title}`, `Deadline ${formatDate(item.deadline)} sudah lewat.`, at(addDays(item.deadline, 1), "08:00"), href, true);
      } else if (days <= 3) {
        add("deadline", item.id, `Deadline mendekat: ${item.title}`, `${days === 0 ? "Jatuh tempo hari ini" : `${days} hari lagi`} (${formatDate(item.deadline)}).`, at(today, "08:00"), href, days <= 1);
      }
    }

    if (item.verifier === user && item.status === "Menunggu verifikasi") {
      add("verifikasi", item.id, `Menunggu verifikasi Anda: ${item.title}`, `Diajukan ${item.pic}.`, update("Diajukan untuk verifikasi") ?? at(today), href, true);
    }

    if (isPic && item.status === "Selesai") {
      add("tugas-selesai", item.id, `Tugas diverifikasi selesai: ${item.title}`, `Diverifikasi ${item.verifier}.`, update("Diverifikasi selesai") ?? at(today), href);
    }
  });

  return list.sort((a, b) => b.at.localeCompare(a.at));
}
