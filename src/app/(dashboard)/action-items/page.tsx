"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  LayoutGrid,
  ListTodo,
  Plus,
  Rows3,
  Search,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  ACTION_ITEMS,
  ACTION_STATUSES,
  CURRENT_USER,
  PRIORITIES,
  actionStatusStyles,
  completionRate,
  getMeetingTitle,
  isOverdue,
  onTimeRate,
  priorityStyles,
  todayJakarta,
  type ActionItem,
} from "@/lib/actions";
import { formatDate } from "@/lib/meetings";

const selectClass =
  "h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 sm:w-auto";

const TABS = ["Semua", "Tugas saya", "Terlambat"] as const;
type Tab = (typeof TABS)[number];

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progres"
        className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-200"
      >
        <div className="h-full rounded-full bg-blue-500" style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs text-slate-500">{value}%</span>
    </div>
  );
}

function DeadlineCell({ item, today }: { item: ActionItem; today: string }) {
  const overdue = isOverdue(item, today);

  return (
    <div className={`flex items-center gap-2 ${overdue ? "font-medium text-red-600" : "text-slate-600"}`}>
      {overdue ? <AlertTriangle className="size-3.5" /> : <CalendarDays className="size-3.5 text-blue-500" />}
      {formatDate(item.deadline)}
      {overdue && <span className="text-xs">(terlambat)</span>}
    </div>
  );
}

export default function ActionItemsPage() {
  const [search, setSearch] = React.useState("");
  const [tab, setTab] = React.useState<Tab>("Semua");
  const [status, setStatus] = React.useState("all");
  const [priority, setPriority] = React.useState("all");
  const [view, setView] = React.useState<"daftar" | "kanban">("daftar");

  const today = todayJakarta();
  const keyword = search.trim().toLowerCase();

  const filtered = ACTION_ITEMS.filter((item) => {
    const haystack = [item.title, item.number, item.pic, getMeetingTitle(item.meetingId) ?? ""]
      .join(" ")
      .toLowerCase();

    const matchesTab =
      tab === "Semua" ||
      (tab === "Tugas saya" && (item.pic === CURRENT_USER || item.supporters.includes(CURRENT_USER))) ||
      (tab === "Terlambat" && isOverdue(item, today));

    return (
      matchesTab &&
      (!keyword || haystack.includes(keyword)) &&
      (status === "all" || item.status === status) &&
      (priority === "all" || item.priority === priority)
    );
  }).sort((a, b) => a.deadline.localeCompare(b.deadline));

  const count = (s: ActionItem["status"]) => ACTION_ITEMS.filter((i) => i.status === s).length;
  const overdueCount = ACTION_ITEMS.filter((i) => isOverdue(i, today)).length;
  const mineCount = ACTION_ITEMS.filter((i) => i.pic === CURRENT_USER || i.supporters.includes(CURRENT_USER)).length;

  const completion = completionRate(ACTION_ITEMS);
  const onTime = onTimeRate(ACTION_ITEMS);

  const summary = [
    { label: "Total", value: ACTION_ITEMS.length, icon: ListTodo, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Berjalan", value: count("Berjalan") + count("Belum dimulai"), icon: Clock3, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "Menunggu Verifikasi", value: count("Menunggu verifikasi"), icon: Clock3, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Selesai", value: count("Selesai"), icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Terlambat", value: overdueCount, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
  ];

  const tabCount = (t: Tab) => (t === "Semua" ? ACTION_ITEMS.length : t === "Tugas saya" ? mineCount : overdueCount);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tindak Lanjut</h1>
          <p className="text-sm text-muted-foreground">
            Tugas hasil keputusan rapat: PIC, deadline, progres, dan verifikasi.
          </p>
        </div>

        <Link
          href="/action-items/new"
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
        >
          <Plus className="size-4" />
          Buat Action Item
        </Link>
      </div>

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

      <p className="text-xs text-muted-foreground">
        Tingkat penyelesaian: <strong>{completion ?? "—"}{completion !== null && "%"}</strong>
        {" · "}
        Tepat waktu: <strong>{onTime ?? "—"}{onTime !== null && "%"}</strong>{" "}
        (definisi PRD 14.3; dibatalkan tidak dihitung).
      </p>

      <Card className="overflow-hidden border-[#DBEAFE] shadow-sm">
        <div className="space-y-4 border-b bg-[#F8FAFC] p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div role="tablist" aria-label="Filter tugas" className="flex flex-wrap gap-1.5">
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

            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
              {(
                [
                  ["daftar", "Daftar", Rows3],
                  ["kanban", "Kanban", LayoutGrid],
                ] as const
              ).map(([value, label, Icon]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={view === value}
                  onClick={() => setView(value)}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition ${
                    view === value ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-blue-50"
                  }`}
                >
                  <Icon className="size-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <div className="relative sm:w-72">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Cari action item"
                placeholder="Cari tugas, nomor, PIC..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border-slate-200 pl-9"
              />
            </div>

            {view === "daftar" && (
              <select aria-label="Filter status" value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}>
                <option value="all">Semua Status</option>
                {ACTION_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            )}

            <select aria-label="Filter prioritas" value={priority} onChange={(e) => setPriority(e.target.value)} className={selectClass}>
              <option value="all">Semua Prioritas</option>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>

        <CardContent className="p-0">
          {view === "daftar" ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-5 py-4 text-left font-semibold">Tugas</th>
                    <th className="px-5 py-4 text-left font-semibold">PIC</th>
                    <th className="px-5 py-4 text-left font-semibold">Deadline</th>
                    <th className="px-5 py-4 text-left font-semibold">Prioritas</th>
                    <th className="px-5 py-4 text-left font-semibold">Progres</th>
                    <th className="px-5 py-4 text-left font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr key={item.id} className="border-t border-slate-100 align-top transition hover:bg-blue-50/40">
                      <td className="max-w-sm px-5 py-4">
                        <Link href={`/action-items/${item.id}`} className="font-semibold text-slate-800 hover:text-blue-700 hover:underline">
                          {item.title}
                        </Link>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {item.number} · {getMeetingTitle(item.meetingId) ?? "Instruksi langsung"}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        <p>{item.pic}</p>
                        {item.supporters.length > 0 && (
                          <p className="mt-1 text-xs text-muted-foreground">+ {item.supporters.join(", ")}</p>
                        )}
                      </td>
                      <td className="px-5 py-4"><DeadlineCell item={item} today={today} /></td>
                      <td className="px-5 py-4">
                        <Badge variant="outline" className={priorityStyles[item.priority]}>{item.priority}</Badge>
                      </td>
                      <td className="px-5 py-4"><ProgressBar value={item.progress} /></td>
                      <td className="px-5 py-4">
                        <Badge variant="outline" className={actionStatusStyles[item.status]}>{item.status}</Badge>
                      </td>
                    </tr>
                  ))}

                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-muted-foreground">
                        Tidak ada action item yang sesuai dengan filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid gap-4 overflow-x-auto p-5 md:grid-cols-2 xl:grid-cols-5">
              {ACTION_STATUSES.map((column) => {
                const items = filtered.filter((item) => item.status === column);

                return (
                  <section key={column} aria-label={column} className="min-w-[210px] rounded-xl bg-slate-50 p-3">
                    <h3 className="mb-3 flex items-center justify-between text-xs font-semibold text-slate-600">
                      {column}
                      <span className="rounded-full bg-white px-2 py-0.5 text-slate-500">{items.length}</span>
                    </h3>

                    <div className="space-y-3">
                      {items.map((item) => (
                        <Link
                          key={item.id}
                          href={`/action-items/${item.id}`}
                          className="block rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:border-blue-300 hover:shadow"
                        >
                          <p className="text-sm font-medium leading-5 text-slate-800">{item.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{item.number} · {item.pic}</p>
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <Badge variant="outline" className={priorityStyles[item.priority]}>{item.priority}</Badge>
                            <span className={`text-xs ${isOverdue(item, today) ? "font-medium text-red-600" : "text-slate-500"}`}>
                              {formatDate(item.deadline, { day: "2-digit", month: "short" })}
                            </span>
                          </div>
                          <div className="mt-2"><ProgressBar value={item.progress} /></div>
                        </Link>
                      ))}

                      {items.length === 0 && (
                        <p className="rounded-lg border border-dashed border-slate-200 py-6 text-center text-xs text-slate-400">
                          Kosong
                        </p>
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          )}

          <div className="border-t bg-slate-50/70 px-5 py-3">
            <p className="text-xs text-muted-foreground">
              Menampilkan {filtered.length} dari {ACTION_ITEMS.length} action item
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}