"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Plus,
  Search,
  Vote,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  ACTION_ITEMS,
  DECISION_STATUSES,
  actionStatusStyles,
  buildDecisionRows,
  decisionStatusStyles,
} from "@/lib/actions";
import { formatDate, getMeeting, getUnit, minuteStatusStyles } from "@/lib/meetings";

const selectClass =
  "h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 sm:w-auto";

export default function DecisionsPage() {
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("all");

  const rows = buildDecisionRows(ACTION_ITEMS);
  const keyword = search.trim().toLowerCase();

  const filtered = rows.filter((row) => {
    const meeting = getMeeting(row.meetingId);
    const haystack = [row.text, row.basis, meeting?.title ?? "", meeting?.number ?? ""]
      .join(" ")
      .toLowerCase();

    return (!keyword || haystack.includes(keyword)) && (status === "all" || row.status === status);
  });

  const needAction = rows.filter((row) => row.needsAction);
  const missing = rows.filter((row) => row.status === "Belum ada action item");
  // PRD 14.3: keputusan terbuka = aktif dan masih punya action item belum selesai.
  const open = rows.filter((row) => row.status === "Dalam tindak lanjut");
  const done = rows.filter((row) => row.status === "Selesai");

  const summary = [
    { label: "Total Keputusan", value: rows.length, icon: Vote, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Perlu Tindak Lanjut", value: needAction.length, icon: ClipboardList, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Belum Ada Action Item", value: missing.length, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
    { label: "Keputusan Terbuka", value: open.length, icon: ClipboardList, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Selesai", value: done.length, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Keputusan Rapat</h1>
        <p className="text-sm text-muted-foreground">
          Keputusan dari notulen dan status tindak lanjutnya. Keputusan dicatat di
          editor notulen.
        </p>
      </div>

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

      {missing.length > 0 && (
        <div role="status" className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            <strong>{missing.length} keputusan</strong> memerlukan tindak lanjut tetapi belum
            memiliki action item. Aturan PRD: setiap keputusan yang butuh aksi wajib punya
            minimal satu action item.
          </span>
        </div>
      )}

      <Card className="overflow-hidden border-[#DBEAFE] shadow-sm">
        <div className="flex flex-col gap-3 border-b bg-[#F8FAFC] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">Daftar Keputusan</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Diambil dari seluruh notulen sesuai hak akses Anda.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Cari keputusan"
                placeholder="Cari keputusan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border-slate-200 pl-9 sm:w-64"
              />
            </div>

            <select aria-label="Filter status keputusan" value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}>
              <option value="all">Semua Status</option>
              {DECISION_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-5 py-4 text-left font-semibold">Keputusan</th>
                  <th className="px-5 py-4 text-left font-semibold">Rapat</th>
                  <th className="px-5 py-4 text-left font-semibold">Status</th>
                  <th className="px-5 py-4 text-left font-semibold">Action item</th>
                  <th className="px-5 py-4 text-center font-semibold">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((row) => {
                  const meeting = getMeeting(row.meetingId);
                  const finished = row.actions.filter((a) => a.status === "Selesai").length;

                  return (
                    <tr key={row.key} className="border-t border-slate-100 align-top transition hover:bg-blue-50/40">
                      <td className="max-w-sm px-5 py-4">
                        <p className="font-semibold text-slate-800">{row.text}</p>
                        {row.basis && (
                          <p className="mt-1 text-xs text-muted-foreground">Dasar: {row.basis}</p>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <Link href={`/meetings/${row.meetingId}`} className="font-medium text-slate-700 hover:text-blue-700 hover:underline">
                          {meeting?.title}
                        </Link>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {getUnit(meeting?.unitId ?? "")?.name} · {meeting ? formatDate(meeting.date) : ""}
                        </p>
                        <Link href={`/minutes/${row.meetingId}`} className="mt-1 inline-block">
                          <Badge variant="outline" className={minuteStatusStyles[row.minuteStatus]}>
                            Notulen: {row.minuteStatus}
                          </Badge>
                        </Link>
                      </td>

                      <td className="px-5 py-4">
                        <Badge variant="outline" className={decisionStatusStyles[row.status]}>
                          {row.status}
                        </Badge>
                      </td>

                      <td className="px-5 py-4">
                        {row.actions.length === 0 ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <div className="space-y-1.5">
                            <p className="text-xs text-slate-500">
                              {finished}/{row.actions.length} selesai
                            </p>
                            {row.actions.map((action) => (
                              <Link
                                key={action.id}
                                href={`/action-items/${action.id}`}
                                className="flex items-center gap-2 text-xs text-slate-700 hover:text-blue-700"
                              >
                                <Badge variant="outline" className={actionStatusStyles[action.status]}>
                                  {action.status}
                                </Badge>
                                <span className="truncate">{action.number} · {action.pic}</span>
                              </Link>
                            ))}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4 text-center">
                        {row.needsAction && (
                          <Link
                            href={`/action-items/new?meeting=${row.meetingId}&decision=${row.decisionId}`}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
                          >
                            <Plus className="size-3.5" />
                            Action item
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-muted-foreground">
                      Tidak ada keputusan yang sesuai dengan filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t bg-slate-50/70 px-5 py-3">
            <p className="text-xs text-muted-foreground">
              Menampilkan {filtered.length} dari {rows.length} keputusan
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}