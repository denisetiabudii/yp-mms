/**
 * Logika laporan (FR-018) — murni (tanpa React) agar mudah diuji.
 * Semua laporan hanya memuat rapat yang boleh dilihat pengguna
 * (klasifikasi, lib/access.ts). Penegakan sebenarnya tetap di server (RLS).
 */

import { canViewMeeting, type Viewer } from "@/lib/access";
import {
  ACTION_ITEMS,
  buildDecisionRows,
  completionRate,
  isOverdue,
  onTimeRate,
  type ActionItem,
} from "@/lib/actions";
import {
  MEETINGS,
  UNITS,
  formatDate,
  getDepartment,
  getMeeting,
  getMeetingType,
  getUnit,
  type Meeting,
} from "@/lib/meetings";

export const REPORT_TYPES = [
  { id: "kinerja", name: "Kinerja per Unit", description: "Perbandingan efektivitas rapat antarunit: rapat, notulen, keputusan, penyelesaian, dan ketepatan waktu." },
  { id: "rapat", name: "Rekap Rapat", description: "Daftar rapat per periode, unit, departemen, jenis, dan status beserta kehadiran." },
  { id: "keputusan", name: "Rekap Keputusan", description: "Keputusan rapat dan status tindak lanjutnya." },
  { id: "action", name: "Rekap Action Item", description: "Tugas per PIC dan status, termasuk ketepatan waktu penyelesaian." },
] as const;

export type ReportType = (typeof REPORT_TYPES)[number]["id"];

export type ReportFilters = {
  from: string;
  to: string;
  unit: string;
  department: string;
  /** Jenis rapat. */
  type: string;
  meetingStatus: string;
  pic: string;
  actionStatus: string;
};

export const EMPTY_FILTERS: ReportFilters = {
  from: "",
  to: "",
  unit: "all",
  department: "all",
  type: "all",
  meetingStatus: "all",
  pic: "all",
  actionStatus: "all",
};

export type Report = { columns: string[]; rows: string[][]; summary: string };

const BROAD_ROLES = ["super_admin", "ceo", "direktur_unit"];

const pct = (value: number | null) => (value === null ? "—" : `${value}%`);
const inRange = (date: string, f: ReportFilters) => (!f.from || date >= f.from) && (!f.to || date <= f.to);

function meetingMatches(m: Meeting, f: ReportFilters, viewer: Viewer) {
  return (
    canViewMeeting(m, viewer) &&
    inRange(m.date, f) &&
    (f.unit === "all" || m.unitId === f.unit) &&
    (f.department === "all" || m.departmentId === f.department) &&
    (f.type === "all" || m.typeId === f.type)
  );
}

function visibleAction(item: ActionItem, viewer: Viewer) {
  if (item.meetingId) {
    const meeting = getMeeting(item.meetingId);

    return !!meeting && canViewMeeting(meeting, viewer);
  }

  return (
    item.pic === viewer.name ||
    item.verifier === viewer.name ||
    item.supporters.includes(viewer.name) ||
    BROAD_ROLES.includes(viewer.role)
  );
}

/** Action item masuk laporan: periode memakai deadline, unit/departemen lewat rapat asal. */
function actionMatches(item: ActionItem, f: ReportFilters, viewer: Viewer) {
  if (!visibleAction(item, viewer) || !inRange(item.deadline, f)) return false;

  const meeting = item.meetingId ? getMeeting(item.meetingId) : undefined;

  if (f.unit !== "all" && meeting?.unitId !== f.unit) return false;
  if (f.department !== "all" && meeting?.departmentId !== f.department) return false;

  return (f.pic === "all" || item.pic === f.pic) && (f.actionStatus === "all" || item.status === f.actionStatus);
}

export function timelinessOf(item: ActionItem, today: string) {
  if (item.status === "Dibatalkan") return "—";
  if (item.status === "Selesai") return item.completedAt && item.completedAt <= item.deadline ? "Tepat waktu" : "Terlambat";

  return isOverdue(item, today) ? "Terlambat (belum selesai)" : "Belum jatuh tempo";
}

/** Daftar PIC yang boleh dipilih pada filter (hanya dari action item yang terlihat). */
export function visiblePics(viewer: Viewer) {
  return Array.from(new Set(ACTION_ITEMS.filter((a) => visibleAction(a, viewer)).map((a) => a.pic))).sort();
}

export function buildReport(type: ReportType, f: ReportFilters, viewer: Viewer, today: string): Report {
  if (type === "rapat") {
    const list = MEETINGS.filter((m) => meetingMatches(m, f, viewer) && (f.meetingStatus === "all" || m.status === f.meetingStatus)).sort(
      (a, b) => b.date.localeCompare(a.date),
    );

    return {
      columns: ["Nomor", "Judul", "Tanggal", "Unit", "Departemen", "Jenis", "Pimpinan", "Status Rapat", "Status Notulen", "Klasifikasi", "Hadir/Diundang"],
      rows: list.map((m) => [
        m.number,
        m.title,
        formatDate(m.date),
        getUnit(m.unitId)?.name ?? "",
        getDepartment(m.departmentId)?.name ?? "—",
        getMeetingType(m.typeId)?.name ?? "",
        m.leader,
        m.status,
        m.minuteStatus,
        m.classification,
        `${m.participants.filter((p) => ["Hadir", "Online", "Terlambat"].includes(p.attendance)).length}/${m.participants.length}`,
      ]),
      summary: `${list.length} rapat`,
    };
  }

  if (type === "keputusan") {
    const list = buildDecisionRows(ACTION_ITEMS)
      .flatMap((row) => {
        const meeting = getMeeting(row.meetingId);

        return meeting && meetingMatches(meeting, f, viewer) ? [{ row, meeting }] : [];
      })
      .sort((a, b) => b.meeting.date.localeCompare(a.meeting.date));

    const open = list.filter(({ row }) => row.status === "Dalam tindak lanjut" || row.status === "Belum ada action item").length;

    return {
      columns: ["Nomor Rapat", "Rapat", "Tanggal", "Keputusan", "Perlu Tindak Lanjut", "Status", "Jumlah Action Item"],
      rows: list.map(({ row, meeting }) => [
        meeting.number,
        meeting.title,
        formatDate(meeting.date),
        row.text,
        row.needsAction ? "Ya" : "Tidak",
        row.status,
        String(row.actions.length),
      ]),
      summary: `${list.length} keputusan, ${open} masih terbuka`,
    };
  }

  if (type === "action") {
    const list = ACTION_ITEMS.filter((a) => actionMatches(a, f, viewer)).sort((a, b) => a.deadline.localeCompare(b.deadline));

    return {
      columns: ["Nomor", "Tugas", "Sumber", "PIC", "Verifikator", "Deadline", "Prioritas", "Status", "Progres", "Selesai Pada", "Ketepatan Waktu"],
      rows: list.map((a) => [
        a.number,
        a.title,
        getMeeting(a.meetingId ?? "")?.title ?? "Instruksi langsung",
        a.pic,
        a.verifier,
        formatDate(a.deadline),
        a.priority,
        a.status,
        `${a.progress}%`,
        a.completedAt ? formatDate(a.completedAt) : "—",
        timelinessOf(a, today),
      ]),
      summary: `${list.length} action item · penyelesaian ${pct(completionRate(list))} · tepat waktu ${pct(onTimeRate(list))}`,
    };
  }

  // kinerja per unit
  type Stats = { held: number; cancelled: number; approved: number; decisions: number; actions: ActionItem[] };
  const empty = (): Stats => ({ held: 0, cancelled: 0, approved: 0, decisions: 0, actions: [] });
  const units = UNITS.filter((u) => f.unit === "all" || u.id === f.unit);

  const stats = new Map<string, Stats>(units.map((u) => [u.id, empty()]));

  MEETINGS.filter((m) => meetingMatches(m, f, viewer) && stats.has(m.unitId)).forEach((m) => {
    const s = stats.get(m.unitId) as Stats;

    if (m.status === "Selesai") {
      s.held += 1;
      s.decisions += m.decisionCount;
      if (m.minuteStatus === "Disetujui") s.approved += 1;
    } else if (m.status === "Dibatalkan") {
      s.cancelled += 1;
    }
  });

  ACTION_ITEMS.filter((a) => a.meetingId && actionMatches(a, { ...f, pic: "all", actionStatus: "all" }, viewer)).forEach((a) => {
    const unitId = getMeeting(a.meetingId as string)?.unitId;
    const s = unitId ? stats.get(unitId) : undefined;

    if (s) s.actions.push(a);
  });

  const line = (label: string, s: Stats) => [
    label,
    String(s.held),
    String(s.cancelled),
    s.held ? pct(Math.round((s.approved / s.held) * 100)) : "—",
    String(s.decisions),
    String(s.actions.length),
    pct(completionRate(s.actions)),
    pct(onTimeRate(s.actions)),
    String(s.actions.filter((a) => isOverdue(a, today)).length),
  ];

  const rows = units.map((u) => line(u.name, stats.get(u.id) as Stats));
  const total = [...stats.values()].reduce(
    (sum, s) => ({
      held: sum.held + s.held,
      cancelled: sum.cancelled + s.cancelled,
      approved: sum.approved + s.approved,
      decisions: sum.decisions + s.decisions,
      actions: [...sum.actions, ...s.actions],
    }),
    empty(),
  );

  return {
    columns: ["Unit", "Rapat Selesai", "Dibatalkan", "Notulen Disetujui", "Keputusan", "Action Item", "Penyelesaian", "Tepat Waktu", "Terlambat"],
    rows: units.length > 1 ? [...rows, line("Total", total)] : rows,
    summary: `${total.held} rapat selesai · ${total.actions.length} action item`,
  };
}
