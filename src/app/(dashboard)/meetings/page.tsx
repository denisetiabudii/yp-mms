"use client";

import * as React from "react";
import Link from "next/link";
import {
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  MapPin,
  Plus,
  Search,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  CLASSIFICATIONS,
  MEETINGS,
  MEETING_STATUSES,
  MEETING_TYPES,
  UNITS,
  classificationStyles,
  formatDate,
  formatTimeRange,
  getDepartment,
  getMeetingType,
  getUnit,
  meetingStatusStyles,
  minuteStatusStyles,
} from "@/lib/meetings";

const selectClass =
  "h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 sm:w-auto";

export default function MeetingsPage() {
  const [search, setSearch] = React.useState("");
  const [unit, setUnit] = React.useState("all");
  const [type, setType] = React.useState("all");
  const [status, setStatus] = React.useState("all");
  const [classification, setClassification] = React.useState("all");

  const keyword = search.trim().toLowerCase();

  /*
    CATATAN KEAMANAN: filter klasifikasi "Rahasia" di sini hanya tampilan.
    Rapat Rahasia harus disembunyikan oleh RLS/server bagi pengguna yang
    tidak berhak (PRD 10 & 15.1), bukan oleh UI.
  */
  const filtered = MEETINGS.filter((meeting) => {
    const haystack = [
      meeting.title,
      meeting.number,
      meeting.leader,
      meeting.location,
      getUnit(meeting.unitId)?.name ?? "",
      getDepartment(meeting.departmentId)?.name ?? "",
    ]
      .join(" ")
      .toLowerCase();

    return (
      (!keyword || haystack.includes(keyword)) &&
      (unit === "all" || meeting.unitId === unit) &&
      (type === "all" || meeting.typeId === type) &&
      (status === "all" || meeting.status === status) &&
      (classification === "all" || meeting.classification === classification)
    );
  }).sort((a, b) =>
    `${b.date}${b.startTime}`.localeCompare(`${a.date}${a.startTime}`),
  );

  const count = (s: (typeof MEETING_STATUSES)[number]) =>
    MEETINGS.filter((meeting) => meeting.status === s).length;

  const summary = [
    {
      label: "Total Rapat",
      value: MEETINGS.length,
      icon: CalendarDays,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Dijadwalkan",
      value: count("Dijadwalkan"),
      icon: CalendarClock,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
    {
      label: "Selesai",
      value: count("Selesai"),
      icon: CheckCircle2,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Dibatalkan",
      value: count("Dibatalkan"),
      icon: XCircle,
      color: "text-red-600",
      bg: "bg-red-50",
    },
  ];

  const hasFilter =
    keyword || unit !== "all" || type !== "all" || status !== "all" || classification !== "all";

  function resetFilters() {
    setSearch("");
    setUnit("all");
    setType("all");
    setStatus("all");
    setClassification("all");
  }

  return (
    <div className="space-y-6">
      {/* PAGE HEADER */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rapat</h1>
          <p className="text-sm text-muted-foreground">
            Daftar rapat seluruh unit sesuai hak akses Anda.
          </p>
        </div>

        <Link
          href="/meetings/new"
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
        >
          <Plus className="size-4" />
          Buat Rapat
        </Link>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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

      {/* LIST */}
      <Card className="overflow-hidden border-[#DBEAFE] shadow-sm">
        <div className="space-y-4 border-b bg-[#F8FAFC] p-5">
          <div>
            <h2 className="font-semibold">Daftar Rapat</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Filter menurut unit, jenis, status, dan klasifikasi.
            </p>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
            <div className="relative lg:w-72">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Cari rapat"
                placeholder="Cari judul, nomor, pimpinan..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full border-slate-200 pl-9"
              />
            </div>

            <select aria-label="Filter unit" value={unit} onChange={(e) => setUnit(e.target.value)} className={selectClass}>
              <option value="all">Semua Unit</option>
              {UNITS.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>

            <select aria-label="Filter jenis rapat" value={type} onChange={(e) => setType(e.target.value)} className={selectClass}>
              <option value="all">Semua Jenis</option>
              {MEETING_TYPES.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>

            <select aria-label="Filter status rapat" value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}>
              <option value="all">Semua Status</option>
              {MEETING_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <select aria-label="Filter klasifikasi" value={classification} onChange={(e) => setClassification(e.target.value)} className={selectClass}>
              <option value="all">Semua Klasifikasi</option>
              {CLASSIFICATIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {hasFilter && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
              >
                Reset filter
              </button>
            )}
          </div>
        </div>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-5 py-4 text-left font-semibold">Rapat</th>
                  <th className="px-5 py-4 text-left font-semibold">Waktu & Tempat</th>
                  <th className="px-5 py-4 text-left font-semibold">Unit</th>
                  <th className="px-5 py-4 text-left font-semibold">Klasifikasi</th>
                  <th className="px-5 py-4 text-left font-semibold">Status</th>
                  <th className="px-5 py-4 text-left font-semibold">Notulen</th>
                  <th className="px-5 py-4 text-center font-semibold">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((meeting) => {
                  const department = getDepartment(meeting.departmentId);

                  return (
                    <tr
                      key={meeting.id}
                      className="border-t border-slate-100 align-top transition hover:bg-blue-50/40"
                    >
                      <td className="px-5 py-4">
                        <Link
                          href={`/meetings/${meeting.id}`}
                          className="font-semibold text-slate-800 hover:text-blue-700 hover:underline"
                        >
                          {meeting.title}
                        </Link>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {meeting.number}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {getMeetingType(meeting.typeId)?.name} · Pimpinan: {meeting.leader}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="size-3.5 text-blue-500" />
                          {formatDate(meeting.date)}
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <Clock3 className="size-3.5 text-slate-400" />
                          {formatTimeRange(meeting.startTime, meeting.endTime)}
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <MapPin className="size-3.5 text-slate-400" />
                          {meeting.location} ({meeting.mode})
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-700">
                          {getUnit(meeting.unitId)?.name}
                        </p>
                        {department && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {department.name}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <Badge variant="outline" className={classificationStyles[meeting.classification]}>
                          {meeting.classification}
                        </Badge>
                      </td>

                      <td className="px-5 py-4">
                        <Badge variant="outline" className={meetingStatusStyles[meeting.status]}>
                          {meeting.status}
                        </Badge>
                      </td>

                      <td className="px-5 py-4">
                        <Badge variant="outline" className={minuteStatusStyles[meeting.minuteStatus]}>
                          {meeting.minuteStatus}
                        </Badge>
                      </td>

                      <td className="px-5 py-4 text-center">
                        <Link
                          href={`/meetings/${meeting.id}`}
                          aria-label={`Lihat detail ${meeting.title}`}
                          className="inline-flex size-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-blue-100 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                        >
                          <Eye className="size-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
                      Tidak ada rapat yang sesuai dengan filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t bg-slate-50/70 px-5 py-3">
            <p className="text-xs text-muted-foreground">
              Menampilkan {filtered.length} dari {MEETINGS.length} rapat
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}