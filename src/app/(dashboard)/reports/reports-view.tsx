"use client";

import * as React from "react";
import { Download, Printer } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { todayJakarta, ACTION_STATUSES } from "@/lib/actions";
import type { Viewer } from "@/lib/access";
import { csvCell } from "@/lib/audit";
import { DEPARTMENTS, MEETING_STATUSES, MEETING_TYPES, UNITS } from "@/lib/meetings";
import {
  EMPTY_FILTERS,
  REPORT_TYPES,
  buildReport,
  visiblePics,
  type ReportFilters,
  type ReportType,
} from "@/lib/reports";

const selectClass =
  "h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";
const exportButton =
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-50";

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] as string);

/**
 * Cetak/simpan PDF lewat jendela cetak khusus (bebas dari sidebar/header aplikasi).
 * Seluruh isi di-escape agar teks dari data tidak dieksekusi sebagai HTML.
 */
function openPrintWindow(title: string, subtitle: string, columns: string[], rows: string[][]) {
  const popup = window.open("", "_blank");

  if (!popup) return false;

  popup.opener = null;

  const head = columns.map((c) => `<th>${escapeHtml(c)}</th>`).join("");
  const body = rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("");

  popup.document.write(`<!doctype html><html lang="id"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
  @page { size: A4 landscape; margin: 12mm; }
  body { font-family: system-ui, sans-serif; color: #0f172a; font-size: 11px; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  p { margin: 2px 0; color: #475569; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th, td { border: 1px solid #cbd5e1; padding: 5px 7px; text-align: left; vertical-align: top; }
  th { background: #eff6ff; }
  tr:last-child.total td, tr.total td { font-weight: 600; }
</style></head><body>
<h1>${escapeHtml(title)}</h1>
<p>${escapeHtml(subtitle)}</p>
<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
</body></html>`);
  popup.document.close();
  popup.focus();
  setTimeout(() => popup.print(), 300);

  return true;
}

export function ReportsView({ viewer }: { viewer: Viewer }) {
  const [type, setType] = React.useState<ReportType>("kinerja");
  const [filters, setFilters] = React.useState<ReportFilters>(EMPTY_FILTERS);
  const [notice, setNotice] = React.useState("");

  const today = todayJakarta();
  const definition = REPORT_TYPES.find((r) => r.id === type) as (typeof REPORT_TYPES)[number];
  const report = buildReport(type, filters, viewer, today);
  const invalidRange = !!filters.from && !!filters.to && filters.from > filters.to;
  const pics = visiblePics(viewer);
  const departments = DEPARTMENTS.filter((d) => filters.unit === "all" || d.unitId === filters.unit);

  const set = <K extends keyof ReportFilters>(key: K, value: ReportFilters[K]) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setNotice("");
  };

  const hasFilter = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS);
  const showMeetingFilters = type !== "action";
  const periodLabel = filters.from || filters.to ? `${filters.from || "…"} s.d. ${filters.to || "…"}` : "Semua periode";
  const subtitle = `Periode: ${periodLabel} · ${report.summary} · Dibuat ${today}`;

  function exportCsv() {
    const csv =
      "\uFEFF" + [report.columns, ...report.rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");

    link.href = url;
    link.download = `laporan-${type}-${today}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    setNotice("File CSV diunduh.");
    // TODO: catat ekspor ini ke audit_logs di server.
  }

  function exportPdf() {
    const opened = openPrintWindow(`Laporan ${definition.name}`, subtitle, report.columns, report.rows);

    setNotice(
      opened
        ? "Jendela cetak dibuka. Pilih “Simpan sebagai PDF” pada pilihan printer."
        : "Pop-up diblokir browser. Izinkan pop-up untuk situs ini lalu coba lagi.",
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Laporan</h1>
        <p className="text-sm text-muted-foreground">
          Rekap rapat, keputusan, dan tindak lanjut per periode, unit, dan PIC. Unduh sebagai CSV atau PDF.
        </p>
      </div>

      {/* JENIS LAPORAN */}
      <div role="tablist" aria-label="Jenis laporan" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {REPORT_TYPES.map((r) => (
          <button
            key={r.id}
            type="button"
            role="tab"
            aria-selected={type === r.id}
            onClick={() => { setType(r.id); setNotice(""); }}
            className={`rounded-xl border p-4 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
              type === r.id ? "border-blue-500 bg-blue-50 shadow-sm" : "border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/40"
            }`}
          >
            <p className={`font-semibold ${type === r.id ? "text-blue-800" : "text-slate-800"}`}>{r.name}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">{r.description}</p>
          </button>
        ))}
      </div>

      <Card className="overflow-hidden border-[#DBEAFE] shadow-sm">
        {/* FILTER */}
        <div className="space-y-3 border-b bg-[#F8FAFC] p-5">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              Dari
              <input type="date" value={filters.from} onChange={(e) => set("from", e.target.value)} className={selectClass} />
            </label>

            <label className="flex items-center gap-2 text-sm text-slate-600">
              Sampai
              <input type="date" value={filters.to} onChange={(e) => set("to", e.target.value)} className={selectClass} />
            </label>

            <select aria-label="Unit" value={filters.unit} onChange={(e) => { set("unit", e.target.value); set("department", "all"); }} className={selectClass}>
              <option value="all">Semua Unit</option>
              {UNITS.map((u) => (<option key={u.id} value={u.id}>{u.name}</option>))}
            </select>

            {type !== "kinerja" && (
              <select
                aria-label="Departemen"
                value={filters.department}
                onChange={(e) => set("department", e.target.value)}
                disabled={filters.unit === "all" || departments.length === 0}
                className={selectClass}
              >
                <option value="all">{filters.unit === "all" ? "Pilih unit dahulu" : "Semua Departemen"}</option>
                {departments.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
              </select>
            )}

            {showMeetingFilters && (
              <select aria-label="Jenis rapat" value={filters.type} onChange={(e) => set("type", e.target.value)} className={selectClass}>
                <option value="all">Semua Jenis Rapat</option>
                {MEETING_TYPES.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
              </select>
            )}

            {type === "rapat" && (
              <select aria-label="Status rapat" value={filters.meetingStatus} onChange={(e) => set("meetingStatus", e.target.value)} className={selectClass}>
                <option value="all">Semua Status Rapat</option>
                {MEETING_STATUSES.map((s) => (<option key={s} value={s}>{s}</option>))}
              </select>
            )}

            {type === "action" && (
              <>
                <select aria-label="PIC" value={filters.pic} onChange={(e) => set("pic", e.target.value)} className={selectClass}>
                  <option value="all">Semua PIC</option>
                  {pics.map((p) => (<option key={p} value={p}>{p}</option>))}
                </select>

                <select aria-label="Status action item" value={filters.actionStatus} onChange={(e) => set("actionStatus", e.target.value)} className={selectClass}>
                  <option value="all">Semua Status</option>
                  {ACTION_STATUSES.map((s) => (<option key={s} value={s}>{s}</option>))}
                </select>
              </>
            )}

            {hasFilter && (
              <button type="button" onClick={() => { setFilters(EMPTY_FILTERS); setNotice(""); }} className="pb-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline">
                Reset filter
              </button>
            )}
          </div>

          {invalidRange && (
            <p role="alert" className="text-xs text-red-600">Tanggal “Dari” tidak boleh setelah tanggal “Sampai”.</p>
          )}
        </div>

        <CardContent className="p-0">
          <div className="flex flex-col gap-3 border-b px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-slate-800">{definition.name}</span> · {report.summary}
            </p>

            <div className="flex gap-2">
              <button type="button" onClick={exportCsv} disabled={report.rows.length === 0 || invalidRange} className={exportButton}>
                <Download className="size-4" />
                CSV
              </button>
              <button type="button" onClick={exportPdf} disabled={report.rows.length === 0 || invalidRange} className={exportButton}>
                <Printer className="size-4" />
                PDF
              </button>
            </div>
          </div>

          {notice && (
            <div role="status" className="border-b bg-emerald-50 px-5 py-2.5 text-sm text-emerald-800">{notice}</div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  {report.columns.map((column) => (
                    <th key={column} className="px-4 py-3 text-left font-semibold">{column}</th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {report.rows.map((row, index) => (
                  <tr
                    key={`${index}-${row[0]}`}
                    className={`border-t border-slate-100 align-top transition hover:bg-blue-50/40 ${row[0] === "Total" ? "bg-slate-50 font-semibold" : ""}`}
                  >
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="px-4 py-3 text-slate-700">{cell}</td>
                    ))}
                  </tr>
                ))}

                {report.rows.length === 0 && (
                  <tr>
                    <td colSpan={report.columns.length} className="py-12 text-center text-muted-foreground">
                      Tidak ada data untuk laporan dan filter ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Laporan hanya memuat rapat yang boleh Anda lihat (klasifikasi Umum/Internal/Rahasia). Rapat dibatalkan tidak
        dihitung sebagai rapat selesai. Action item masuk periode berdasarkan deadline. Pembatasan data ditegakkan
        di server (RLS) saat modul tersambung ke database.
      </p>
    </div>
  );
}
