"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileClock,
  FileText,
  Lock,
  RotateCcw,
  Search,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  MEETINGS,
  MINUTE_STATUSES,
  classificationStyles,
  formatDate,
  getUnit,
  minuteStatusStyles,
  type MinuteStatus,
} from "@/lib/meetings";
import { MINUTES } from "@/lib/minutes";

/** Tab status sesuai PRD bagian 13: Draft, Menunggu review, Disetujui, Revisi. */
const TABS = ["Semua", ...MINUTE_STATUSES.filter((s) => s !== "Belum dibuat")] as const;
type Tab = (typeof TABS)[number];

/**
 * Pembungkus: membaca `?q=` dari URL (dikirim kolom cari di header).
 * useSearchParams wajib berada di dalam <Suspense>. `key={query}` membuat
 * tampilan dibuat ulang saat query berubah sehingga kolom cari ikut terisi.
 */
export default function NotulenPage() {
  return (
    <Suspense fallback={null}>
      <MinutesFromUrl />
    </Suspense>
  );
}

function MinutesFromUrl() {
  const query = useSearchParams().get("q") ?? "";

  return <MinutesView key={query} initialSearch={query} />;
}

function MinutesView({ initialSearch }: { initialSearch: string }) {
  const [search, setSearch] = React.useState(initialSearch);
  const [tab, setTab] = React.useState<Tab>("Semua");

  // Gabungkan rapat + notulennya. Status & versi diambil dari data notulen.
  const rows = MEETINGS.flatMap((meeting) => {
    const minute = MINUTES.find((m) => m.meetingId === meeting.id);
    const status: MinuteStatus = minute?.status ?? meeting.minuteStatus;

    if (status === "Belum dibuat") return [];

    return [
      {
        meeting,
        status,
        version: minute?.versions.length ?? 0,
        updatedAt: minute?.events[0]?.at ?? "",
      },
    ];
  });

  // Rapat selesai yang belum punya notulen: perlu ditindaklanjuti notulis.
  const missing = MEETINGS.filter(
    (meeting) =>
      meeting.status === "Selesai" &&
      !MINUTES.some((m) => m.meetingId === meeting.id) &&
      meeting.minuteStatus === "Belum dibuat",
  );

  const keyword = search.trim().toLowerCase();

  const filtered = rows.filter(({ meeting, status }) => {
    const haystack = [
      meeting.title,
      meeting.number,
      meeting.leader,
      meeting.notetaker,
      getUnit(meeting.unitId)?.name ?? "",
      formatDate(meeting.date),
    ]
      .join(" ")
      .toLowerCase();

    return (!keyword || haystack.includes(keyword)) && (tab === "Semua" || status === tab);
  });

  const count = (s: MinuteStatus) => rows.filter((row) => row.status === s).length;

  const summary = [
    { label: "Total Notulen", value: rows.length, icon: FileText, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Draft", value: count("Draft"), icon: FileClock, color: "text-slate-600", bg: "bg-slate-100" },
    { label: "Menunggu Review", value: count("Menunggu Review"), icon: Clock3, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Revisi / Ditolak", value: count("Revisi") + count("Ditolak"), icon: RotateCcw, color: "text-orange-600", bg: "bg-orange-50" },
    { label: "Disetujui", value: count("Disetujui"), icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
  ];

  const tabCount = (t: Tab) => (t === "Semua" ? rows.length : count(t));

  return (
    <div className="space-y-6">
      {/* PAGE HEADER */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Notulen Rapat</h1>
        <p className="text-sm text-muted-foreground">
          Dokumentasi hasil pembahasan dan keputusan rapat. Notulen dibuat dari halaman rapat.
        </p>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {summary.map((item) => (
          <Card
            key={item.label}
            className="border-[#DBEAFE] border-t-2 border-t-blue-500 shadow-sm transition hover:shadow-md"
          >
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

      {/* RAPAT BELUM BERNOTULEN */}
      {missing.length > 0 && (
        <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-medium">
            {missing.length} rapat selesai belum memiliki notulen:
          </p>
          <ul className="mt-1 space-y-1">
            {missing.map((meeting) => (
              <li key={meeting.id}>
                <Link href={`/minutes/${meeting.id}`} className="underline hover:text-amber-900">
                  {meeting.title}
                </Link>{" "}
                <span className="text-xs">({formatDate(meeting.date)})</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* TABLE */}
      <Card className="overflow-hidden border-[#DBEAFE] shadow-sm">
        <div className="space-y-4 border-b bg-[#F8FAFC] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div role="tablist" aria-label="Filter status notulen" className="flex flex-wrap gap-1.5">
              {TABS.map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={tab === t}
                  onClick={() => setTab(t)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    tab === t
                      ? "bg-blue-600 text-white"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-blue-50"
                  }`}
                >
                  {t} ({tabCount(t)})
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari notulen..."
                aria-label="Cari notulen"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border-slate-200 pl-9 lg:w-72"
              />
            </div>
          </div>
        </div>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-5 py-4 text-left font-semibold">Notulen</th>
                  <th className="px-5 py-4 text-left font-semibold">Tanggal Rapat</th>
                  <th className="px-5 py-4 text-left font-semibold">Unit</th>
                  <th className="px-5 py-4 text-left font-semibold">Notulis / Pimpinan</th>
                  <th className="px-5 py-4 text-left font-semibold">Versi</th>
                  <th className="px-5 py-4 text-left font-semibold">Status</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map(({ meeting, status, version }) => (
                  <tr
                    key={meeting.id}
                    className="border-t border-slate-100 align-top transition hover:bg-blue-50/40"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-blue-50 p-2">
                          <FileText className="size-4 text-blue-600" />
                        </div>
                        <div>
                          <Link
                            href={`/minutes/${meeting.id}`}
                            className="font-semibold text-slate-800 hover:text-blue-700 hover:underline"
                          >
                            Notulen {meeting.title}
                          </Link>
                          <p className="mt-1 text-xs text-muted-foreground">{meeting.number}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="size-3.5 text-blue-500" />
                        {formatDate(meeting.date)}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-700">{getUnit(meeting.unitId)?.name}</p>
                      <Badge variant="outline" className={`mt-1 ${classificationStyles[meeting.classification]}`}>
                        {meeting.classification === "Rahasia" && <Lock className="mr-1 size-3" />}
                        {meeting.classification}
                      </Badge>
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      <p>{meeting.notetaker || "—"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{meeting.leader}</p>
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {version > 0 ? `v${version}` : "—"}
                    </td>

                    <td className="px-5 py-4">
                      <Badge variant="outline" className={minuteStatusStyles[status]}>
                        {status}
                      </Badge>
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      Tidak ada notulen yang sesuai dengan pencarian.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t bg-slate-50/70 px-5 py-3">
            <p className="text-xs text-muted-foreground">
              Menampilkan {filtered.length} dari {rows.length} notulen
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}