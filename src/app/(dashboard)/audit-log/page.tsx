"use client";

import * as React from "react";
import { ChevronDown, ChevronRight, Download, Search, ShieldAlert, UserRound, Activity } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { todayJakarta } from "@/lib/actions";
import {
  AUDIT_ACTIONS,
  AUDIT_EVENTS,
  AUDIT_OBJECTS,
  csvCell,
  type AuditAction,
  type AuditEvent,
} from "@/lib/audit";
import { formatDate } from "@/lib/meetings";
import { formatDateTime } from "@/lib/minutes";

const selectClass =
  "h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

const PAGE_SIZE = 10;

const actionStyles: Record<AuditAction, string> = {
  Masuk: "border-slate-200 bg-slate-100 text-slate-600",
  "Masuk gagal": "border-red-200 bg-red-100 text-red-700",
  Keluar: "border-slate-200 bg-slate-100 text-slate-600",
  Buat: "border-blue-200 bg-blue-100 text-blue-700",
  Ubah: "border-sky-200 bg-sky-100 text-sky-700",
  Ajukan: "border-indigo-200 bg-indigo-100 text-indigo-700",
  Setujui: "border-emerald-200 bg-emerald-100 text-emerald-700",
  "Minta revisi": "border-orange-200 bg-orange-100 text-orange-700",
  Verifikasi: "border-emerald-200 bg-emerald-100 text-emerald-700",
  Undang: "border-violet-200 bg-violet-100 text-violet-700",
  "Ubah role": "border-amber-200 bg-amber-100 text-amber-700",
  Nonaktifkan: "border-red-200 bg-red-100 text-red-700",
};

/** Tanggal kejadian (YYYY-MM-DD) dalam zona Asia/Jakarta, untuk filter rentang. */
function dateOf(event: AuditEvent) {
  return new Date(event.at).toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
}

function changesText(event: AuditEvent) {
  return (event.changes ?? [])
    .map((c) => `${c.field}: ${c.before ?? "—"} → ${c.after ?? "—"}`)
    .join("; ");
}

export default function AuditLogPage() {
  const [search, setSearch] = React.useState("");
  const [action, setAction] = React.useState("all");
  const [objectType, setObjectType] = React.useState("all");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [expanded, setExpanded] = React.useState<string[]>([]);
  const [visible, setVisible] = React.useState(PAGE_SIZE);

  const keyword = search.trim().toLowerCase();
  const invalidRange = !!from && !!to && from > to;

  const filtered = AUDIT_EVENTS.filter((event) => {
    const haystack = [event.actor, event.objectLabel, event.summary, event.ip ?? ""].join(" ").toLowerCase();
    const date = dateOf(event);

    return (
      (!keyword || haystack.includes(keyword)) &&
      (action === "all" || event.action === action) &&
      (objectType === "all" || event.objectType === objectType) &&
      (!from || date >= from) &&
      (!to || date <= to)
    );
  }).sort((a, b) => b.at.localeCompare(a.at));

  const shown = filtered.slice(0, visible);
  const failedLogins = AUDIT_EVENTS.filter((e) => e.action === "Masuk gagal").length;
  const actors = new Set(AUDIT_EVENTS.map((e) => e.actor)).size;
  const today = todayJakarta();
  const todayCount = AUDIT_EVENTS.filter((e) => dateOf(e) === today).length;

  const hasFilter = !!keyword || action !== "all" || objectType !== "all" || !!from || !!to;

  function resetFilters() {
    setSearch("");
    setAction("all");
    setObjectType("all");
    setFrom("");
    setTo("");
    setVisible(PAGE_SIZE);
  }

  function toggle(id: string) {
    setExpanded((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));
  }

  function exportCsv() {
    const header = ["Waktu", "Aktor", "Aktivitas", "Jenis Objek", "Objek", "Ringkasan", "Perubahan", "IP"];
    const rows = filtered.map((e) => [
      formatDateTime(e.at),
      e.actor,
      e.action,
      e.objectType,
      e.objectLabel,
      e.summary,
      changesText(e),
      e.ip ?? "",
    ]);

    // BOM agar Excel membaca UTF-8; sel dinetralkan dari injeksi rumus.
    const csv = "\uFEFF" + [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");

    link.href = url;
    link.download = `audit-log-${today}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    // TODO: catat aktivitas ekspor ini sendiri ke audit_logs di server.
  }

  const summary = [
    { label: "Total Kejadian", value: AUDIT_EVENTS.length, icon: Activity, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Hari Ini", value: todayCount, icon: Activity, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "Login Gagal", value: failedLogins, icon: ShieldAlert, color: "text-red-600", bg: "bg-red-50" },
    { label: "Aktor Berbeda", value: actors, icon: UserRound, color: "text-emerald-600", bg: "bg-emerald-50" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
          <p className="text-sm text-muted-foreground">
            Jejak aktivitas penting: siapa, melakukan apa, pada objek apa, dan kapan.
          </p>
        </div>

        <button
          type="button"
          onClick={exportCsv}
          disabled={filtered.length === 0}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="size-4" />
          Unduh CSV ({filtered.length})
        </button>
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
          <div className="flex flex-wrap items-end gap-3">
            <div className="relative sm:w-72">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Cari audit log"
                placeholder="Cari aktor, objek, ringkasan, IP..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setVisible(PAGE_SIZE); }}
                className="w-full border-slate-200 pl-9"
              />
            </div>

            <select aria-label="Filter aktivitas" value={action} onChange={(e) => { setAction(e.target.value); setVisible(PAGE_SIZE); }} className={selectClass}>
              <option value="all">Semua Aktivitas</option>
              {AUDIT_ACTIONS.map((a) => (<option key={a} value={a}>{a}</option>))}
            </select>

            <select aria-label="Filter jenis objek" value={objectType} onChange={(e) => { setObjectType(e.target.value); setVisible(PAGE_SIZE); }} className={selectClass}>
              <option value="all">Semua Objek</option>
              {AUDIT_OBJECTS.map((o) => (<option key={o} value={o}>{o}</option>))}
            </select>

            <label className="flex items-center gap-2 text-sm text-slate-600">
              Dari
              <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setVisible(PAGE_SIZE); }} className={selectClass} />
            </label>

            <label className="flex items-center gap-2 text-sm text-slate-600">
              Sampai
              <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setVisible(PAGE_SIZE); }} className={selectClass} />
            </label>

            {hasFilter && (
              <button type="button" onClick={resetFilters} className="pb-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline">
                Reset filter
              </button>
            )}
          </div>

          {invalidRange && (
            <p role="alert" className="text-xs text-red-600">Tanggal “Dari” tidak boleh setelah tanggal “Sampai”.</p>
          )}
        </div>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="w-10 px-3 py-4" aria-label="Rincian" />
                  <th className="px-3 py-4 text-left font-semibold">Waktu</th>
                  <th className="px-5 py-4 text-left font-semibold">Aktor</th>
                  <th className="px-5 py-4 text-left font-semibold">Aktivitas</th>
                  <th className="px-5 py-4 text-left font-semibold">Objek</th>
                  <th className="px-5 py-4 text-left font-semibold">Ringkasan</th>
                </tr>
              </thead>

              <tbody>
                {shown.map((event) => {
                  const detailed = !!event.changes?.length || !!event.ip;
                  const open = expanded.includes(event.id);

                  return (
                    <React.Fragment key={event.id}>
                      <tr className="border-t border-slate-100 align-top transition hover:bg-blue-50/40">
                        <td className="px-3 py-4">
                          {detailed && (
                            <button
                              type="button"
                              onClick={() => toggle(event.id)}
                              aria-expanded={open}
                              aria-label={`${open ? "Tutup" : "Buka"} rincian kejadian ${event.summary}`}
                              className="inline-flex size-7 items-center justify-center rounded-md text-slate-500 hover:bg-blue-100 hover:text-blue-700"
                            >
                              {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                            </button>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-xs text-slate-600">{formatDateTime(event.at)}</td>
                        <td className="px-5 py-4 font-medium text-slate-800">{event.actor}</td>
                        <td className="px-5 py-4">
                          <Badge variant="outline" className={actionStyles[event.action]}>{event.action}</Badge>
                        </td>
                        <td className="max-w-xs px-5 py-4">
                          <p className="text-xs text-muted-foreground">{event.objectType}</p>
                          <p className="font-medium text-slate-700">{event.objectLabel}</p>
                        </td>
                        <td className="px-5 py-4 text-slate-600">{event.summary}</td>
                      </tr>

                      {open && (
                        <tr className="bg-slate-50/70">
                          <td />
                          <td colSpan={5} className="px-3 py-4">
                            {event.changes && event.changes.length > 0 && (
                              <table className="mb-2 w-full max-w-xl text-xs">
                                <thead className="text-slate-500">
                                  <tr>
                                    <th className="py-1 text-left font-semibold">Kolom</th>
                                    <th className="py-1 text-left font-semibold">Sebelum</th>
                                    <th className="py-1 text-left font-semibold">Sesudah</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {event.changes.map((c) => (
                                    <tr key={c.field} className="border-t border-slate-200">
                                      <td className="py-1.5 font-medium text-slate-700">{c.field}</td>
                                      <td className="py-1.5 text-slate-500">{c.before ?? "—"}</td>
                                      <td className="py-1.5 text-slate-800">{c.after ?? "—"}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                            <p className="text-xs text-slate-500">
                              {formatDate(dateOf(event), { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                              {event.ip && <> · Alamat IP: <span className="font-mono">{event.ip}</span></>}
                            </p>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      Tidak ada kejadian yang sesuai dengan filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col items-center justify-between gap-3 border-t bg-slate-50/70 px-5 py-3 sm:flex-row">
            <p className="text-xs text-muted-foreground">
              Menampilkan {shown.length} dari {filtered.length} kejadian
            </p>

            {filtered.length > visible && (
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
        Audit log bersifat hanya-tambah: tidak dapat diubah atau dihapus dari aplikasi. Kata sandi dan token
        tidak pernah dicatat. Pencatatan otomatis dilakukan di server saat modul tersambung ke database.
      </p>
    </div>
  );
}
