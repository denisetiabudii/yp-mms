
"use client";

import * as React from "react";
import {
  Users,
  UserCheck,
  ShieldCheck,
  UserPlus,
  Search,
  MoreHorizontal,
  Mail,
  Building2,
  KeyRound,
  Shield,
  CircleCheck,
  CircleX,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const usersData = [
  {
    id: "USR-001",
    name: "Ahmad Fauzi",
    email: "ahmad.fauzi@ypmms.org",
    organization: "Pengurus Yayasan",
    role: "Super Admin",
    status: "Aktif",
    lastLogin: "05 Nov 2026, 09:15",
    initials: "AF",
    color: "bg-blue-100 text-blue-700",
  },
  {
    id: "USR-002",
    name: "Siti Rahmawati",
    email: "siti.rahmawati@ypmms.org",
    organization: "Divisi Pendidikan",
    role: "Admin",
    status: "Aktif",
    lastLogin: "05 Nov 2026, 08:42",
    initials: "SR",
    color: "bg-violet-100 text-violet-700",
  },
  {
    id: "USR-003",
    name: "Budi Santoso",
    email: "budi.santoso@ypmms.org",
    organization: "Divisi Keuangan",
    role: "Sekretaris",
    status: "Aktif",
    lastLogin: "04 Nov 2026, 15:30",
    initials: "BS",
    color: "bg-emerald-100 text-emerald-700",
  },
  {
    id: "USR-004",
    name: "Dewi Anggraini",
    email: "dewi.anggraini@ypmms.org",
    organization: "Divisi Operasional",
    role: "Peserta",
    status: "Aktif",
    lastLogin: "04 Nov 2026, 13:20",
    initials: "DA",
    color: "bg-amber-100 text-amber-700",
  },
  {
    id: "USR-005",
    name: "Rizky Pratama",
    email: "rizky.pratama@ypmms.org",
    organization: "Divisi SDM",
    role: "Peserta",
    status: "Nonaktif",
    lastLogin: "28 Okt 2026, 10:05",
    initials: "RP",
    color: "bg-rose-100 text-rose-700",
  },
  {
    id: "USR-006",
    name: "Nadia Putri",
    email: "nadia.putri@ypmms.org",
    organization: "Divisi Pendidikan",
    role: "Sekretaris",
    status: "Aktif",
    lastLogin: "03 Nov 2026, 11:10",
    initials: "NP",
    color: "bg-cyan-100 text-cyan-700",
  },
];

const stats = [
  {
    title: "Total Pengguna",
    value: "128",
    description: "Seluruh akun terdaftar",
    icon: Users,
    color: "bg-blue-100 text-blue-600",
    border: "border-t-blue-500",
  },
  {
    title: "Pengguna Aktif",
    value: "116",
    description: "Akun dengan akses aktif",
    icon: UserCheck,
    color: "bg-emerald-100 text-emerald-600",
    border: "border-t-emerald-500",
  },
  {
    title: "Administrator",
    value: "8",
    description: "Pengelola sistem",
    icon: ShieldCheck,
    color: "bg-violet-100 text-violet-600",
    border: "border-t-violet-500",
  },
  {
    title: "Nonaktif",
    value: "12",
    description: "Akun yang dinonaktifkan",
    icon: CircleX,
    color: "bg-amber-100 text-amber-600",
    border: "border-t-amber-500",
  },
];

const roleStyles: Record<string, string> = {
  "Super Admin": "bg-violet-100 text-violet-700",
  Admin: "bg-blue-100 text-blue-700",
  Sekretaris: "bg-emerald-100 text-emerald-700",
  Peserta: "bg-slate-100 text-slate-700",
};

export default function UsersPage() {
  const [search, setSearch] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState("Semua Role");
  const [statusFilter, setStatusFilter] = React.useState("Semua Status");

  const filteredUsers = usersData.filter((user) => {
    const keyword = search.toLowerCase();

    const matchesSearch =
      user.name.toLowerCase().includes(keyword) ||
      user.email.toLowerCase().includes(keyword) ||
      user.id.toLowerCase().includes(keyword);

    const matchesRole =
      roleFilter === "Semua Role" || user.role === roleFilter;

    const matchesStatus =
      statusFilter === "Semua Status" || user.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="min-w-0 space-y-6 pt-20">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">
            Pengguna & Hak Akses
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Kelola akun pengguna, peran, dan hak akses sistem.
          </p>
        </div>

        <Button className="w-full gap-2 bg-blue-600 hover:bg-blue-700 sm:w-auto">
          <UserPlus className="h-4 w-4" />
          Tambah Pengguna
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

      {/* Role Overview */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            name: "Super Admin",
            description: "Kontrol penuh seluruh sistem",
            count: 2,
            icon: Shield,
            color: "bg-violet-100 text-violet-600",
          },
          {
            name: "Admin",
            description: "Pengelolaan data dan operasional",
            count: 6,
            icon: ShieldCheck,
            color: "bg-blue-100 text-blue-600",
          },
          {
            name: "Sekretaris",
            description: "Notulen dan administrasi rapat",
            count: 18,
            icon: KeyRound,
            color: "bg-emerald-100 text-emerald-600",
          },
          {
            name: "Peserta",
            description: "Akses partisipasi rapat",
            count: 102,
            icon: Users,
            color: "bg-amber-100 text-amber-600",
          },
        ].map((role) => {
          const Icon = role.icon;

          return (
            <Card
              key={role.name}
              className="border-[#DBEAFE] shadow-sm transition hover:shadow-md"
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`rounded-xl p-3 ${role.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-slate-800">
                        {role.name}
                      </h3>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                        {role.count}
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-slate-500">
                      {role.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Users Table */}
      <Card className="overflow-hidden border-[#DBEAFE] shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 bg-[#F8FAFC] p-5">
          <div>
            <h2 className="font-semibold text-slate-800">
              Daftar Pengguna
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Informasi akun dan hak akses pengguna YP-MMS.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Cari nama, email, atau ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border-slate-200 bg-white pl-9"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-600 outline-none focus:border-blue-400"
            >
              <option>Semua Role</option>
              <option>Super Admin</option>
              <option>Admin</option>
              <option>Sekretaris</option>
              <option>Peserta</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-600 outline-none focus:border-blue-400"
            >
              <option>Semua Status</option>
              <option>Aktif</option>
              <option>Nonaktif</option>
            </select>
          </div>
        </div>

        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[950px] text-sm">
              <thead className="bg-white text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-4">Pengguna</th>
                  <th className="px-5 py-4">Organisasi</th>
                  <th className="px-5 py-4">Role</th>
                  <th className="px-5 py-4">Login Terakhir</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="border-t border-slate-100 transition hover:bg-blue-50/40"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${user.color}`}
                        >
                          {user.initials}
                        </div>

                        <div>
                          <p className="font-medium text-slate-800">
                            {user.name}
                          </p>
                          <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                            <Mail className="h-3 w-3" />
                            {user.email}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {user.id}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span className="flex items-center gap-2 text-slate-600">
                        <Building2 className="h-4 w-4 text-slate-400" />
                        {user.organization}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${roleStyles[user.role]}`}
                      >
                        {user.role}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                      {user.lastLogin}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                          user.status === "Aktif"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        <CircleCheck className="h-3.5 w-3.5" />
                        {user.status}
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

            {filteredUsers.length === 0 && (
              <div className="p-10 text-center text-sm text-slate-500">
                Pengguna tidak ditemukan.
              </div>
            )}
          </div>
        </CardContent>

        <div className="flex flex-col gap-3 border-t border-slate-100 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            Menampilkan {filteredUsers.length} dari {usersData.length} pengguna
            contoh
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled
              className="border-slate-200 text-slate-500"
            >
              Sebelumnya
            </Button>

            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              1
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="border-slate-200 text-slate-500"
            >
              Berikutnya
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
