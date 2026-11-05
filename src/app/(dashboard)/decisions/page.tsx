
"use client";

import * as React from "react";
import {
  Vote,
  CheckCircle2,
  Clock3,
  AlertCircle,
  Search,
  Plus,
  MoreHorizontal,
  CalendarDays,
  UserRound,
  FileText,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type DecisionStatus = "Disepakati" | "Dalam Proses" | "Selesai";
type DecisionPriority = "Tinggi" | "Sedang" | "Rendah";

type Decision = {
  id: string;
  title: string;
  meeting: string;
  date: string;
  responsible: string;
  priority: DecisionPriority;
  status: DecisionStatus;
};

const decisions: Decision[] = [
  {
    id: "DEC-001",
    title: "Pengembangan Program Kerja Tahunan",
    meeting: "Rapat Kerja Tahunan 2026",
    date: "12 Okt 2026",
    responsible: "Ahmad Fauzi",
    priority: "Tinggi",
    status: "Dalam Proses",
  },
  {
    id: "DEC-002",
    title: "Evaluasi Pengelolaan Dana Operasional",
    meeting: "Rapat Evaluasi Keuangan",
    date: "15 Okt 2026",
    responsible: "Budi Santoso",
    priority: "Tinggi",
    status: "Disepakati",
  },
  {
    id: "DEC-003",
    title: "Pembentukan Tim Pelaksana Kegiatan",
    meeting: "Rapat Koordinasi",
    date: "18 Okt 2026",
    responsible: "Rizky Pratama",
    priority: "Sedang",
    status: "Selesai",
  },
  {
    id: "DEC-004",
    title: "Peningkatan Sistem Administrasi",
    meeting: "Rapat Internal Sekretariat",
    date: "20 Okt 2026",
    responsible: "Siti Rahmawati",
    priority: "Sedang",
    status: "Dalam Proses",
  },
  {
    id: "DEC-005",
    title: "Penetapan Jadwal Kegiatan Bulanan",
    meeting: "Rapat Perencanaan",
    date: "22 Okt 2026",
    responsible: "Dewi Anggraini",
    priority: "Rendah",
    status: "Disepakati",
  },
];

const statusStyles: Record<DecisionStatus, string> = {
  Disepakati: "bg-blue-50 text-blue-700 border-blue-200",
  "Dalam Proses": "bg-amber-50 text-amber-700 border-amber-200",
  Selesai: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const priorityStyles: Record<DecisionPriority, string> = {
  Tinggi: "bg-rose-50 text-rose-700 border-rose-200",
  Sedang: "bg-amber-50 text-amber-700 border-amber-200",
  Rendah: "bg-slate-100 text-slate-600 border-slate-200",
};

export default function DecisionsPage() {
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("Semua Status");

  const filteredDecisions = decisions.filter((decision) => {
    const keyword = search.toLowerCase();

    const matchesSearch =
      decision.title.toLowerCase().includes(keyword) ||
      decision.meeting.toLowerCase().includes(keyword) ||
      decision.responsible.toLowerCase().includes(keyword) ||
      decision.id.toLowerCase().includes(keyword);

    const matchesStatus =
      statusFilter === "Semua Status" ||
      decision.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalDecisions = decisions.length;
  const inProgressCount = decisions.filter(
    (decision) => decision.status === "Dalam Proses"
  ).length;
  const agreedCount = decisions.filter(
    (decision) => decision.status === "Disepakati"
  ).length;
  const completedCount = decisions.filter(
    (decision) => decision.status === "Selesai"
  ).length;

  return (
    <div className="space-y-6 pt-20">
      {/* Page Heading */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">
            Keputusan Rapat
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Dokumentasikan dan pantau keputusan yang dihasilkan dari rapat.
          </p>
        </div>

        <Button className="bg-blue-600 text-white hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" />
          Tambah Keputusan
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-[#DBEAFE] border-t-2 border-t-blue-500 shadow-sm transition hover:shadow-md">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Total Keputusan
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-800">
                {totalDecisions}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Seluruh keputusan rapat
              </p>
            </div>
            <div className="rounded-xl bg-blue-100 p-3 text-blue-600">
              <Vote className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#DBEAFE] border-t-2 border-t-amber-500 shadow-sm transition hover:shadow-md">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Dalam Proses
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-800">
                {inProgressCount}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Keputusan sedang ditindaklanjuti
              </p>
            </div>
            <div className="rounded-xl bg-amber-100 p-3 text-amber-600">
              <Clock3 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#DBEAFE] border-t-2 border-t-indigo-500 shadow-sm transition hover:shadow-md">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Disepakati
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-800">
                {agreedCount}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Keputusan telah disetujui
              </p>
            </div>
            <div className="rounded-xl bg-indigo-100 p-3 text-indigo-600">
              <AlertCircle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#DBEAFE] border-t-2 border-t-emerald-500 shadow-sm transition hover:shadow-md">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Selesai
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-800">
                {completedCount}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Keputusan telah dilaksanakan
              </p>
            </div>
            <div className="rounded-xl bg-emerald-100 p-3 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Decision Table */}
      <Card className="overflow-hidden border-[#DBEAFE] shadow-sm">
        <div className="flex flex-col gap-4 border-b bg-[#F8FAFC] p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-semibold text-slate-800">
              Daftar Keputusan
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Keputusan yang tercatat dalam sistem YP-MMS.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Cari keputusan..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full border-slate-200 bg-white pl-9 sm:w-[240px]"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-600 outline-none focus:border-blue-400"
            >
              <option>Semua Status</option>
              <option>Disepakati</option>
              <option>Dalam Proses</option>
              <option>Selesai</option>
            </select>
          </div>
        </div>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-sm">
              <thead className="bg-white text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-4">Keputusan</th>
                  <th className="px-5 py-4">Rapat</th>
                  <th className="px-5 py-4">Penanggung Jawab</th>
                  <th className="px-5 py-4">Prioritas</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Tanggal</th>
                  <th className="px-5 py-4 text-right">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {filteredDecisions.map((decision) => (
                  <tr
                    key={decision.id}
                    className="border-t border-slate-100 transition hover:bg-blue-50/40"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">
                            {decision.title}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {decision.id}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {decision.meeting}
                    </td>

                    <td className="px-5 py-4">
                      <span className="flex items-center gap-2 text-slate-600">
                        <UserRound className="h-4 w-4 text-slate-400" />
                        {decision.responsible}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${priorityStyles[decision.priority]}`}
                      >
                        {decision.priority}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusStyles[decision.status]}`}
                      >
                        {decision.status}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span className="flex items-center gap-2 whitespace-nowrap text-slate-600">
                        <CalendarDays className="h-4 w-4 text-slate-400" />
                        {decision.date}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-500 hover:bg-blue-100 hover:text-blue-600"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}

                {filteredDecisions.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-12 text-center text-slate-500"
                    >
                      <Vote className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                      <p className="font-medium">
                        Keputusan tidak ditemukan
                      </p>
                      <p className="mt-1 text-xs">
                        Coba gunakan kata kunci atau filter lainnya.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
