"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Lock,
  MapPin,
  Plus,
  Trash2,
  UserCheck,
  UserMinus,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  ATTENDANCE_STATUSES,
  MEETINGS,
  PEOPLE,
  UNITS,
  attendanceStyles,
  formatDate,
  formatTimeRange,
  getUnit,
  meetingStatusStyles,
  type AttendanceStatus,
  type Meeting,
  type MeetingParticipant,
} from "@/lib/meetings";

const controlClass =
  "h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";
const primaryButton =
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButton =
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-50";

/** Yang dihitung hadir: hadir fisik, daring, atau terlambat. */
const PRESENT: AttendanceStatus[] = ["Hadir", "Online", "Terlambat"];
/** Status yang wajib disertai alasan. */
const NEEDS_REASON: AttendanceStatus[] = ["Izin", "Sakit"];
/** Status yang masih menunjukkan alasan opsional. */
const SHOWS_NOTE: AttendanceStatus[] = ["Izin", "Sakit", "Tidak hadir"];

type Roster = Record<string, MeetingParticipant[]>;
type Tab = "rapat" | "rekap";

function buildRoster(): Roster {
  return Object.fromEntries(
    MEETINGS.map((meeting) => [meeting.id, meeting.participants.map((p) => ({ ...p }))]),
  );
}

/** Rapat yang belum berlangsung belum bisa berstatus Terlambat. */
function allowedStatuses(meeting: Meeting): AttendanceStatus[] {
  return meeting.status === "Dijadwalkan"
    ? ATTENDANCE_STATUSES.filter((s) => s !== "Terlambat")
    : [...ATTENDANCE_STATUSES];
}

/** Alasan data terkunci, atau null bila boleh diubah. */
function lockReason(meeting: Meeting) {
  if (meeting.status === "Dibatalkan") return "Rapat dibatalkan; kehadiran tidak dapat diubah.";
  if (meeting.minuteStatus === "Disetujui") {
    return "Notulen sudah disetujui sehingga daftar hadir terkunci. Perubahan dilakukan lewat amandemen notulen.";
  }

  return null;
}

/** Rapat terdekat yang akan datang; bila tidak ada, yang terbaru. */
function defaultMeetingId() {
  const sorted = [...MEETINGS].sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));
  const upcoming = sorted.find((m) => m.status === "Dijadwalkan" || m.status === "Berlangsung");

  return (upcoming ?? sorted[sorted.length - 1]).id;
}

export default function ParticipantsPage() {
  const [saved, setSaved] = React.useState<Roster>(buildRoster);
  const [draft, setDraft] = React.useState<Roster>(buildRoster);
  const [meetingId, setMeetingId] = React.useState(defaultMeetingId);
  const [tab, setTab] = React.useState<Tab>("rapat");
  const [addName, setAddName] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [notice, setNotice] = React.useState("");
  const [unitFilter, setUnitFilter] = React.useState("all");

  const meeting = MEETINGS.find((m) => m.id === meetingId) as Meeting;
  const rows = draft[meetingId] ?? [];
  const locked = lockReason(meeting);
  const statuses = allowedStatuses(meeting);

  const isDirty = (id: string) => JSON.stringify(draft[id]) !== JSON.stringify(saved[id]);
  const dirty = isDirty(meetingId);

  const count = (...list: AttendanceStatus[]) => rows.filter((r) => list.includes(r.attendance)).length;

  const candidates = PEOPLE.filter((p) => !rows.some((r) => r.name === p.name));

  function selectMeeting(id: string) {
    setMeetingId(id);
    setErrors({});
    setNotice("");
  }

  function updateRow(name: string, patch: Partial<MeetingParticipant>) {
    setDraft((current) => ({
      ...current,
      [meetingId]: current[meetingId].map((r) => (r.name === name ? { ...r, ...patch } : r)),
    }));
    setErrors((current) => ({ ...current, [name]: "" }));
    setNotice("");
  }

  function changeStatus(name: string, attendance: AttendanceStatus) {
    // Alasan hanya relevan untuk izin/sakit/tidak hadir; hapus bila tidak lagi relevan.
    updateRow(name, { attendance, ...(SHOWS_NOTE.includes(attendance) ? {} : { note: undefined }) });
  }

  function addParticipant() {
    const person = PEOPLE.find((p) => p.name === addName);

    if (!person) return;

    setDraft((current) => ({
      ...current,
      [meetingId]: [
        ...current[meetingId],
        { name: person.name, position: person.position, attendance: "Belum konfirmasi" },
      ],
    }));
    setAddName("");
    setNotice("");
  }

  function removeParticipant(name: string) {
    setDraft((current) => ({
      ...current,
      [meetingId]: current[meetingId].filter((r) => r.name !== name),
    }));
    setNotice("");
  }

  function save() {
    const found: Record<string, string> = {};

    rows.forEach((row) => {
      if (NEEDS_REASON.includes(row.attendance) && !row.note?.trim()) {
        found[row.name] = `Alasan wajib diisi untuk status ${row.attendance}.`;
      }
    });

    setErrors(found);

    if (Object.keys(found).length > 0) {
      setNotice("");
      return;
    }

    // TODO: Server Action — simpan ke tabel meeting_participants + audit_logs,
    // dan tolak bila notulen sudah Disetujui (aturan dijaga di server juga).
    setSaved((current) => ({ ...current, [meetingId]: rows.map((r) => ({ ...r })) }));
    setNotice("Daftar peserta dan kehadiran tersimpan.");
  }

  function discard() {
    setDraft((current) => ({ ...current, [meetingId]: saved[meetingId].map((r) => ({ ...r })) }));
    setErrors({});
    setNotice("Perubahan dibatalkan.");
  }

  /* ----------------------- Rekap kehadiran per orang ----------------------- */

  const recap = React.useMemo(() => {
    const finished = MEETINGS.filter(
      (m) => m.status === "Selesai" && (unitFilter === "all" || m.unitId === unitFilter),
    );
    const people = new Map<
      string,
      { name: string; position: string; invited: number; present: number; excused: number; absent: number; pending: number }
    >();

    finished.forEach((m) => {
      (saved[m.id] ?? []).forEach((p) => {
        const entry =
          people.get(p.name) ??
          { name: p.name, position: p.position, invited: 0, present: 0, excused: 0, absent: 0, pending: 0 };

        entry.invited += 1;
        if (PRESENT.includes(p.attendance)) entry.present += 1;
        else if (p.attendance === "Izin" || p.attendance === "Sakit") entry.excused += 1;
        else if (p.attendance === "Tidak hadir") entry.absent += 1;
        else entry.pending += 1;

        people.set(p.name, entry);
      });
    });

    return {
      meetings: finished.length,
      list: [...people.values()].sort((a, b) => b.present / b.invited - a.present / a.invited || a.name.localeCompare(b.name)),
    };
  }, [saved, unitFilter]);

  const summary = [
    { label: "Diundang", value: rows.length, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Hadir", value: count(...PRESENT), icon: UserCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Izin / Sakit", value: count("Izin", "Sakit"), icon: Clock3, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Tidak Hadir", value: count("Tidak hadir"), icon: UserMinus, color: "text-red-600", bg: "bg-red-50" },
    { label: "Belum Konfirmasi", value: count("Belum konfirmasi"), icon: AlertTriangle, color: "text-slate-600", bg: "bg-slate-100" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Manajemen Peserta Rapat</h1>
        <p className="text-sm text-muted-foreground">
          Kelola undangan peserta dan catat kehadiran per rapat, serta lihat rekap kehadiran per orang.
        </p>
      </div>

      <div role="tablist" aria-label="Tampilan peserta" className="flex gap-1.5">
        {(
          [
            ["rapat", "Per Rapat"],
            ["rekap", "Rekap Kehadiran"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === value ? "bg-blue-600 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-blue-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "rapat" && (
        <>
          {/* PILIH RAPAT */}
          <Card className="border-[#DBEAFE] shadow-sm">
            <CardContent className="space-y-3 p-5">
              <label htmlFor="meeting-select" className="text-sm font-medium text-slate-700">Rapat</label>
              <select
                id="meeting-select"
                value={meetingId}
                onChange={(e) => selectMeeting(e.target.value)}
                className={`${controlClass} w-full`}
              >
                {[...MEETINGS]
                  .sort((a, b) => `${b.date}${b.startTime}`.localeCompare(`${a.date}${a.startTime}`))
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {isDirty(m.id) ? "● " : ""}
                      {m.title} — {formatDate(m.date)} ({m.status})
                    </option>
                  ))}
              </select>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-500">
                <span className="flex items-center gap-1.5"><CalendarDays className="size-3.5" />{formatDate(meeting.date)}, {formatTimeRange(meeting.startTime, meeting.endTime)}</span>
                <span className="flex items-center gap-1.5"><MapPin className="size-3.5" />{meeting.location} ({meeting.mode})</span>
                <span>{getUnit(meeting.unitId)?.name}</span>
                <Badge variant="outline" className={meetingStatusStyles[meeting.status]}>{meeting.status}</Badge>
                <Link href={`/meetings/${meeting.id}`} className="font-medium text-blue-600 hover:underline">Detail rapat</Link>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {summary.map((item) => (
              <Card key={item.label} className="border-[#DBEAFE] border-t-2 border-t-blue-500 shadow-sm transition hover:shadow-md">
                <CardContent className="flex items-center justify-between p-5">
                  <div>
                    <p className="text-sm text-muted-foreground">{item.label}</p>
                    <p className="mt-2 text-2xl font-bold">{item.value}</p>
                  </div>
                  <div className={`rounded-xl p-3 ${item.bg}`}>
                    <item.icon className={`size-5 ${item.color}`} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {locked && (
            <div role="status" className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <Lock className="mt-0.5 size-4 shrink-0" />
              <span>{locked}</span>
            </div>
          )}

          {notice && (
            <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {notice}
            </div>
          )}

          {Object.values(errors).some(Boolean) && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Lengkapi alasan untuk peserta yang izin atau sakit sebelum menyimpan.
            </div>
          )}

          {/* DAFTAR PESERTA */}
          <Card className="overflow-hidden border-[#DBEAFE] shadow-sm">
            <CardHeader className="border-b bg-[#F8FAFC]">
              <CardTitle className="text-base">Daftar Peserta ({rows.length})</CardTitle>
              {dirty && <p className="text-xs font-medium text-amber-700">Ada perubahan yang belum disimpan.</p>}
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500">
                    <tr>
                      <th className="px-5 py-4 text-left font-semibold">Peserta</th>
                      <th className="px-5 py-4 text-left font-semibold">Kehadiran</th>
                      <th className="px-5 py-4 text-left font-semibold">Alasan / catatan</th>
                      <th className="px-5 py-4 text-center font-semibold">Aksi</th>
                    </tr>
                  </thead>

                  <tbody>
                    {rows.map((row) => {
                      const isLeader = row.name === meeting.leader;
                      const isNotetaker = row.name === meeting.notetaker;
                      const protectedRow = isLeader || isNotetaker;
                      const noteId = `note-${row.name.replace(/\s+/g, "-")}`;

                      return (
                        <tr key={row.name} className="border-t border-slate-100 align-top transition hover:bg-blue-50/40">
                          <td className="px-5 py-4">
                            <p className="font-semibold text-slate-800">{row.name}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{row.position}</p>
                            <div className="mt-1 flex gap-1.5">
                              {isLeader && <Badge variant="outline" className="border-purple-200 bg-purple-50 text-purple-700">Pimpinan</Badge>}
                              {isNotetaker && <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700">Notulis</Badge>}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <select
                              aria-label={`Kehadiran ${row.name}`}
                              value={row.attendance}
                              onChange={(e) => changeStatus(row.name, e.target.value as AttendanceStatus)}
                              disabled={!!locked}
                              className={`${controlClass} h-8 text-xs`}
                            >
                              {statuses.map((s) => (<option key={s} value={s}>{s}</option>))}
                            </select>
                            <div className="mt-1.5">
                              <Badge variant="outline" className={attendanceStyles[row.attendance]}>{row.attendance}</Badge>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            {SHOWS_NOTE.includes(row.attendance) ? (
                              <>
                                <label htmlFor={noteId} className="sr-only">Alasan {row.name}</label>
                                <Input
                                  id={noteId}
                                  value={row.note ?? ""}
                                  onChange={(e) => updateRow(row.name, { note: e.target.value })}
                                  readOnly={!!locked}
                                  placeholder={NEEDS_REASON.includes(row.attendance) ? "Alasan (wajib)" : "Alasan (opsional)"}
                                  aria-invalid={!!errors[row.name]}
                                  aria-describedby={errors[row.name] ? `${noteId}-error` : undefined}
                                  maxLength={200}
                                />
                                {errors[row.name] && (
                                  <p id={`${noteId}-error`} role="alert" className="mt-1 text-xs text-red-600">{errors[row.name]}</p>
                                )}
                              </>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </td>

                          <td className="px-5 py-4 text-center">
                            <button
                              type="button"
                              onClick={() => removeParticipant(row.name)}
                              disabled={!!locked || protectedRow || meeting.status === "Selesai"}
                              aria-label={`Hapus ${row.name} dari daftar peserta`}
                              title={
                                protectedRow
                                  ? "Pimpinan dan notulis tidak dapat dihapus"
                                  : meeting.status === "Selesai"
                                    ? "Rapat sudah selesai; peserta tidak dihapus agar riwayat utuh"
                                    : "Hapus dari daftar"
                              }
                              className="inline-flex size-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {rows.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-muted-foreground">Belum ada peserta pada rapat ini.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 border-t bg-slate-50/70 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <label htmlFor="add-participant" className="sr-only">Tambah peserta</label>
                  <select
                    id="add-participant"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    disabled={!!locked || candidates.length === 0}
                    className={`${controlClass} w-64`}
                  >
                    <option value="">{candidates.length === 0 ? "Semua pengguna sudah diundang" : "Tambah peserta…"}</option>
                    {candidates.map((p) => (<option key={p.id} value={p.name}>{p.name} — {p.position}</option>))}
                  </select>
                  <button type="button" onClick={addParticipant} disabled={!addName || !!locked} className={secondaryButton}>
                    <Plus className="size-4" />
                    Tambah
                  </button>
                </div>

                <div className="flex gap-2">
                  <button type="button" onClick={discard} disabled={!dirty} className={secondaryButton}>Batalkan perubahan</button>
                  <button type="button" onClick={save} disabled={!dirty || !!locked} className={primaryButton}>
                    <CheckCircle2 className="size-4" />
                    Simpan
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {tab === "rekap" && (
        <Card className="overflow-hidden border-[#DBEAFE] shadow-sm">
          <CardHeader className="border-b bg-[#F8FAFC]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base">Rekap Kehadiran per Orang</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  Dihitung dari {recap.meetings} rapat berstatus Selesai. Hadir = hadir, online, atau terlambat.
                </p>
              </div>

              <select aria-label="Filter unit" value={unitFilter} onChange={(e) => setUnitFilter(e.target.value)} className={controlClass}>
                <option value="all">Semua Unit</option>
                {UNITS.map((u) => (<option key={u.id} value={u.id}>{u.name}</option>))}
              </select>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-5 py-4 text-left font-semibold">Nama</th>
                    <th className="px-5 py-4 text-center font-semibold">Diundang</th>
                    <th className="px-5 py-4 text-center font-semibold">Hadir</th>
                    <th className="px-5 py-4 text-center font-semibold">Izin / Sakit</th>
                    <th className="px-5 py-4 text-center font-semibold">Tidak Hadir</th>
                    <th className="px-5 py-4 text-left font-semibold">Tingkat Kehadiran</th>
                  </tr>
                </thead>

                <tbody>
                  {recap.list.map((p) => {
                    const rate = Math.round((p.present / p.invited) * 100);

                    return (
                      <tr key={p.name} className="border-t border-slate-100 transition hover:bg-blue-50/40">
                        <td className="px-5 py-3">
                          <p className="font-medium text-slate-800">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.position}</p>
                        </td>
                        <td className="px-5 py-3 text-center text-slate-600">{p.invited}</td>
                        <td className="px-5 py-3 text-center text-slate-600">{p.present}</td>
                        <td className="px-5 py-3 text-center text-slate-600">{p.excused}</td>
                        <td className="px-5 py-3 text-center text-slate-600">{p.absent}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div
                              role="progressbar"
                              aria-valuenow={rate}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-label={`Tingkat kehadiran ${p.name}`}
                              className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-200"
                            >
                              <div className={`h-full rounded-full ${rate >= 75 ? "bg-emerald-500" : rate >= 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${rate}%` }} />
                            </div>
                            <span className="text-xs font-medium text-slate-600">{rate}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {recap.list.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-muted-foreground">Belum ada rapat selesai pada unit ini.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        Pencatatan kehadiran dilakukan oleh notulis atau pimpinan rapat; pembatasan hak ini akan ditegakkan di server.
      </p>
    </div>
  );
}