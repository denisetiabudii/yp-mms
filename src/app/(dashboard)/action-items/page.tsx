"use client";

import * as React from "react";
import {
  ClipboardList,
  Search,
  Plus,
  MoreHorizontal,
  CalendarDays,
  UserRound,
  CheckCircle2,
  Clock3,
  AlertCircle,
  CircleDashed,
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

const actionItems = [
  {
    id: "ACT-001",
    title: "Menyusun laporan evaluasi program kerja",
    meeting: "Rapat Evaluasi Program Kerja",
    assignee: "Sekretaris Divisi",
    deadline: "2026-11-08",
    priority: "Tinggi",
    status: "Dalam Proses",
  },
  {
    id: "ACT-002",
    title: "Memperbarui anggaran kegiatan tahunan",
    meeting: "Rapat Keuangan Organisasi",
    assignee: "Bendahara",
    deadline: "2026-11-10",
    priority: "Tinggi",
    status: "Belum Dimulai",
  },
  {
    id: "ACT-003",
    title: "Mengirim dokumentasi kegiatan",
    meeting: "Rapat Koordinasi Bulanan",
    assignee: "Admin Organisasi",
    deadline: "2026-11-06",
    priority: "Sedang",
    status: "Selesai",
  },
  {
    id: "ACT-004",
    title: "Membuat jadwal koordinasi antar divisi",
    meeting: "Rapat Koordinasi Bulanan",
    assignee: "Koordinator Divisi",
    deadline: "2026-11-12",
    priority: "Sedang",
    status: "Dalam Proses",
  },
  {
    id: "ACT-005",
    title: "Menyiapkan proposal kegiatan berikutnya",
    meeting: "Pembahasan Agenda Tahunan",
    assignee: "Sekretaris",
    deadline: "2026-11-15",
    priority: "Rendah",
    status: "Belum Dimulai",
  },
];

const statusStyles: Record<string, string> = {
  "Belum Dimulai": "border-slate-200 bg-slate-100 text-slate-600",
  "Dalam Proses": "border-blue-200 bg-blue-100 text-blue-700",
  Selesai: "border-emerald-200 bg-emerald-100 text-emerald-700",
  Terlambat: "border-red-200 bg-red-100 text-red-700",
};

const priorityStyles: Record<string, string> = {
  Tinggi: "border-red-200 bg-red-50 text-red-600",
  Sedang: "border-amber-200 bg-amber-50 text-amber-700",
  Rendah: "border-slate-200 bg-slate-100 text-slate-600",
};

export default function ActionItemsPage() {
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string | null>("Semua");

  const filteredItems = actionItems.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.id.toLowerCase().includes(search.toLowerCase()) ||
      item.assignee.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      !statusFilter ||
      statusFilter === "Semua" ||
      item.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const completedCount = actionItems.filter(
    (item) => item.status === "Selesai",
  ).length;

  const inProgressCount = actionItems.filter(
    (item) => item.status === "Dalam Proses",
  ).length;

  const pendingCount = actionItems.filter(
    (item) => item.status === "Belum Dimulai",
  ).length;

  return (
    <div className="space-y-6 pt-20">
      {/* PAGE HEADER */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Action Items</h1>
          <p className="text-sm text-muted-foreground">
            Pantau tindak lanjut dan tanggung jawab hasil rapat organisasi.
          </p>
        </div>

        <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
          <Plus className="size-4" />
          Buat Action Item
        </Button>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Total Action Items",
            value: actionItems.length,
            icon: ClipboardList,
            color: "text-blue-600",
            bg: "bg-blue-50",
          },
          {
            label: "Belum Dimulai",
            value: pendingCount,
            icon: CircleDashed,
            color: "text-slate-600",
            bg: "bg-slate-100",
          },
          {
            label: "Dalam Proses",
            value: inProgressCount,
            icon: Clock3,
            color: "text-amber-600",
            bg: "bg-amber-50",
          },
          {
            label: "Selesai",
            value: completedCount,
            icon: CheckCircle2,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
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

      {/* ACTION ITEMS TABLE */}
      <Card className="overflow-hidden border-[#DBEAFE] shadow-sm">
        <div className="flex flex-col gap-4 border-b bg-[#F8FAFC] p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-semibold">Daftar Tindak Lanjut</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Kelola tugas, PIC, dan progres tindak lanjut rapat.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari action item..."
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
                <SelectItem value="Belum Dimulai">Belum Dimulai</SelectItem>
                <SelectItem value="Dalam Proses">Dalam Proses</SelectItem>
                <SelectItem value="Selesai">Selesai</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-5 py-4 text-left font-semibold">
                    Action Item
                  </th>
                  <th className="px-5 py-4 text-left font-semibold">Rapat</th>
                  <th className="px-5 py-4 text-left font-semibold">PIC</th>
                  <th className="px-5 py-4 text-left font-semibold">
                    Deadline
                  </th>
                  <th className="px-5 py-4 text-left font-semibold">
                    Prioritas
                  </th>
                  <th className="px-5 py-4 text-left font-semibold">Status</th>
                  <th className="px-5 py-4 text-center font-semibold">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    className="border-t border-slate-100 transition hover:bg-blue-50/40"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-blue-50 p-2">
                          <ClipboardList className="size-4 text-blue-600" />
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
                        {item.assignee}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 text-slate-600">
                        <CalendarDays className="size-3.5 text-blue-500" />
                        {new Date(item.deadline).toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <Badge
                        variant="outline"
                        className={priorityStyles[item.priority]}
                      >
                        {item.priority}
                      </Badge>
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
                      >
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </td>
                  </tr>
                ))}

                {filteredItems.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-12 text-center text-muted-foreground"
                    >
                      <AlertCircle className="mx-auto mb-2 size-5" />
                      Tidak ada action item yang sesuai.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t bg-slate-50/70 px-5 py-3">
            <p className="text-xs text-muted-foreground">
              Menampilkan {filteredItems.length} dari {actionItems.length}{" "}
              action item
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}