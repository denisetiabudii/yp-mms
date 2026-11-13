"use client";

import * as React from "react";
import Link from "next/link";
import { Archive, CalendarDays, CheckCircle2, ClipboardList, FileText, Lock, Search, Vote } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { canViewMeeting, type Viewer } from "@/lib/access";
import {
  CLASSIFICATIONS,
  DEPARTMENTS,
  MEETINGS,
  MEETING_TYPES,
  UNITS,
  classificationStyles,
  formatDate,
  getDepartment,
  getMeetingType,
  getUnit,
  meetingStatusStyles,
  minuteStatusStyles,
  type Meeting,
} from "@/lib/meetings";
import { MINUTES } from "@/lib/minutes";

const selectClass =
  "h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";

const PAGE_SIZE = 10;
const ARCHIVED_STATUSES: Meeting["status"][] = ["Selesai", "Dibatalkan"];

type Match = "judul" | "peserta" | "notulen" | null;

/** Teks seluruh isi notulen untuk pencarian teks lengkap. */
function minuteText(meetingId: string) {
  const content = MINUTES.find((m) => m.meetingId === meetingId)?.content;

  if (!content) return "";

  return [
    ...content.agendaNotes.map((n) => n.discussion),
    content.conclusion,
    content.obstacles,
    content.recommendations,
    ...content.decisions.flatMap((d) => [d.text, d.basis]),
  ]
    .join(" ")
    .toLowerCase();
}

/** Di mana kata kunci ditemukan; null bila tidak cocok. */
function matchOf(meeting: Meeting, keyword: string): Match {
  if (!keyword) return "judul";

  const head = [
    meeting.title,
    meeting.number,
    meeting.purpose,
    meeting.leader,
    meeting.notetaker,
    meeting.location,
    getUnit(meeting.unitId)?.name ?? "",
    getDepartment(meeting.departmentId)?.name ?? "",
  ]
    .join(" ")
    .toLowerCase();

  if (head.includes(keyword)) return "judul";
  if (meeting.participants.some((p) => p.name.toLowerCase().includes(keyword))) return "peserta";
  if (minuteText(meeting.id).includes(keyword)) return "notulen";

  return null;
}

const matchLabel: Record<Exclude<Match, null>, string> = {
  judul: "",
  peserta: "Ditemukan pada daftar peserta",
  notulen: "Ditemukan pada isi notulen",
};

export function ArchiveView({ viewer }: { viewer: Viewer }) {
  const [search, setSearch] = React.useState("");
  const [year, setYear] = React.useState("all");
  const [unit, setUnit] = React.useState("all");
  const [department, setDepartment] = React.useState("all");
  const [type, setType] = React.useState("all");
  const [classification, setClassification] = React.useState("all");
  const [minuteStatus, setMinuteStatus] = React.useState("all");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [newestFirst, setNewestFirst] = React.useState(true);
  const [visible, setVisible] = React.useState(PAGE_SIZE);

  // Rapat Rahasia/Internal yang tidak berhak dilihat tidak ikut sama sekali (tidak dihitung, tidak dicari).
  const archive = MEETINGS.filter((m) => ARCHIVED_STATUSES.includes(m.status) && canViewMeeting(m, viewer));

  const years = Array.from(new Set(archive.map((m) => m.date.slice(0, 4)))).sort().reverse();
  const departments = DEPARTMENTS.filter((d) => unit === "all" || d.unitId === unit);
  const keyword = search.trim().toLowerCase();
  const invalidRange = !!from && !!to && from > to;

  const results = archive
    .flatMap((meeting) => {
      const match = matchOf(meeting, keyword);

      return match ? [{ meeting, match }] : [];
    })
    .filter(({ meeting: m }) => {
      return (
        (year === "all" || m.date.startsWith(year)) &&
        (unit === "all" || m.unitId === unit) &&
        (department === "all" || m.departmentId === department) &&
        (type === "all" || m.typeId === type) &&
        (classification === "all" || m.classification === classification) &&
        (minuteStatus === "all" || m.minuteStatus === minuteStatus) &&
        (!from || m.date >= from) &&
        (!to || m.date <= to)
      );
    })
    .sort((a, b) => {
      const order = `${a.meeting.date}${a.meeting.startTime}`.localeCompare(`${b.meeting.date}${b.meeting.startTime}`);

      return newestFirst ? -order : order;
    });

  const shown = results.slice(0, visible);

  const approved = archive.filter((m) => m.minuteStatus === "Disetujui").length;
  const decisions = archive.reduce((sum, m) => sum + m.decisionCount, 0);
  const actions = archive.reduce((sum, m) => sum + m.actionItemCount, 0);

  const hasFilter =
    !!keyword || year !== "all" || unit !== "all" || department !== "all" || type !== "all" ||
    classification !== "all" || minuteStatus !== "all" || !!from || !!to;

  function reset() {
    setSearch(""); setYear("all"); setUnit("all"); setDepartment("all"); setType("all");
    setClassification("all"); setMinuteStatus("all"); setFrom(""); setTo(""); setVisible(PAGE_SIZE);
  }

  /** Bungkus setter agar tiap perubahan filter mengembalikan ke halaman pertama. */
  const onFilter = (setter: (value: string) => void) => (event: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    setter(event.target.value);
    setVisible(PAGE_SIZE);
  };

  const summary = [
    { label: "Rapat Terarsip", value: archive.length, icon: Archive, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Notulen Disetujui", value: approved, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Keputusan", value: decisions, icon: Vote, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Action Item", value: actions, icon: ClipboardList, color: "text-orange-600", bg: "bg-orange-50" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Arsip Rapat</h1>
        <p className="text-sm text-muted-foreground">
          Rapat yang telah selesai atau dibatalkan beserta notulen, keputusan, dan tindak lanjutnya. Pencarian
          mencakup isi notulen.
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
        <div className="space-y-3 border-b bg-[#F8FAFC] p-5">
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Cari arsip"
              placeholder="Cari judul, nomor, peserta, atau isi notulen..."
              value={search}
              onChange={onFilter(setSearch)}
              className="w-full border-slate-200 pl-9"
            />
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <select aria-label="Tahun" value={year} onChange={onFilter(setYear)} className={selectClass}>
              <option value="all">Semua Tahun</option>
              {years.map((y) => (<option key={y} value={y}>{y}</option>))}
            </select>

            <select
              aria-label="Unit"
              value={unit}
              onChange={(e) => { setUnit(e.target.value); setDepartment("all"); setVisible(PAGE_SIZE); }}
              className={selectClass}
            >
              <option value="all">Semua Unit</option>
              {UNITS.map((u) => (<option key={u.id} value={u.id}>{u.name}</option>))}
            </select>

            <select aria-label="Departemen" value={department} onChange={onFilter(setDepartment)} disabled={departments.length === 0 || unit === "all"} className={selectClass}>
              <option value="all">{unit === "all" ? "Pilih unit dahulu" : "Semua Departemen"}</option>
              {departments.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
            </select>

            <select aria-label="Jenis rapat" value={type} onChange={onFilter(setType)} className={selectClass}>
              <option value="all">Semua Jenis</option>
              {MEETING_TYPES.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
            </select>

            <select aria-label="Klasifikasi" value={classification} onChange={onFilter(setClassification)} className={selectClass}>
              <option value="all">Semua Klasifikasi</option>
              {CLASSIFICATIONS.map((c) => (<option key={c} value={c}>{c}</option>))}
            </select>

            <select aria-label="Status notulen" value={minuteStatus} onChange={onFilter(setMinuteStatus)} className={selectClass}>
              <option value="all">Semua Status Notulen</option>
              {["Belum dibuat", "Draft", "Menunggu Review", "Revisi", "Disetujui", "Ditolak"].map((s) => (<option key={s} value={s}>{s}</option>))}
            </select>

            <label className="flex items-center gap-2 text-sm text-slate-600">
              Dari
              <input type="date" value={from} onChange={onFilter(setFrom)} className={selectClass} />
            </label>

            <label className="flex items-center gap-2 text-sm text-slate-600">
              Sampai
              <input type="date" value={to} onChange={onFilter(setTo)} className={selectClass} />
            </label>

            {hasFilter && (
              <button type="button" onClick={reset} className="pb-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline">
                Reset filter
              </button>
            )}
          </div>

          {invalidRange && (
            <p role="alert" className="text-xs text-red-600">Tanggal “Dari” tidak boleh setelah tanggal “Sampai”.</p>
          )}
        </div>

        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b px-5 py-3">
            <p className="text-xs text-muted-foreground">{results.length} rapat ditemukan</p>
            <button
              type="button"
              onClick={() => setNewestFirst((current) => !current)}
              className="text-xs font-medium text-blue-600 hover:underline"
            >
              Urutan: {newestFirst ? "terbaru dahulu" : "terlama dahulu"}
            </button>
          </div>

          <ul className="divide-y divide-slate-100">
            {shown.map(({ meeting, match }) => (
              <li key={meeting.id} className="px-5 py-4 transition hover:bg-blue-50/40">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/meetings/${meeting.id}`} className="font-semibold text-slate-800 hover:text-blue-700 hover:underline">
                        {meeting.title}
                      </Link>
                      <Badge variant="outline" className={classificationStyles[meeting.classification]}>
                        {meeting.classification === "Rahasia" && <Lock className="mr-1 size-3" />}
                        {meeting.classification}
                      </Badge>
                      <Badge variant="outline" className={meetingStatusStyles[meeting.status]}>{meeting.status}</Badge>
                    </div>

                    <p className="mt-1 font-mono text-xs text-muted-foreground">{meeting.number}</p>

                    <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1.5"><CalendarDays className="size-3.5" />{formatDate(meeting.date)}</span>
                      <span>{getUnit(meeting.unitId)?.name}{meeting.departmentId ? ` · ${getDepartment(meeting.departmentId)?.name}` : ""}</span>
                      <span>{getMeetingType(meeting.typeId)?.name}</span>
                      <span>Pimpinan: {meeting.leader}</span>
                    </p>

                    {match !== "judul" && match && (
                      <p className="mt-1.5 text-xs font-medium text-blue-700">{matchLabel[match]}</p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-3 lg:flex-col lg:items-end">
                    <Badge variant="outline" className={minuteStatusStyles[meeting.minuteStatus]}>
                      Notulen: {meeting.minuteStatus}
                    </Badge>

                    <p className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><Vote className="size-3.5" />{meeting.decisionCount}</span>
                      <span className="flex items-center gap-1"><ClipboardList className="size-3.5" />{meeting.actionItemCount}</span>
                    </p>

                    {meeting.minuteStatus !== "Belum dibuat" && (
                      <Link
                        href={`/minutes/${meeting.id}`}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
                      >
                        <FileText className="size-3.5" />
                        Buka notulen
                      </Link>
                    )}
                  </div>
                </div>
              </li>
            ))}

            {results.length === 0 && (
              <li className="py-12 text-center text-sm text-muted-foreground">
                Tidak ada rapat yang sesuai dengan pencarian atau filter.
              </li>
            )}
          </ul>

          <div className="flex flex-col items-center justify-between gap-3 border-t bg-slate-50/70 px-5 py-3 sm:flex-row">
            <p className="text-xs text-muted-foreground">Menampilkan {shown.length} dari {results.length} rapat</p>

            {results.length > visible && (
              <button
                type="button"
                onClick={() => setVisible((current) => current + PAGE_SIZE)}
                className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Muat lebih banyak
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Rapat berklasifikasi Rahasia atau Internal hanya tampil bagi peserta dan pengguna berwenang, dan tidak
        muncul di hasil pencarian bagi yang lain. Pembatasan ini akan ditegakkan di server (RLS), bukan hanya di tampilan.
      </p>
    </div>
  );
}
