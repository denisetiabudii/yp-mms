/**
 * Aturan keterlihatan rapat berdasarkan klasifikasi (PRD 15.1).
 *
 * PENTING: ini simulasi di sisi tampilan agar UI konsisten. Penegakan
 * sebenarnya WAJIB di server (RLS Postgres + pemeriksaan Server Action),
 * karena apa pun yang sudah terkirim ke browser bisa dibaca pengguna.
 */

import type { AppRole } from "@/lib/auth/roles";
import type { Meeting } from "@/lib/meetings";

export type Viewer = { name: string; role: AppRole };

/** Role yang boleh melihat semua rapat Rahasia. */
const SECRET_ROLES: readonly AppRole[] = ["super_admin", "ceo"];
/** Role yang boleh melihat rapat Internal di luar keikutsertaannya (scope unit diterapkan di server). */
const INTERNAL_ROLES: readonly AppRole[] = ["super_admin", "ceo", "direktur_unit"];

export function isInvolved(meeting: Meeting, viewer: Viewer) {
  return (
    meeting.leader === viewer.name ||
    meeting.notetaker === viewer.name ||
    meeting.participants.some((p) => p.name === viewer.name)
  );
}

export function canViewMeeting(meeting: Meeting, viewer: Viewer) {
  if (meeting.classification === "Umum") return true;
  if (isInvolved(meeting, viewer)) return true;

  return meeting.classification === "Rahasia"
    ? SECRET_ROLES.includes(viewer.role)
    : INTERNAL_ROLES.includes(viewer.role);
}
