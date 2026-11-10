
"use client";

import * as React from "react";
import {
  Building2,
  Users,
  Network,
  UserRound,
  Search,
  Plus,
  MoreHorizontal,
  BriefcaseBusiness,
  ShieldCheck,
  Mail,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const organizationData = [
  {
    id: "ORG-001",
    name: "Pengurus Yayasan",
    leader: "Ahmad Fauzi",
    email: "ahmad.fauzi@ypmms.org",
    members: 8,
    type: "Pusat",
    status: "Aktif",
    color: "bg-blue-100 text-blue-600",
  },
  {
    id: "ORG-002",
    name: "Divisi Pendidikan",
    leader: "Siti Rahmawati",
    email: "siti.rahmawati@ypmms.org",
    members: 12,
    type: "Divisi",
    status: "Aktif",
    color: "bg-violet-100 text-violet-600",
  },
  {
    id: "ORG-003",
    name: "Divisi Keuangan",
    leader: "Budi Santoso",
    email: "budi.santoso@ypmms.org",
    members: 6,
    type: "Divisi",
    status: "Aktif",
    color: "bg-emerald-100 text-emerald-600",
  },
  {
    id: "ORG-004",
    name: "Divisi Operasional",
    leader: "Dewi Anggraini",
    email: "dewi.anggraini@ypmms.org",
    members: 10,
    type: "Divisi",
    status: "Aktif",
    color: "bg-amber-100 text-amber-600",
  },
  {
    id: "ORG-005",
    name: "Divisi SDM",
    leader: "Rizky Pratama",
    email: "rizky.pratama@ypmms.org",
    members: 7,
    type: "Divisi",
    status: "Aktif",
    color: "bg-rose-100 text-rose-600",
  },
];

const stats = [
  {
    title: "Total Organisasi",
    value: "5",
    description: "Struktur organisasi terdaftar",
    icon: Building2,
    color: "bg-blue-100 text-blue-600",
    border: "border-t-blue-500",
  },
  {
    title: "Total Anggota",
    value: "43",
    description: "Anggota dalam organisasi",
    icon: Users,
    color: "bg-emerald-100 text-emerald-600",
    border: "border-t-emerald-500",
  },
  {
    title: "Divisi",
    value: "4",
    description: "Unit kerja aktif",
    icon: Network,
    color: "bg-violet-100 text-violet-600",
    border: "border-t-violet-500",
  },
  {
    title: "Pimpinan",
    value: "5",
    description: "Penanggung jawab organisasi",
    icon: ShieldCheck,
    color: "bg-amber-100 text-amber-600",
    border: "border-t-amber-500",
  },
];

export default function OrganizationPage() {
  const [search, setSearch] = React.useState("");

  const filteredOrganizations = organizationData.filter((organization) => {
    const keyword = search.toLowerCase();

    return (
      organization.name.toLowerCase().includes(keyword) ||
      organization.leader.toLowerCase().includes(keyword) ||
      organization.id.toLowerCase().includes(keyword)
    );
  });

  return (
    <div className="min-w-0 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">
            Organisasi
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Kelola struktur organisasi, divisi, dan penanggung jawab.
          </p>
        </div>

        <Button className="w-full gap-2 bg-blue-600 hover:bg-blue-700 sm:w-auto">
          <Plus className="h-4 w-4" />
          Tambah Organisasi
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => {
          const Icon = item.icon;

          return (
            <Card
              key={item.title}
              className={`border-[#DBEAFE] border-t-2 ${item.border} shadow-sm transition hover:shadow-md`}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      {item.title}
                    </p>
                    <h3 className="mt-2 text-2xl font-bold text-slate-800">
                      {item.value}
                    </h3>
                    <p className="mt-1 text-xs text-slate-400">
                      {item.description}
                    </p>
                  </div>

                  <div className={`rounded-xl p-3 ${item.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Organization Hierarchy */}
      <Card className="border-[#DBEAFE] shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 p-5">
          <div className="rounded-xl bg-blue-100 p-2.5 text-blue-600">
            <Network className="h-5 w-5" />
          </div>

          <div>
            <h2 className="font-semibold text-slate-800">
              Struktur Organisasi
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Hierarki unit kerja Yayasan.
            </p>
          </div>
        </div>

        <CardContent className="overflow-x-auto p-6">
          <div className="mx-auto flex min-w-[600px] flex-col items-center">
            {/* Root Organization */}
            <div className="w-64 rounded-xl border border-blue-200 bg-blue-50 p-4 text-center shadow-sm">
              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white">
                <Building2 className="h-5 w-5" />
              </div>

              <p className="font-semibold text-slate-800">
                Pengurus Yayasan
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Ahmad Fauzi · 8 Anggota
              </p>
            </div>

            {/* Connector */}
            <div className="h-8 w-px bg-blue-200" />
            <div className="h-px w-[80%] bg-blue-200" />

            {/* Divisions */}
            <div className="grid w-full grid-cols-4 gap-4">
              {organizationData.slice(1).map((organization) => {
                const Icon =
                  organization.id === "ORG-002"
                    ? BriefcaseBusiness
                    : organization.id === "ORG-003"
                      ? ShieldCheck
                      : organization.id === "ORG-004"
                        ? Building2
                        : Users;

                return (
                  <div
                    key={organization.id}
                    className="flex flex-col items-center"
                  >
                    <div className="h-8 w-px bg-blue-200" />

                    <div className="w-full rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm transition hover:border-blue-300 hover:shadow-md">
                      <div
                        className={`mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${organization.color}`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>

                      <p className="text-sm font-semibold text-slate-800">
                        {organization.name}
                      </p>

                      <p className="mt-2 text-xs text-slate-500">
                        {organization.leader}
                      </p>

                      <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                        <Users className="h-3 w-3" />
                        {organization.members} Anggota
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Organization List */}
      <Card className="overflow-hidden border-[#DBEAFE] shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 bg-[#F8FAFC] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-slate-800">
              Daftar Organisasi & Divisi
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Informasi unit kerja dan penanggung jawab organisasi.
            </p>
          </div>

          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Cari organisasi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-slate-200 bg-white pl-9"
            />
          </div>
        </div>

        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[750px] text-sm">
              <thead className="bg-white text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-4">Organisasi / Divisi</th>
                  <th className="px-5 py-4">Penanggung Jawab</th>
                  <th className="px-5 py-4">Email</th>
                  <th className="px-5 py-4 text-center">Anggota</th>
                  <th className="px-5 py-4">Jenis</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {filteredOrganizations.map((organization) => (
                  <tr
                    key={organization.id}
                    className="border-t border-slate-100 transition hover:bg-blue-50/40"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`rounded-lg p-2 ${organization.color}`}
                        >
                          <Building2 className="h-4 w-4" />
                        </div>

                        <div>
                          <p className="font-medium text-slate-800">
                            {organization.name}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {organization.id}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                          <UserRound className="h-4 w-4" />
                        </div>
                        <span className="font-medium text-slate-700">
                          {organization.leader}
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span className="flex items-center gap-2 text-slate-500">
                        <Mail className="h-4 w-4" />
                        {organization.email}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-center font-medium text-slate-700">
                      {organization.members}
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-lg bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700">
                        {organization.type}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                        {organization.status}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-500 hover:bg-blue-50 hover:text-blue-600"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredOrganizations.length === 0 && (
              <div className="p-10 text-center text-sm text-slate-500">
                Organisasi tidak ditemukan.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
