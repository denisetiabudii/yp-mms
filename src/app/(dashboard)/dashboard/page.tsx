"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileText,
  Vote,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ACTION_ITEMS,
  buildDecisionRows,
  completionRate,
  decisionStatusStyles,
  isOverdue,
  onTimeRate,
  priorityStyles,
  todayJakarta,
  type ActionItem,
} from "@/lib/actions";
import { MONTH_NAMES, addMonths, diffDays, parseISO } from "@/lib/dates";
import {
  MEETINGS,
  UNITS,
  formatDate,
  formatTimeRange,
  getMeeting,
  getUnit,
  minuteStatusStyles,
} from "@/lib/meetings";

const selectClass =
  "h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

type Period = "bulan" | "tahun" | "semua";

function Stat({
  label,
  value,
  hint,
  icon: Icon,
  color,
  bg,
  href,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  href?: string;
}) {
  const body = (
    <CardContent className="flex items-center justify-between p-5">
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-bold">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className={`rounded-xl p-3 ${bg}`}>
        <Icon className={`size-5 ${color}`} />
      </div>
    </CardContent>
  );

  return (
    <Card className="border-[#DBEAFE] border-t-2 border-t-blue-500 shadow-sm transition hover:shadow-md">
      {href ? (
        <Link href={href} className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40">
          {body}
        </Link>
      ) : (
        body
      )}
    </Card>
  );
}

/** Batang sederhana berbasis CSS (tanpa library grafik). */
function Bars({
  items,
  suffix = "",
  max,
}: {
  items: { label: string; value: number | null }[];
  suffix?: string;
  max?: number;
}) {
  const top = max ?? Math.max(1, ...items.map((item) => item.value ?? 0));

  return (
    <div className="flex h-40 items-end gap-3" role="list">
      {items.map((item) => {
        const height = item.value === null ? 0 : Math.max(4, (item.value / top) * 100);

        return (
          <div
            key={item.label}
            role="listitem"
            aria-label={`${item.label}: ${item.value === null ? "tidak ada data" : `${item.value}${suffix}`}`}
            className="flex h-full flex-1 flex-col items-center justify-end gap-1"
          >
            <span className="text-xs font-medium text-slate-600">
              {item.value === null ? "—" : `${item.value}${suffix}`}
            </span>
            <div className="flex w-full flex-1 items-end">
              <div
                className="w-full rounded-t-md bg-blue-500 transition-all"
                style={{ height: `${height}%` }}
              />
            </div>
            <span className="text-xs text-slate-500">{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function DashboardPage() {
  const [period, setPeriod] = React.useState<Period>("bulan");
  const [unit, setUnit] = React.useState("all");

  const today = todayJakarta();
  const monthKey = today.slice(0, 7);
  const yearKey = today.slice(0, 4);

  const inUnit = (unitId?: string) => unit === "all" || unitId === unit;
  const inPeriod = (date: string) =>
    period === "semua" || (period === "bulan" ? date.startsWith(monthKey) : date.startsWith(yearKey));

  const unitOfAction = (item: ActionItem) => (item.meetingId ? getMeeting(item.meetingId)?.unitId : undefined);

  /* Rapat (rapat dibatalkan tidak dihitung — PRD 14.3) */
  const held = MEETINGS.filter((m) => m.status !== "Dibatalkan" && inUnit(m.unitId));
  const heldInPeriod = held.filter((m) => inPeriod(m.date));
  const meetingsToday = held.filter((m) => m.date === today).length;
  const meetingsMonth = held.filter((m) => m.date.startsWith(monthKey)).length;
  const meetingsYear = held.filter((m) => m.date.startsWith(yearKey)).length;

  /* Notulen */
  const minuteCount = (...statuses: string[]) =>
    heldInPeriod.filter((m) => statuses.includes(m.minuteStatus)).length;

  const reviewList = heldInPeriod.filter((m) => m.minuteStatus === "Menunggu Review");

  /* Keputusan */
  const decisions = buildDecisionRows(ACTION_ITEMS).filter((row) => {
    const meeting = getMeeting(row.meetingId);

    return meeting && inUnit(meeting.unitId) && inPeriod(meeting.date);
  });
  const needAction = decisions.filter((row) => row.needsAction).length;
  const openDecisions = decisions.filter(
    (row) => row.status === "Dalam tindak lanjut" || row.status === "Belum ada action item",
  );

  /* Action item: masuk periode bila deadline-nya berada di periode */
  const actions = ACTION_ITEMS.filter(
    (item) => (unit === "all" || unitOfAction(item) === unit) && inPeriod(item.deadline),
  );
  const count = (status: ActionItem["status"]) => actions.filter((item) => item.status === status).length;
  const overdue = actions.filter((item) => isOverdue(item, today));
  const attention = actions
    .filter((item) => {
      if (item.status === "Selesai" || item.status === "Dibatalkan") return false;

      return isOverdue(item, today) || diffDays(today, item.deadline) <= 3;
    })
    .sort((a, b) => a.deadline.localeCompare(b.deadline));

  const completion = completionRate(actions);
  const onTime = onTimeRate(actions);

  /* Agenda terdekat */
  const upcoming = MEETINGS.filter(
    (m) => inUnit(m.unitId) && m.date >= today && (m.status === "Dijadwalkan" || m.status === "Berlangsung"),
  )
    .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`))
    .slice(0, 4);

  /* Rapat per unit (mengikuti filter periode) */
  const perUnit = UNITS.map((u) => ({
    label: u.code,
    value: MEETINGS.filter((m) => m.status !== "Dibatalkan" && m.unitId === u.id && inPeriod(m.date)).length,
  }));

  /* Tren 6 bulan terakhir */
  const months = Array.from({ length: 6 }, (_, i) => addMonths(`${today.slice(0, 7)}-01`, i - 5));
  const trendMeetings = months.map((first) => ({
    label: MONTH_NAMES[parseISO(first).month - 1].slice(0, 3),
    value: held.filter((m) => m.date.startsWith(first.slice(0, 7))).length,
  }));
  const trendCompletion = months.map((first) => {
    const monthActions = ACTION_ITEMS.filter(
      (item) =>
        item.deadline.startsWith(first.slice(0, 7)) && (unit === "all" || unitOfAction(item) === unit),
    );

    return { label: MONTH_NAMES[parseISO(first).month - 1].slice(0, 3), value: completionRate(monthActions) };
  });

  const periodLabel = period === "bulan" ? "bulan ini" : period === "tahun" ? "tahun ini" : "seluruh periode";

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Ringkasan rapat, keputusan, dan tindak lanjut ({periodLabel}).
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <select aria-label="Periode" value={period} onChange={(e) => setPeriod(e.target.value as Period)} className={selectClass}>
            <option value="bulan">Bulan ini</option>
            <option value="tahun">Tahun ini</option>
            <option value="semua">Semua periode</option>
          </select>

          <select aria-label="Unit" value={unit} onChange={(e) => setUnit(e.target.value)} className={selectClass}>
            <option value="all">Semua Unit</option>
            {UNITS.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* RAPAT & NOTULEN */}
      <section aria-label="Rapat dan notulen" className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-600">Rapat dan Notulen</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Rapat Hari Ini" value={meetingsToday} hint={`${meetingsMonth} bulan ini · ${meetingsYear} tahun ini`} icon={CalendarCheck} color="text-blue-600" bg="bg-blue-50" href="/calendar" />
          <Stat label="Notulen Draft" value={minuteCount("Draft", "Revisi", "Ditolak")} hint="Termasuk revisi/ditolak" icon={FileText} color="text-slate-600" bg="bg-slate-100" href="/minutes" />
          <Stat label="Menunggu Persetujuan" value={minuteCount("Menunggu Review")} icon={CalendarClock} color="text-amber-600" bg="bg-amber-50" href="/approvals" />
          <Stat label="Notulen Disetujui" value={minuteCount("Disetujui")} icon={CheckCircle2} color="text-emerald-600" bg="bg-emerald-50" href="/minutes" />
        </div>
      </section>

      {/* KEPUTUSAN & TINDAK LANJUT */}
      <section aria-label="Keputusan dan tindak lanjut" className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-600">Keputusan dan Tindak Lanjut</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Keputusan Perlu Tindak Lanjut" value={needAction} hint={`${openDecisions.length} masih terbuka`} icon={Vote} color="text-purple-600" bg="bg-purple-50" href="/decisions" />
          <Stat label="Action Item Berjalan" value={count("Belum dimulai") + count("Berjalan")} hint={`${count("Menunggu verifikasi")} menunggu verifikasi`} icon={ClipboardList} color="text-indigo-600" bg="bg-indigo-50" href="/action-items" />
          <Stat label="Action Item Terlambat" value={overdue.length} hint={`${count("Selesai")} selesai`} icon={AlertTriangle} color="text-red-600" bg="bg-red-50" href="/action-items" />
          <Stat
            label="Penyelesaian / Tepat Waktu"
            value={`${completion ?? "—"}${completion !== null ? "%" : ""} / ${onTime ?? "—"}${onTime !== null ? "%" : ""}`}
            hint="Definisi PRD 14.3"
            icon={CheckCircle2}
            color="text-emerald-600"
            bg="bg-emerald-50"
          />
        </div>
      </section>

      {/* GRAFIK */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-[#DBEAFE] shadow-sm">
          <CardHeader className="border-b bg-[#F8FAFC]">
            <CardTitle className="text-base">Rapat per Unit</CardTitle>
          </CardHeader>
          <CardContent className="p-5"><Bars items={perUnit} /></CardContent>
        </Card>

        <Card className="border-[#DBEAFE] shadow-sm">
          <CardHeader className="border-b bg-[#F8FAFC]">
            <CardTitle className="text-base">Tren Rapat (6 bulan)</CardTitle>
          </CardHeader>
          <CardContent className="p-5"><Bars items={trendMeetings} /></CardContent>
        </Card>

        <Card className="border-[#DBEAFE] shadow-sm">
          <CardHeader className="border-b bg-[#F8FAFC]">
            <CardTitle className="text-base">Tren Penyelesaian Tugas</CardTitle>
            <p className="text-xs text-muted-foreground">Berdasarkan bulan deadline.</p>
          </CardHeader>
          <CardContent className="p-5"><Bars items={trendCompletion} suffix="%" max={100} /></CardContent>
        </Card>
      </div>

      {/* DAFTAR */}
      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-[#DBEAFE] shadow-sm">
          <CardHeader className="border-b bg-[#F8FAFC]">
            <CardTitle className="text-base">Agenda Rapat Terdekat</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {upcoming.length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground">Tidak ada rapat terjadwal.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {upcoming.map((m) => (
                  <li key={m.id}>
                    <Link href={`/meetings/${m.id}`} className="block px-5 py-3 transition hover:bg-blue-50/50">
                      <p className="font-medium text-slate-800">{m.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(m.date)} · {formatTimeRange(m.startTime, m.endTime)} · {getUnit(m.unitId)?.name}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-[#DBEAFE] shadow-sm">
          <CardHeader className="border-b bg-[#F8FAFC]">
            <CardTitle className="text-base">Notulen yang Perlu Ditinjau</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {reviewList.length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground">Tidak ada notulen menunggu review.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {reviewList.map((m) => (
                  <li key={m.id}>
                    <Link href={`/minutes/${m.id}`} className="flex items-center justify-between gap-3 px-5 py-3 transition hover:bg-blue-50/50">
                      <span>
                        <span className="block font-medium text-slate-800">{m.title}</span>
                        <span className="block text-xs text-muted-foreground">Pimpinan: {m.leader} · {formatDate(m.date)}</span>
                      </span>
                      <Badge variant="outline" className={minuteStatusStyles[m.minuteStatus]}>{m.minuteStatus}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-[#DBEAFE] shadow-sm">
          <CardHeader className="border-b bg-[#F8FAFC]">
            <CardTitle className="text-base">Keputusan yang Belum Selesai</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {openDecisions.length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground">Semua keputusan telah selesai ditindaklanjuti.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {openDecisions.map((row) => (
                  <li key={row.key} className="flex items-start justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800">{row.text}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{getMeeting(row.meetingId)?.title}</p>
                    </div>
                    <Badge variant="outline" className={`shrink-0 ${decisionStatusStyles[row.status]}`}>{row.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-[#DBEAFE] shadow-sm">
          <CardHeader className="border-b bg-[#F8FAFC]">
            <CardTitle className="text-base">Tugas Perlu Perhatian</CardTitle>
            <p className="text-xs text-muted-foreground">Terlambat atau jatuh tempo dalam 3 hari.</p>
          </CardHeader>
          <CardContent className="p-0">
            {attention.length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground">Tidak ada tugas yang mendesak.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {attention.map((item) => {
                  const late = isOverdue(item, today);
                  const obstacle = item.updates.find((u) => u.obstacle)?.obstacle;

                  return (
                    <li key={item.id}>
                      <Link href={`/action-items/${item.id}`} className="block px-5 py-3 transition hover:bg-blue-50/50">
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-medium text-slate-800">{item.title}</p>
                          <Badge variant="outline" className={`shrink-0 ${priorityStyles[item.priority]}`}>{item.priority}</Badge>
                        </div>
                        <p className={`mt-1 text-xs ${late ? "font-medium text-red-600" : "text-muted-foreground"}`}>
                          {item.pic} · {formatDate(item.deadline)} {late ? "(terlambat)" : `(${diffDays(today, item.deadline)} hari lagi)`}
                        </p>
                        {obstacle && <p className="mt-1 text-xs text-orange-700">Hambatan: {obstacle}</p>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        Rapat dibatalkan tidak dihitung. Action item masuk periode berdasarkan deadline. Cakupan data per
        role (CEO, unit, manager) akan diterapkan di server melalui RLS.
      </p>
    </div>
  );
}
