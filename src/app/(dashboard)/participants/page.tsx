
"use client";

import * as React from "react";
import {
  Users,
  UserCheck,
  UserX,
  Clock3,
  Search,
  Plus,
  MoreHorizontal,
  Mail,
  Building2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type ParticipantStatus = "Hadir" | "Belum Konfirmasi" | "Tidak Hadir";

type Participant = {
  id: string;
  name: string;
  email: string;
  position: string;
  division: string;
  status: ParticipantStatus;
};

const participants: Participant[] = [
  {
    id: "PST-001",
    name: "Ahmad Fauzi",
    email: "ahmad.fauzi@yp-mms.id",
    position: "Ketua Yayasan",
    division: "Pimpinan",
    status: "Hadir",
  },
  {
    id: "PST-002",
    name: "Siti Rahmawati",
    email: "siti.rahmawati@yp-mms.id",
    position: "Sekretaris",
    division: "Administrasi",
    status: "Hadir",
  },
  {
    id: "PST-003",
    name: "Rizky Pratama",
    email: "rizky.pratama@yp-mms.id",
    position: "Kepala Divisi",
    division: "Operasional",
    status: "Belum Konfirmasi",
  },
  {
    id: "PST-004",
    name: "Dewi Anggraini",
    email: "dewi.anggraini@yp-mms.id",
    position: "Staff Administrasi",
    division: "Administrasi",
    status: "Tidak Hadir",
  },
  {
    id: "PST-005",
    name: "Budi Santoso",
    email: "budi.santoso@yp-mms.id",
    position: "Koordinator",
    division: "Keuangan",
    status: "Hadir",
  },
];

const statusStyles: Record<ParticipantStatus, string> = {
  Hadir: "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Belum Konfirmasi": "bg-amber-50 text-amber-700 border-amber-200",
  "Tidak Hadir": "bg-rose-50 text-rose-700 border-rose-200",
};

export default function PesertaPage() {
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("Semua Status");

  const filteredParticipants = participants.filter((participant) => {
    const keyword = search.toLowerCase();

    const matchesSearch =
      participant.name.toLowerCase().includes(keyword) ||
      participant.email.toLowerCase().includes(keyword) ||
      participant.division.toLowerCase().includes(keyword) ||
      participant.id.toLowerCase().includes(keyword);

    const matchesStatus =
      statusFilter === "Semua Status" ||
      participant.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalParticipants = participants.length;
  const presentCount = participants.filter(
    (participant) => participant.status === "Hadir"
  ).length;
  const pendingCount = participants.filter(
    (participant) => participant.status === "Belum Konfirmasi"
  ).length;
  const absentCount = participants.filter(
    (participant) => participant.status === "Tidak Hadir"
  ).length;

  return (
    <div className="space-y-6">
      {/* Page Heading */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">
            Manajemen Peserta
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Kelola data peserta dan status kehadiran rapat.
          </p>
        </div>

        <Button className="bg-blue-600 text-white hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" />
          Tambah Peserta
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-[#DBEAFE] border-t-2 border-t-blue-500 shadow-sm transition hover:shadow-md">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Total Peserta
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-800">
                {totalParticipants}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Seluruh peserta terdaftar
              </p>
            </div>
            <div className="rounded-xl bg-blue-100 p-3 text-blue-600">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#DBEAFE] border-t-2 border-t-emerald-500 shadow-sm transition hover:shadow-md">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Hadir
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-800">
                {presentCount}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Peserta terkonfirmasi hadir
              </p>
            </div>
            <div className="rounded-xl bg-emerald-100 p-3 text-emerald-600">
              <UserCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#DBEAFE] border-t-2 border-t-amber-500 shadow-sm transition hover:shadow-md">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Belum Konfirmasi
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-800">
                {pendingCount}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Menunggu konfirmasi kehadiran
              </p>
            </div>
            <div className="rounded-xl bg-amber-100 p-3 text-amber-600">
              <Clock3 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#DBEAFE] border-t-2 border-t-rose-500 shadow-sm transition hover:shadow-md">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Tidak Hadir
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-800">
                {absentCount}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Peserta tidak menghadiri rapat
              </p>
            </div>
            <div className="rounded-xl bg-rose-100 p-3 text-rose-600">
              <UserX className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Participant Table */}
      <Card className="overflow-hidden border-[#DBEAFE] shadow-sm">
        <div className="flex flex-col gap-4 border-b bg-[#F8FAFC] p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-semibold text-slate-800">
              Daftar Peserta
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Informasi peserta yang terdaftar dalam sistem.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Cari peserta..."
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
              <option>Hadir</option>
              <option>Belum Konfirmasi</option>
              <option>Tidak Hadir</option>
            </select>
          </div>
        </div>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-white text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-4">Peserta</th>
                  <th className="px-5 py-4">Jabatan</th>
                  <th className="px-5 py-4">Unit Kerja</th>
                  <th className="px-5 py-4">Status Kehadiran</th>
                  <th className="px-5 py-4">ID Peserta</th>
                  <th className="px-5 py-4 text-right">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {filteredParticipants.map((participant) => (
                  <tr
                    key={participant.id}
                    className="border-t border-slate-100 transition hover:bg-blue-50/40"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700">
                          {participant.name
                            .split(" ")
                            .map((word) => word[0])
                            .slice(0, 2)
                            .join("")}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">
                            {participant.name}
                          </p>
                          <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                            <Mail className="h-3 w-3" />
                            {participant.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {participant.position}
                    </td>

                    <td className="px-5 py-4">
                      <span className="flex items-center gap-2 text-slate-600">
                        <Building2 className="h-4 w-4 text-slate-400" />
                        {participant.division}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusStyles[participant.status]}`}
                      >
                        {participant.status}
                      </span>
                    </td>

                    <td className="px-5 py-4 font-medium text-slate-500">
                      {participant.id}
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

                {filteredParticipants.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-12 text-center text-slate-500"
                    >
                      <Users className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                      <p className="font-medium">Peserta tidak ditemukan</p>
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
