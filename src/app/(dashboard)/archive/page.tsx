
"use client";

import * as React from "react";
import {
  Archive,
  Search,
  CalendarDays,
  Users,
  FileText,
  CheckCircle2,
  Clock3,
  Eye,
  Download,
  FolderArchive,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type ArchiveItem = {
  id: string;
  title: string;
  category: string;
  date: string;
  year: string;
  participants: number;
  documents: number;
  status: "Lengkap" | "Belum Lengkap";
};

const archiveData: ArchiveItem[] = [
  {
    id: "ARS-001",
    title: "Rapat Koordinasi Bulanan",
    category: "Rapat Koordinasi",
    date: "2026-10-15",
    year: "2026",
    participants: 18,
    documents: 4,
    status: "Lengkap",
  },
  {
    id: "ARS-002",
    title: "Evaluasi Program Kerja Yayasan",
    category: "Rapat Evaluasi",
    date: "2026-09-28",
    year: "2026",
    participants: 15,
    documents: 3,
    status: "Lengkap",
  },
  {
    id: "ARS-003",
    title: "Rapat Manajemen dan Keuangan",
    category: "Rapat Manajemen",
    date: "2026-08-20",
    year: "2026",
    participants: 12,
    documents: 2,
    status: "Belum Lengkap",
  },
  {
    id: "ARS-004",
    title: "Pembahasan Rencana Strategis",
    category: "Rapat Strategis",
    date: "2026-07-12",
    year: "2026",
    participants: 20,
    documents: 5,
    status: "Lengkap",
  },
  {
    id: "ARS-005",
    title: "Koordinasi Antar Divisi",
    category: "Rapat Koordinasi",
    date: "2026-06-05",
    year: "2026",
    participants: 10,
    documents: 3,
    status: "Lengkap",
  },
  {
    id: "ARS-006",
    title: "Rapat Evaluasi Tahunan",
    category: "Rapat Evaluasi",
    date: "2025-12-18",
    year: "2025",
    participants: 25,
    documents: 6,
    status: "Lengkap",
  },
];

const statusStyles: Record<string, string> = {
  Lengkap: "border-emerald-200 bg-emerald-100 text-emerald-700",
  "Belum Lengkap": "border-amber-200 bg-amber-100 text-amber-700",
};

export default function ArchivePage() {
  const [search, setSearch] = React.useState("");
  const [yearFilter, setYearFilter] = React.useState<string | null>("Semua");
  const [statusFilter, setStatusFilter] = React.useState<string | null>("Semua");

  // Filter arsip berdasarkan pencarian, tahun, dan status.
  const filteredArchives = archiveData.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.id.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase());

    const matchesYear =
      !yearFilter || yearFilter === "Semua" || item.year === yearFilter;

    const matchesStatus =
      !statusFilter || statusFilter === "Semua" || item.status === statusFilter;

    return matchesSearch && matchesYear && matchesStatus;
  });

  const completeCount = archiveData.filter(
    (item) => item.status === "Lengkap",
  ).length;

  const incompleteCount = archiveData.filter(
    (item) => item.status === "Belum Lengkap",
  ).length;

  const totalDocuments = archiveData.reduce(
    (total, item) => total + item.documents,
    0,
  );

  return (
    <div className="min-w-0 space-y-6 pt-20">
      {/* PAGE HEADER */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">
            Arsip Rapat
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Kelola dan telusuri dokumentasi rapat yang telah disimpan.
          </p>
        </div>

        <Button className="gap-2 bg-blue-600 text-white hover:bg-blue-700">
          <Download className="size-4" />
          Export Arsip
        </Button>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Total Arsip Rapat",
            value: archiveData.length,
            icon: Archive,
            color: "text-blue-600",
            bg: "bg-blue-50",
          },
          {
            label: "Dokumen Tersimpan",
            value: totalDocuments,
            icon: FileText,
            color: "text-violet-600",
            bg: "bg-violet-50",
          },
          {
            label: "Arsip Lengkap",
            value: completeCount,
            icon: CheckCircle2,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
          },
          {
            label: "Arsip Belum Lengkap",
            value: incompleteCount,
            icon: Clock3,
            color: "text-amber-600",
            bg: "bg-amber-50",
          },
        ].map((item) => (
          <Card
            key={item.label}
            className="border-[#DBEAFE] border-t-2 border-t-blue-500 shadow-sm transition hover:shadow-md"
          >
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-slate-500">{item.label}</p>
                <p className="mt-2 text-2xl font-bold text-slate-800">
                  {item.value}
                </p>
              </div>

              <div className={`rounded-xl p-3 ${item.bg}`}>
                <item.icon className={`size-5 ${item.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ARCHIVE TABLE */}
      <Card className="min-w-0 overflow-hidden border-[#DBEAFE] shadow-sm">
        <div className="flex flex-col gap-4 border-b border-[#DBEAFE] bg-[#F8FAFC] p-5">
          <div>
            <h2 className="font-semibold text-slate-800">
              Daftar Arsip Rapat
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Riwayat rapat dan dokumen pendukung yang tersimpan.
            </p>
          </div>

          {/* FILTER */}
          <div className="grid min-w-0 gap-3 md:grid-cols-3">
            <div className="relative min-w-0">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Cari arsip rapat..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 border-[#DBEAFE] bg-white pl-9"
              />
            </div>

            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="h-10 min-w-0 border-[#DBEAFE] bg-white">
                <SelectValue placeholder="Filter tahun" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="Semua">Semua Tahun</SelectItem>
                <SelectItem value="2026">2026</SelectItem>
                <SelectItem value="2025">2025</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10 min-w-0 border-[#DBEAFE] bg-white">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="Semua">Semua Status</SelectItem>
                <SelectItem value="Lengkap">Lengkap</SelectItem>
                <SelectItem value="Belum Lengkap">Belum Lengkap</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-sm">
              <thead className="bg-[#F8FAFC] text-xs text-slate-500">
                <tr>
                  <th className="px-5 py-4 text-left font-semibold">
                    Informasi Rapat
                  </th>
                  <th className="px-5 py-4 text-left font-semibold">
                    Kategori
                  </th>
                  <th className="px-5 py-4 text-left font-semibold">
                    Tanggal
                  </th>
                  <th className="px-5 py-4 text-center font-semibold">
                    Peserta
                  </th>
                  <th className="px-5 py-4 text-center font-semibold">
                    Dokumen
                  </th>
                  <th className="px-5 py-4 text-left font-semibold">
                    Status Arsip
                  </th>
                  <th className="px-5 py-4 text-center font-semibold">
                    Aksi
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredArchives.map((item) => (
                  <tr
                    key={item.id}
                    className="border-t border-slate-100 transition hover:bg-blue-50/40"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-blue-50 p-2">
                          <FolderArchive className="size-4 text-blue-600" />
                        </div>

                        <div>
                          <p className="font-semibold text-slate-800">
                            {item.title}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {item.id}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <Badge
                        variant="outline"
                        className="border-blue-200 bg-blue-50 text-blue-700"
                      >
                        {item.category}
                      </Badge>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4">
                      <div className="flex items-center gap-2 text-slate-600">
                        <CalendarDays className="size-3.5 text-blue-500" />
                        {new Date(item.date).toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-center">
                      <div className="inline-flex items-center justify-center gap-2 text-slate-600">
                        <Users className="size-3.5 text-slate-400" />
                        {item.participants}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-center">
                      <div className="inline-flex items-center justify-center gap-2 text-slate-600">
                        <FileText className="size-3.5 text-slate-400" />
                        {item.documents}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <Badge
                        variant="outline"
                        className={statusStyles[item.status]}
                      >
                        {item.status}
                      </Badge>
                    </td>

                    <td className="px-5 py-4 text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-slate-500 hover:bg-blue-100 hover:text-blue-700"
                        title="Lihat arsip"
                      >
                        <Eye className="size-4" />
                      </Button>
                    </td>
                  </tr>
                ))}

                {filteredArchives.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-12 text-center text-slate-500"
                    >
                      <div className="flex flex-col items-center gap-3">
                        <div className="rounded-full bg-slate-100 p-4">
                          <Archive className="size-6 text-slate-400" />
                        </div>

                        <div>
                          <p className="font-medium text-slate-700">
                            Arsip tidak ditemukan
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
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

          {/* TABLE FOOTER */}
          <div className="flex items-center justify-between border-t border-[#DBEAFE] bg-slate-50/70 px-5 py-3">
            <p className="text-xs text-slate-500">
              Menampilkan {filteredArchives.length} dari {archiveData.length}{" "}
              arsip
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
