"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, MapPin, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { todayJakarta } from "@/lib/actions";
import {
  DAY_SHORT,
  MONTH_NAMES,
  addDays,
  addMonths,
  monthGrid,
  monthLabel,
  parseISO,
  startOfWeek,
} from "@/lib/dates";
import {
  MEETINGS,
  MEETING_STATUSES,
  MEETING_TYPES,
  UNITS,
  classificationStyles,
  formatDate,
  formatTimeRange,
  getUnit,
  meetingStatusStyles,
  type Meeting,
  type MeetingStatus,
} from "@/lib/meetings";

const selectClass =
  "h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

type View = "bulan" | "minggu" | "agenda";

const chipStyles: Record<MeetingStatus, string> = {
  Dijadwalkan: "bg-blue-100 text-blue-800 hover:bg-blue-200",
  Berlangsung: "bg-emerald-100 text-emerald-800 hover:bg-emerald-200",
  Selesai: "bg-slate-100 text-slate-600 hover:bg-slate-200",
  Dibatalkan: "bg-red-50 text-red-500 line-through hover:bg-red-100",
};

function MeetingRow({ meeting }: { meeting: Meeting }) {
  return (
    <Link
      href={`/meetings/${meeting.id}`}
      className="block rounded-lg border border-slate-200 bg-white p-3 transition hover:border-blue-300 hover:bg-blue-50/40"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="font-medium text-slate-800">{meeting.title}</p>
        <div className="flex gap-1.5">
          <Badge variant="outline" className={meetingStatusStyles[meeting.status]}>{meeting.status}</Badge>
          <Badge variant="outline" className={classificationStyles[meeting.classification]}>{meeting.classification}</Badge>
        </div>
      </div>
      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
        <Clock3 className="size-3.5" />
        {formatTimeRange(meeting.startTime, meeting.endTime)}
      </p>
      <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
        <MapPin className="size-3.5" />
        {meeting.location} ({meeting.mode}) · {getUnit(meeting.unitId)?.name}
      </p>
    </Link>
  );
}

export default function CalendarPage() {
  const today = todayJakarta();

  const [view, setView] = React.useState<View>("bulan");
  const [cursor, setCursor] = React.useState(today);
  const [selected, setSelected] = React.useState(today);
  const [unit, setUnit] = React.useState("all");
  const [type, setType] = React.useState("all");
  const [status, setStatus] = React.useState("all");

  const filtered = MEETINGS.filter(
    (m) =>
      (unit === "all" || m.unitId === unit) &&
      (type === "all" || m.typeId === type) &&
      (status === "all" || m.status === status),
  );

  const byDate = (date: string) =>
    filtered
      .filter((m) => m.date === date)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

  function move(direction: -1 | 1) {
    if (view === "bulan") setCursor(addMonths(cursor, direction));
    else if (view === "minggu") setCursor(addDays(cursor, direction * 7));
    else setCursor(addMonths(cursor, direction));
  }

  function goToday() {
    setCursor(today);
    setSelected(today);
  }

  const weekStart = startOfWeek(cursor);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const cursorMonth = cursor.slice(0, 7);

  const title =
    view === "minggu"
      ? `${formatDate(weekDays[0], { day: "numeric", month: "short" })} – ${formatDate(weekDays[6], { day: "numeric", month: "short", year: "numeric" })}`
      : monthLabel(cursor);

  const agendaDates = Array.from(
    new Set(filtered.filter((m) => m.date.startsWith(cursorMonth)).map((m) => m.date)),
  ).sort();

  const selectedMeetings = byDate(selected);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kalender Rapat</h1>
          <p className="text-sm text-muted-foreground">Jadwal rapat seluruh unit sesuai hak akses Anda.</p>
        </div>

        <Link
          href="/meetings/new"
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
        >
          <Plus className="size-4" />
          Buat Rapat
        </Link>
      </div>

      <Card className="overflow-hidden border-[#DBEAFE] shadow-sm">
        {/* TOOLBAR */}
        <div className="space-y-4 border-b bg-[#F8FAFC] p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => move(-1)} aria-label="Sebelumnya" className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-blue-50">
                <ChevronLeft className="size-4" />
              </button>
              <button type="button" onClick={() => move(1)} aria-label="Berikutnya" className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-blue-50">
                <ChevronRight className="size-4" />
              </button>
              <button type="button" onClick={goToday} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-blue-50">
                Hari ini
              </button>
              <h2 aria-live="polite" className="ml-2 text-lg font-semibold text-slate-800">{title}</h2>
            </div>

            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5" role="group" aria-label="Tampilan kalender">
              {(
                [
                  ["bulan", "Bulanan"],
                  ["minggu", "Mingguan"],
                  ["agenda", "Agenda"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={view === value}
                  onClick={() => setView(value)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition ${view === value ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-blue-50"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <select aria-label="Filter unit" value={unit} onChange={(e) => setUnit(e.target.value)} className={selectClass}>
              <option value="all">Semua Unit</option>
              {UNITS.map((u) => (<option key={u.id} value={u.id}>{u.name}</option>))}
            </select>
            <select aria-label="Filter jenis rapat" value={type} onChange={(e) => setType(e.target.value)} className={selectClass}>
              <option value="all">Semua Jenis</option>
              {MEETING_TYPES.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
            </select>
            <select aria-label="Filter status" value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}>
              <option value="all">Semua Status</option>
              {MEETING_STATUSES.map((s) => (<option key={s} value={s}>{s}</option>))}
            </select>
          </div>
        </div>

        <CardContent className="p-0">
          {/* ============ BULANAN ============ */}
          {view === "bulan" && (
            <div className="grid xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="overflow-x-auto">
                <div className="min-w-[640px]">
                  <div className="grid grid-cols-7 border-b bg-slate-50 text-center text-xs font-semibold text-slate-500">
                    {DAY_SHORT.map((d) => (<div key={d} className="py-2.5">{d}</div>))}
                  </div>

                  {monthGrid(cursor).map((week) => (
                    <div key={week[0]} className="grid grid-cols-7">
                      {week.map((date) => {
                        const inMonth = date.startsWith(cursorMonth);
                        const items = byDate(date);
                        const isToday = date === today;
                        const isSelected = date === selected;

                        return (
                          <div
                            key={date}
                            className={`min-h-28 border-b border-r border-slate-100 p-1.5 ${inMonth ? "bg-white" : "bg-slate-50/70"} ${isSelected ? "ring-2 ring-inset ring-blue-400" : ""}`}
                          >
                            <button
                              type="button"
                              onClick={() => setSelected(date)}
                              aria-label={formatDate(date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                              aria-pressed={isSelected}
                              className={`mb-1 flex size-7 items-center justify-center rounded-full text-xs font-semibold transition ${
                                isToday ? "bg-blue-600 text-white" : inMonth ? "text-slate-700 hover:bg-blue-50" : "text-slate-400 hover:bg-slate-100"
                              }`}
                            >
                              {parseISO(date).day}
                            </button>

                            <div className="space-y-1">
                              {items.slice(0, 3).map((m) => (
                                <Link
                                  key={m.id}
                                  href={`/meetings/${m.id}`}
                                  title={`${m.startTime} ${m.title}`}
                                  className={`block truncate rounded px-1.5 py-0.5 text-[11px] font-medium transition ${chipStyles[m.status]}`}
                                >
                                  {m.startTime} {m.title}
                                </Link>
                              ))}
                              {items.length > 3 && (
                                <button type="button" onClick={() => setSelected(date)} className="px-1 text-[11px] font-medium text-blue-600 hover:underline">
                                  +{items.length - 3} lagi
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* Panel hari terpilih */}
              <aside className="border-t bg-slate-50/50 p-5 xl:border-l xl:border-t-0" aria-label="Agenda tanggal terpilih">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <CalendarDays className="size-4 text-blue-600" />
                  {formatDate(selected, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </h3>

                <div className="mt-4 space-y-3">
                  {selectedMeetings.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Tidak ada rapat pada tanggal ini.</p>
                  ) : (
                    selectedMeetings.map((m) => <MeetingRow key={m.id} meeting={m} />)
                  )}
                </div>
              </aside>
            </div>
          )}

          {/* ============ MINGGUAN ============ */}
          {view === "minggu" && (
            <div className="overflow-x-auto">
              <div className="grid min-w-[840px] grid-cols-7 divide-x divide-slate-100">
                {weekDays.map((date, index) => {
                  const items = byDate(date);
                  const isToday = date === today;

                  return (
                    <div key={date} className="min-h-72 p-3">
                      <div className="mb-3 text-center">
                        <p className="text-xs font-semibold text-slate-500">{DAY_SHORT[index]}</p>
                        <p className={`mx-auto mt-1 flex size-8 items-center justify-center rounded-full text-sm font-semibold ${isToday ? "bg-blue-600 text-white" : "text-slate-700"}`}>
                          {parseISO(date).day}
                        </p>
                      </div>

                      <div className="space-y-2">
                        {items.map((m) => (
                          <Link key={m.id} href={`/meetings/${m.id}`} className={`block rounded-lg p-2 text-xs transition ${chipStyles[m.status]}`}>
                            <span className="block font-semibold">{m.startTime}</span>
                            <span className="block leading-4">{m.title}</span>
                          </Link>
                        ))}
                        {items.length === 0 && <p className="text-center text-xs text-slate-300">—</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ============ AGENDA ============ */}
          {view === "agenda" && (
            <div className="space-y-6 p-5">
              {agendaDates.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Tidak ada rapat pada {MONTH_NAMES[parseISO(cursor).month - 1]} {parseISO(cursor).year}.
                </p>
              ) : (
                agendaDates.map((date) => (
                  <section key={date} aria-label={formatDate(date)}>
                    <h3 className={`mb-2 text-sm font-semibold ${date === today ? "text-blue-700" : "text-slate-600"}`}>
                      {formatDate(date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                      {date === today && <span className="ml-2 rounded bg-blue-600 px-1.5 py-0.5 text-[10px] text-white">Hari ini</span>}
                    </h3>
                    <div className="space-y-2">
                      {byDate(date).map((m) => <MeetingRow key={m.id} meeting={m} />)}
                    </div>
                  </section>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Rapat berklasifikasi Rahasia hanya tampil bagi peserta dan pengguna berwenang; pembatasannya akan
        ditegakkan di server (RLS).
      </p>
    </div>
  );
}