"use client";

import * as React from "react";
import {
  CalendarDays,
  Users,
  ClipboardCheck,
  CheckCircle2,
  Clock3,
  Download,
  TrendingUp,
  FileText,
  Search,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const reportData = [
  {
    id: "RPT-001",
    title: "Evaluasi Program Kerja Yayasan",
    date: "05 Nov 2026",
    category: "Rapat Evaluasi",
    participants: 18,
    attendance: 94,
    decisions: 5,
    followUps: 4,
    status: "Selesai",
  },
  {
    id: "RPT-002",
    title: "Koordinasi Pengembangan Pendidikan",
    date: "03 Nov 2026",
    category: "Rapat Koordinasi",
    participants: 15,
    attendance: 87,
    decisions: 3,
    followUps: 2,
    status: "Selesai",
  },
  {
    id: "RPT-003",
    title: "Rapat Manajemen dan Keuangan",
    date: "30 Okt 2026",
    category: "Rapat Manajemen",
    participants: 12,
    attendance: 92,
    decisions: 4,
    followUps: 3,
    status: "Selesai",
  },
  {
    id: "RPT-004",
    title: "Pembahasan Rencana Strategis",
    date: "28 Okt 2026",
    category: "Rapat Strategis",
    participants: 20,
    attendance: 90,
    decisions: 6,
    followUps: 5,
    status: "Dalam Proses",
  },
  {
    id: "RPT-005",
    title: "Koordinasi Antar Divisi",
    date: "25 Okt 2026",
    category: "Rapat Koordinasi",
    participants: 10,
    attendance: 80,
    decisions: 2,
    followUps: 1,
    status: "Selesai",
  },
];

const chartData = [
  { month: "Jun", value: 22 },
  { month: "Jul", value: 31 },
  { month: "Agu", value: 26 },
  { month: "Sep", value: 38 },
  { month: "Okt", value: 34 },
  { month: "Nov", value: 48 },
];

const categories = [
  "Semua Kategori",
  "Rapat Evaluasi",
  "Rapat Koordinasi",
  "Rapat Manajemen",
  "Rapat Strategis",
];

const periods = [
  "Semua Periode",
  "November 2026",
  "Oktober 2026",
  "September 2026",
];

export default function ReportsPage() {
  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState("Semua Kategori");
  const [period, setPeriod] = React.useState("Semua Periode");

  // Filter laporan berdasarkan pencarian, kategori, dan periode.
  const filteredReports = reportData.filter((report) => {
    const matchesSearch =
      report.title.toLowerCase().includes(search.toLowerCase()) ||
      report.id.toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      category === "Semua Kategori" || report.category === category;

    const matchesPeriod =
      period === "Semua Periode" ||
      (period === "November 2026" && report.date.includes("Nov")) ||
      (period === "Oktober 2026" && report.date.includes("Okt")) ||
      (period === "September 2026" && report.date.includes("Sep"));

    return matchesSearch && matchesCategory && matchesPeriod;
  });

  return (
    <div className="min-w-0 space-y-6 pt-20">
      {/* Header halaman */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">
            Laporan Rapat
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Ringkasan dan analisis aktivitas rapat organisasi.
          </p>
        </div>

        <Button className="shrink-0 gap-2 bg-blue-600 text-white hover:bg-blue-700">
          <Download className="size-4" />
          Export Laporan
        </Button>
      </div>

      {/* Statistik laporan */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-[#DBEAFE] border-t-2 border-t-blue-500 shadow-sm transition hover:shadow-md">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Total Rapat
                </p>
                <h3 className="mt-2 text-2xl font-bold text-slate-800">48</h3>
                <p className="mt-1 flex items-center gap-1 text-xs text-emerald-600">
                  <TrendingUp className="size-3.5" />
                  +12% dari bulan lalu
                </p>
              </div>

              <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                <CalendarDays className="size-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#DBEAFE] border-t-2 border-t-cyan-500 shadow-sm transition hover:shadow-md">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Rata-rata Kehadiran
                </p>
                <h3 className="mt-2 text-2xl font-bold text-slate-800">
                  89,4%
                </h3>
                <p className="mt-1 flex items-center gap-1 text-xs text-emerald-600">
                  <TrendingUp className="size-3.5" />
                  +4,2% dari bulan lalu
                </p>
              </div>

              <div className="rounded-xl bg-cyan-50 p-3 text-cyan-600">
                <Users className="size-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#DBEAFE] border-t-2 border-t-violet-500 shadow-sm transition hover:shadow-md">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Total Keputusan
                </p>
                <h3 className="mt-2 text-2xl font-bold text-slate-800">126</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Keputusan dari seluruh rapat
                </p>
              </div>

              <div className="rounded-xl bg-violet-50 p-3 text-violet-600">
                <ClipboardCheck className="size-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#DBEAFE] border-t-2 border-t-emerald-500 shadow-sm transition hover:shadow-md">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Tindak Lanjut Selesai
                </p>
                <h3 className="mt-2 text-2xl font-bold text-slate-800">78%</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Penyelesaian tindak lanjut
                </p>
              </div>

              <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
                <CheckCircle2 className="size-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grafik dan ringkasan tindak lanjut */}
      <div className="grid min-w-0 gap-4 xl:grid-cols-3">
        {/* Grafik aktivitas rapat */}
        <Card className="min-w-0 border-[#DBEAFE] shadow-sm xl:col-span-2">
          <div className="flex flex-col gap-3 border-b border-[#DBEAFE] bg-[#F8FAFC] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-slate-800">Aktivitas Rapat</h2>
              <p className="mt-1 text-sm text-slate-500">
                Jumlah rapat selama enam bulan terakhir
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-[#DBEAFE] bg-white px-3 py-2 text-sm text-slate-600">
              <CalendarDays className="size-4 text-blue-500" />
              Jun - Nov 2026
            </div>
          </div>

          <CardContent className="p-5">
            <div className="flex h-[260px] min-w-0 items-end justify-between gap-3 sm:gap-5">
              {chartData.map((item) => (
                <div
                  key={item.month}
                  className="flex h-full flex-1 flex-col items-center justify-end gap-2"
                >
                  <span className="text-xs font-semibold text-slate-600">
                    {item.value}
                  </span>

                  <div className="flex w-full flex-1 items-end justify-center">
                    <div
                      className="w-full max-w-[42px] rounded-t-md bg-blue-500 transition-all duration-300 hover:bg-blue-600"
                      style={{
                        height: `${(item.value / 48) * 100}%`,
                      }}
                    />
                  </div>

                  <span className="text-xs font-medium text-slate-500">
                    {item.month}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-center gap-2 border-t border-slate-100 pt-4">
              <span className="size-2.5 rounded-sm bg-blue-500" />
              <span className="text-xs text-slate-500">
                Jumlah rapat per bulan
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Ringkasan tindak lanjut */}
        <Card className="min-w-0 border-[#DBEAFE] shadow-sm">
          <div className="border-b border-[#DBEAFE] bg-[#F8FAFC] p-5">
            <h2 className="font-semibold text-slate-800">Tindak Lanjut</h2>
            <p className="mt-1 text-sm text-slate-500">
              Status penyelesaian keputusan rapat
            </p>
          </div>

          <CardContent className="space-y-5 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-600">
                  <CheckCircle2 className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">Selesai</p>
                  <p className="text-xs text-slate-500">
                    Tindak lanjut terpenuhi
                  </p>
                </div>
              </div>

              <span className="text-lg font-bold text-emerald-600">78%</span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{ width: "78%" }}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-amber-50 p-2.5 text-amber-600">
                  <Clock3 className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    Dalam Proses
                  </p>
                  <p className="text-xs text-slate-500">Sedang dikerjakan</p>
                </div>
              </div>

              <span className="text-lg font-bold text-amber-600">15%</span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-amber-500"
                style={{ width: "15%" }}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-rose-50 p-2.5 text-rose-600">
                  <FileText className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    Belum Dimulai
                  </p>
                  <p className="text-xs text-slate-500">Menunggu pelaksanaan</p>
                </div>
              </div>

              <span className="text-lg font-bold text-rose-600">7%</span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-rose-500"
                style={{ width: "7%" }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daftar laporan rapat */}
      <Card className="min-w-0 overflow-hidden border-[#DBEAFE] shadow-sm">
        <div className="flex flex-col gap-4 border-b border-[#DBEAFE] bg-[#F8FAFC] p-5">
          <div>
            <h2 className="font-semibold text-slate-800">
              Daftar Laporan Rapat
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Informasi lengkap hasil dan aktivitas rapat organisasi.
            </p>
          </div>

          {/* Filter laporan */}
          <div className="grid min-w-0 gap-3 md:grid-cols-3">
            <div className="relative min-w-0">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />

              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari laporan rapat..."
                className="h-10 border-[#DBEAFE] bg-white pl-9"
              />
            </div>

            <select
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
              className="h-10 min-w-0 rounded-md border border-[#DBEAFE] bg-white px-3 text-sm text-slate-600 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {periods.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="h-10 min-w-0 rounded-md border border-[#DBEAFE] bg-white px-3 text-sm text-slate-600 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabel laporan */}
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <thead className="bg-[#F8FAFC] text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4">ID Laporan</th>
                <th className="px-5 py-4">Nama Rapat</th>
                <th className="px-5 py-4">Tanggal</th>
                <th className="px-5 py-4">Kategori</th>
                <th className="px-5 py-4 text-center">Peserta</th>
                <th className="px-5 py-4 text-center">Kehadiran</th>
                <th className="px-5 py-4 text-center">Keputusan</th>
                <th className="px-5 py-4 text-center">Tindak Lanjut</th>
                <th className="px-5 py-4">Status</th>
              </tr>
            </thead>

            <tbody>
              {filteredReports.map((report) => (
                <tr
                  key={report.id}
                  className="border-t border-slate-100 transition hover:bg-blue-50/40"
                >
                  <td className="whitespace-nowrap px-5 py-4 font-medium text-blue-600">
                    {report.id}
                  </td>

                  <td className="max-w-[240px] px-5 py-4 font-medium text-slate-700">
                    {report.title}
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                    {report.date}
                  </td>

                  <td className="whitespace-nowrap px-5 py-4">
                    <span className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                      {report.category}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-center text-slate-600">
                    {report.participants}
                  </td>

                  <td className="px-5 py-4 text-center">
                    <span className="font-medium text-emerald-600">
                      {report.attendance}%
                    </span>
                  </td>

                  <td className="px-5 py-4 text-center text-slate-600">
                    {report.decisions}
                  </td>

                  <td className="px-5 py-4 text-center text-slate-600">
                    {report.followUps}
                  </td>

                  <td className="whitespace-nowrap px-5 py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                        report.status === "Selesai"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      <span
                        className={`mr-1.5 size-1.5 rounded-full ${
                          report.status === "Selesai"
                            ? "bg-emerald-500"
                            : "bg-amber-500"
                        }`}
                      />
                      {report.status}
                    </span>
                  </td>
                </tr>
              ))}

              {/* Tampilan ketika hasil filter kosong */}
              {filteredReports.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="rounded-full bg-slate-100 p-4">
                        <FileText className="size-6 text-slate-400" />
                      </div>

                      <div>
                        <p className="font-medium text-slate-700">
                          Laporan tidak ditemukan
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Coba ubah kata kunci atau filter pencarian.
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer tabel */}
        <div className="flex flex-col gap-2 border-t border-[#DBEAFE] bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            Menampilkan{" "}
            <span className="font-semibold text-slate-700">
              {filteredReports.length}
            </span>{" "}
            dari{" "}
            <span className="font-semibold text-slate-700">
              {reportData.length}
            </span>{" "}
            laporan
          </p>

          <p className="text-xs text-slate-400">
            Data laporan rapat organisasi
          </p>
        </div>
      </Card>
    </div>
  );
}
