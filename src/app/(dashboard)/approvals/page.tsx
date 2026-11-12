"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  RotateCcw,
  Search,
  UserRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CURRENT_USER, todayJakarta } from "@/lib/actions";
import { diffDays } from "@/lib/dates";
import {
  MEETINGS,
  classificationStyles,
  formatDate,
  getUnit,
  minuteStatusStyles,
  type Meeting,
  type MinuteStatus,
} from "@/lib/meetings";
import { MINUTES, formatDateTime, type Minute } from "@/lib/minutes";

/** Status yang ikut alur persetujuan (draft belum diajukan, jadi tidak tampil). */
const FLOW: MinuteStatus[] = ["Menunggu Review", "Revisi", "Ditolak", "Disetujui"];

/** Notulen yang menunggu lebih dari ini dianggap perlu segera ditinjau. */
const SLA_DAYS = 2;

const TABS = ["Perlu saya tinjau", "Menunggu review", "Revisi / Ditolak", "Disetujui", "Semua"] as const;
type Tab = (typeof TABS)[number];

type Row = {
  meeting: Meeting;
  minute: Minute;
  status: MinuteStatus;
  version: number;
  /** ISO waktu terakhir diajukan, bila ada. */
  submittedAt?: string;
};

function dateOf(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
}

export default function ApprovalsPage() {
  const [tab, setTab] = React.useState<Tab>("Perlu saya tinjau");
  const [search, setSearch] = React.useState("");

  const today = todayJakarta();
  const keyword = search.trim().toLowerCase();

  const rows: Row[] = MEETINGS.flatMap((meeting) => {
    const minute = MINUTES.find((m) => m.meetingId === meeting.id);

    if (!minute || !FLOW.includes(minute.status)) return [];

    return [
      {
        meeting,
        minute,
        status: minute.status,
        version: minute.versions.length,
        submittedAt: minute.events.find((e) => e.action === "Diajukan untuk review")?.at,
      },
    ];
  });

  const waitingDays = (row: Row) =>
    row.status === "Menunggu Review" && row.submittedAt ? diffDays(dateOf(row.submittedAt), today) : 0;

  const isMine = (row: Row) => row.status === "Menunggu Review" && row.meeting.leader === CURRENT_USER;

  const filtered = rows
    .filter((row) => {
      const haystack = [row.meeting.title, row.meeting.number, row.meeting.leader, row.meeting.notetaker]
        .join(" ")
        .toLowerCase();

      const matchesTab =
        tab === "Semua" ||
        (tab === "Perlu saya tinjau" && isMine(row)) ||
        (tab === "Menunggu review" && row.status === "Menunggu Review") ||
        (tab === "Revisi / Ditolak" && (row.status === "Revisi" || row.status === "Ditolak")) ||
        (tab === "Disetujui" && row.status === "Disetujui");

      return matchesTab && (!keyword || haystack.includes(keyword));
    })
    // yang paling lama menunggu di atas
    .sort((a, b) => (a.submittedAt ?? "").localeCompare(b.submittedAt ?? ""));

  const count = (s: MinuteStatus) => rows.filter((r) => r.status === s).length;
  const late = rows.filter((r) => waitingDays(r) > SLA_DAYS).length;

  const tabCount = (t: Tab) =>
    t === "Semua"
      ? rows.length
      : t === "Perlu saya tinjau"
        ? rows.filter(isMine).length
        : t === "Menunggu review"
          ? count("Menunggu Review")
          : t === "Revisi / Ditolak"
            ? count("Revisi") + count("Ditolak")
            : count("Disetujui");

  const summary = [
    { label: "Menunggu Review", value: count("Menunggu Review"), icon: Clock3, color: "text-amber-600", bg: "bg-amber-50" },
    { label: `Lewat ${SLA_DAYS} Hari`, value: late, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
    { label: "Revisi / Ditolak", value: count("Revisi") + count("Ditolak"), icon: RotateCcw, color: "text-orange-600", bg: "bg-orange-50" },
    { label: "Disetujui", value: count("Disetujui"), icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Persetujuan Notulen</h1>
        <p className="text-sm text-muted-foreground">
          Antrian notulen yang diajukan untuk ditinjau pimpinan rapat. Keputusan menyetujui, meminta
          revisi, atau menolak dilakukan di halaman notulen setelah isinya dibaca.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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

      <Card className="overflow-hidden border-[#DBEAFE] shadow-sm">
        <div className="space-y-4 border-b bg-[#F8FAFC] p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div role="tablist" aria-label="Filter persetujuan" className="flex flex-wrap gap-1.5">
              {TABS.map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={tab === t}
                  onClick={() => setTab(t)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    tab === t ? "bg-blue-600 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-blue-50"
                  }`}
                >
                  {t} ({tabCount(t)})
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Cari notulen"
                placeholder="Cari notulen, pimpinan, notulis..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border-slate-200 pl-9 lg:w-72"
              />
            </div>
          </div>
        </div>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-5 py-4 text-left font-semibold">Notulen</th>
                  <th className="px-5 py-4 text-left font-semibold">Pimpinan / Notulis</th>
                  <th className="px-5 py-4 text-left font-semibold">Diajukan</th>
                  <th className="px-5 py-4 text-left font-semibold">Versi</th>
                  <th className="px-5 py-4 text-left font-semibold">Status</th>
                  <th className="px-5 py-4 text-center font-semibold">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((row) => {
                  const days = waitingDays(row);
                  const overdue = days > SLA_DAYS;

                  return (
                    <tr key={row.meeting.id} className="border-t border-slate-100 align-top transition hover:bg-blue-50/40">
                      <td className="max-w-sm px-5 py-4">
                        <Link href={`/minutes/${row.meeting.id}`} className="font-semibold text-slate-800 hover:text-blue-700 hover:underline">
                          Notulen {row.meeting.title}
                        </Link>
                        <p className="mt-1 text-xs text-muted-foreground">{row.meeting.number}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <CalendarDays className="size-3" />
                            {formatDate(row.meeting.date)}
                          </span>
                          <span className="text-xs text-slate-400">· {getUnit(row.meeting.unitId)?.name}</span>
                          <Badge variant="outline" className={classificationStyles[row.meeting.classification]}>
                            {row.meeting.classification}
                          </Badge>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        <p className="flex items-center gap-1.5">
                          <UserRound className="size-3.5 text-blue-500" />
                          {row.meeting.leader}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">Notulis: {row.meeting.notetaker || "—"}</p>
                      </td>

                      <td className="px-5 py-4 text-xs text-slate-600">
                        {row.submittedAt ? formatDateTime(row.submittedAt) : "—"}
                        {row.status === "Menunggu Review" && (
                          <p className={`mt-1 font-medium ${overdue ? "text-red-600" : "text-slate-500"}`}>
                            {days === 0 ? "Hari ini" : `Menunggu ${days} hari`}
                            {overdue && " (perlu segera)"}
                          </p>
                        )}
                        {row.status === "Disetujui" && row.minute.approvedBy && (
                          <p className="mt-1 text-slate-500">Oleh {row.minute.approvedBy}</p>
                        )}
                      </td>

                      <td className="px-5 py-4 text-slate-600">{row.version > 0 ? `v${row.version}` : "—"}</td>

                      <td className="px-5 py-4">
                        <Badge variant="outline" className={minuteStatusStyles[row.status]}>{row.status}</Badge>
                      </td>

                      <td className="px-5 py-4 text-center">
                        <Link
                          href={`/minutes/${row.meeting.id}`}
                          className={`inline-flex h-8 items-center rounded-lg px-3 text-xs font-medium transition ${
                            row.status === "Menunggu Review"
                              ? "bg-blue-600 text-white hover:bg-blue-700"
                              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {row.status === "Menunggu Review" ? "Tinjau" : "Buka"}
                        </Link>
                      </td>
                    </tr>
                  );
                })}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      {tab === "Perlu saya tinjau" && !keyword
                        ? "Tidak ada notulen yang menunggu tinjauan Anda."
                        : "Tidak ada notulen yang sesuai dengan filter."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t bg-slate-50/70 px-5 py-3">
            <p className="text-xs text-muted-foreground">
              Menampilkan {filtered.length} dari {rows.length} notulen dalam alur persetujuan
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
