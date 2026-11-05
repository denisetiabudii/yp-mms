"use client";

import * as React from "react";
import {
  FileCheck,
  Search,
  CalendarDays,
  UserRound,
  Check,
  X,
  Clock3,
  ShieldCheck,
  AlertCircle,
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

type ApprovalStatus = "Menunggu Approval" | "Disetujui" | "Ditolak";

type ApprovalItem = {
  id: string;
  title: string;
  meeting: string;
  date: string;
  author: string;
  submittedAt: string;
  status: ApprovalStatus;
};

const initialApprovals: ApprovalItem[] = [
  {
    id: "APR-001",
    title: "Notulen Rapat Koordinasi Bulanan",
    meeting: "Rapat Koordinasi Bulanan",
    date: "2026-11-05",
    author: "Admin Organisasi",
    submittedAt: "2026-11-05",
    status: "Menunggu Approval",
  },
  {
    id: "APR-002",
    title: "Notulen Evaluasi Program Kerja",
    meeting: "Evaluasi Program Kerja",
    date: "2026-11-02",
    author: "Sekretaris Divisi",
    submittedAt: "2026-11-03",
    status: "Disetujui",
  },
  {
    id: "APR-003",
    title: "Notulen Rapat Keuangan",
    meeting: "Rapat Keuangan Organisasi",
    date: "2026-10-28",
    author: "Bendahara",
    submittedAt: "2026-10-29",
    status: "Menunggu Approval",
  },
  {
    id: "APR-004",
    title: "Notulen Pembahasan Agenda Tahunan",
    meeting: "Pembahasan Agenda Tahunan",
    date: "2026-10-25",
    author: "Sekretaris",
    submittedAt: "2026-10-26",
    status: "Ditolak",
  },
  {
    id: "APR-005",
    title: "Notulen Koordinasi Antar Divisi",
    meeting: "Koordinasi Antar Divisi",
    date: "2026-10-20",
    author: "Admin Organisasi",
    submittedAt: "2026-10-21",
    status: "Menunggu Approval",
  },
];

const statusStyles: Record<string, string> = {
  "Menunggu Approval": "border-amber-200 bg-amber-100 text-amber-700",
  Disetujui: "border-emerald-200 bg-emerald-100 text-emerald-700",
  Ditolak: "border-red-200 bg-red-100 text-red-700",
};

export default function PersetujuanPage() {
  const [approvals, setApprovals] =
    React.useState<ApprovalItem[]>(initialApprovals);

  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string | null>(
    "Semua",
  );

  // Mengubah status approval dokumen.
  const updateStatus = (id: string, status: ApprovalStatus) => {
    setApprovals((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status } : item)),
    );
  };

  // Filter data berdasarkan pencarian dan status.
  const filteredApprovals = approvals.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.id.toLowerCase().includes(search.toLowerCase()) ||
      item.author.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      !statusFilter || statusFilter === "Semua" || item.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const pendingCount = approvals.filter(
    (item) => item.status === "Menunggu Approval",
  ).length;

  const approvedCount = approvals.filter(
    (item) => item.status === "Disetujui",
  ).length;

  const rejectedCount = approvals.filter(
    (item) => item.status === "Ditolak",
  ).length;

  return (
    <div className="space-y-6 pt-20">
      {/* PAGE HEADER */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Persetujuan Notulen
          </h1>
          <p className="text-sm text-muted-foreground">
            Tinjau dan kelola pengajuan dokumentasi hasil rapat.
          </p>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Total Pengajuan",
            value: approvals.length,
            icon: FileCheck,
            color: "text-blue-600",
            bg: "bg-blue-50",
          },
          {
            label: "Menunggu Approval",
            value: pendingCount,
            icon: Clock3,
            color: "text-amber-600",
            bg: "bg-amber-50",
          },
          {
            label: "Disetujui",
            value: approvedCount,
            icon: ShieldCheck,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
          },
          {
            label: "Ditolak",
            value: rejectedCount,
            icon: AlertCircle,
            color: "text-red-600",
            bg: "bg-red-50",
          },
        ].map((item) => (
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

      {/* APPROVAL TABLE */}
      <Card className="overflow-hidden border-[#DBEAFE] shadow-sm">
        <div className="flex flex-col gap-4 border-b bg-[#F8FAFC] p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-semibold">Daftar Pengajuan Notulen</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Periksa dokumen sebelum memberikan persetujuan.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari pengajuan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border-slate-200 pl-9 sm:w-64"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full border-slate-200 sm:w-48">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="Semua">Semua Status</SelectItem>
                <SelectItem value="Menunggu Approval">
                  Menunggu Approval
                </SelectItem>
                <SelectItem value="Disetujui">Disetujui</SelectItem>
                <SelectItem value="Ditolak">Ditolak</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-5 py-4 text-left font-semibold">
                    Informasi Dokumen
                  </th>
                  <th className="px-5 py-4 text-left font-semibold">Rapat</th>
                  <th className="px-5 py-4 text-left font-semibold">
                    Penyusun
                  </th>
                  <th className="px-5 py-4 text-left font-semibold">
                    Tanggal Rapat
                  </th>
                  <th className="px-5 py-4 text-left font-semibold">Status</th>
                  <th className="px-5 py-4 text-center font-semibold">
                    Tindakan
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredApprovals.map((item) => (
                  <tr
                    key={item.id}
                    className="border-t border-slate-100 transition hover:bg-blue-50/40"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-blue-50 p-2">
                          <FileCheck className="size-4 text-blue-600" />
                        </div>

                        <div>
                          <p className="font-semibold text-slate-800">
                            {item.title}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {item.id}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-700">
                        {item.meeting}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 text-slate-600">
                        <UserRound className="size-3.5 text-slate-400" />
                        {item.author}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 text-slate-600">
                        <CalendarDays className="size-3.5 text-blue-500" />
                        {new Date(item.date).toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
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

                    <td className="px-5 py-4">
                      {item.status === "Menunggu Approval" ? (
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            className="h-8 gap-1 bg-emerald-600 px-3 hover:bg-emerald-700"
                            onClick={() => updateStatus(item.id, "Disetujui")}
                          >
                            <Check className="size-3.5" />
                            Setujui
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1 border-red-200 px-3 text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={() => updateStatus(item.id, "Ditolak")}
                          >
                            <X className="size-3.5" />
                            Tolak
                          </Button>
                        </div>
                      ) : (
                        <p className="text-center text-xs text-muted-foreground">
                          Sudah diproses
                        </p>
                      )}
                    </td>
                  </tr>
                ))}

                {filteredApprovals.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-12 text-center text-muted-foreground"
                    >
                      Tidak ada pengajuan yang sesuai.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t bg-slate-50/70 px-5 py-3">
            <p className="text-xs text-muted-foreground">
              Menampilkan {filteredApprovals.length} dari {approvals.length}{" "}
              pengajuan
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
