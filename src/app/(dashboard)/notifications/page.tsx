"use client";

import * as React from "react";
import {
  Bell,
  CalendarDays,
  Check,
  CheckCheck,
  ClipboardCheck,
  FileText,
  Search,
  Clock3,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type NotificationCategory =
  | "Rapat"
  | "Persetujuan"
  | "Tindak Lanjut";

type NotificationItem = {
  id: string;
  title: string;
  description: string;
  category: NotificationCategory;
  date: string;
  time: string;
  unread: boolean;
};

const initialNotifications: NotificationItem[] = [
  {
    id: "NTF-001",
    title: "Undangan rapat baru",
    description:
      "Anda diundang ke Rapat Koordinasi Bulanan yang akan dilaksanakan pada 10 November 2026.",
    category: "Rapat",
    date: "05 Nov 2026",
    time: "14:30",
    unread: true,
  },
  {
    id: "NTF-002",
    title: "Notulen menunggu persetujuan",
    description:
      "Notulen Rapat Evaluasi Program Triwulan III membutuhkan persetujuan Anda.",
    category: "Persetujuan",
    date: "05 Nov 2026",
    time: "13:15",
    unread: true,
  },
  {
    id: "NTF-003",
    title: "Tindak lanjut mendekati tenggat",
    description:
      "Tugas penyusunan laporan evaluasi memiliki tenggat waktu 7 November 2026.",
    category: "Tindak Lanjut",
    date: "05 Nov 2026",
    time: "10:00",
    unread: true,
  },
  {
    id: "NTF-004",
    title: "Jadwal rapat diperbarui",
    description:
      "Jadwal Rapat Pengembangan Organisasi mengalami perubahan waktu.",
    category: "Rapat",
    date: "04 Nov 2026",
    time: "16:20",
    unread: false,
  },
  {
    id: "NTF-005",
    title: "Notulen berhasil disetujui",
    description:
      "Notulen Rapat Kerja Tahunan telah disetujui dan tersedia di arsip rapat.",
    category: "Persetujuan",
    date: "04 Nov 2026",
    time: "11:45",
    unread: false,
  },
  {
    id: "NTF-006",
    title: "Tindak lanjut telah diselesaikan",
    description:
      "Tugas pembaruan data peserta rapat telah ditandai selesai.",
    category: "Tindak Lanjut",
    date: "03 Nov 2026",
    time: "09:10",
    unread: false,
  },
];

const categories = [
  "Semua",
  "Rapat",
  "Persetujuan",
  "Tindak Lanjut",
] as const;

type CategoryFilter = (typeof categories)[number];

function getCategoryStyle(category: NotificationCategory) {
  switch (category) {
    case "Rapat":
      return {
        icon: CalendarDays,
        color: "text-blue-600",
        bg: "bg-blue-50",
        badge: "bg-blue-50 text-blue-700 border-blue-100",
      };

    case "Persetujuan":
      return {
        icon: FileText,
        color: "text-violet-600",
        bg: "bg-violet-50",
        badge: "bg-violet-50 text-violet-700 border-violet-100",
      };

    case "Tindak Lanjut":
      return {
        icon: ClipboardCheck,
        color: "text-emerald-600",
        bg: "bg-emerald-50",
        badge: "bg-emerald-50 text-emerald-700 border-emerald-100",
      };
  }
}

export default function NotificationsPage() {
  const [notifications, setNotifications] =
    React.useState<NotificationItem[]>(initialNotifications);

  const [activeCategory, setActiveCategory] =
    React.useState<CategoryFilter>("Semua");

  const [searchQuery, setSearchQuery] = React.useState("");

  const unreadCount = notifications.filter(
    (notification) => notification.unread
  ).length;

  const filteredNotifications = notifications.filter((notification) => {
    const matchesCategory =
      activeCategory === "Semua" ||
      notification.category === activeCategory;

    const matchesSearch =
      notification.title
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      notification.description
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  function markAsRead(id: string) {
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id
          ? { ...notification, unread: false }
          : notification
      )
    );
  }

  function markAllAsRead() {
    setNotifications((current) =>
      current.map((notification) => ({
        ...notification,
        unread: false,
      }))
    );
  }

  return (
    <div className="min-w-0 space-y-6">
      {/* PAGE HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Bell className="h-6 w-6 text-blue-600" />

            <h1 className="text-2xl font-bold tracking-tight text-slate-800">
              Notifikasi
            </h1>
          </div>

          <p className="mt-1 text-sm text-slate-500">
            Pantau informasi, aktivitas, dan pembaruan sistem rapat.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={markAllAsRead}
          disabled={unreadCount === 0}
          className="w-full border-[#DBEAFE] text-blue-700 hover:bg-blue-50 sm:w-auto"
        >
          <CheckCheck className="mr-2 h-4 w-4" />
          Tandai semua dibaca
        </Button>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card className="border-[#DBEAFE] border-t-2 border-t-blue-500 shadow-sm transition hover:shadow-md">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Total Notifikasi
              </p>

              <h3 className="mt-2 text-2xl font-bold text-slate-800">
                {notifications.length}
              </h3>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50">
              <Bell className="h-5 w-5 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#DBEAFE] border-t-2 border-t-amber-500 shadow-sm transition hover:shadow-md">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Belum Dibaca
              </p>

              <h3 className="mt-2 text-2xl font-bold text-slate-800">
                {unreadCount}
              </h3>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50">
              <Clock3 className="h-5 w-5 text-amber-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#DBEAFE] border-t-2 border-t-emerald-500 shadow-sm transition hover:shadow-md">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Sudah Dibaca
              </p>

              <h3 className="mt-2 text-2xl font-bold text-slate-800">
                {notifications.length - unreadCount}
              </h3>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50">
              <Check className="h-5 w-5 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* NOTIFICATION LIST */}
      <Card className="border-[#DBEAFE] shadow-sm">
        <CardContent className="space-y-5 p-5">
          {/* SEARCH */}
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <Input
              placeholder="Cari notifikasi..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="border-[#E2E8F0] pl-9 focus-visible:ring-blue-500"
            />
          </div>

          {/* CATEGORY FILTER */}
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => {
              const isActive = activeCategory === category;

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-[#E2E8F0] bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>

          {/* LIST HEADER */}
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
            <div>
              <h2 className="text-base font-semibold text-slate-800">
                Aktivitas Terbaru
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                {filteredNotifications.length} notifikasi ditemukan
              </p>
            </div>
          </div>

          {/* NOTIFICATION ITEMS */}
          <div className="space-y-3">
            {filteredNotifications.map((notification) => {
              const categoryStyle = getCategoryStyle(
                notification.category
              );

              const CategoryIcon = categoryStyle.icon;

              return (
                <div
                  key={notification.id}
                  className={`group flex gap-3 rounded-xl border p-4 transition-all hover:border-blue-200 hover:shadow-sm sm:gap-4 ${
                    notification.unread
                      ? "border-blue-100 bg-blue-50/40"
                      : "border-slate-100 bg-white"
                  }`}
                >
                  {/* CATEGORY ICON */}
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${categoryStyle.bg}`}
                  >
                    <CategoryIcon
                      className={`h-5 w-5 ${categoryStyle.color}`}
                    />
                  </div>

                  {/* CONTENT */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3
                            className={`text-sm ${
                              notification.unread
                                ? "font-bold text-slate-800"
                                : "font-semibold text-slate-700"
                            }`}
                          >
                            {notification.title}
                          </h3>

                          {notification.unread && (
                            <span className="h-2 w-2 rounded-full bg-blue-600" />
                          )}
                        </div>

                        <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                          {notification.description}
                        </p>
                      </div>

                      <span
                        className={`w-fit shrink-0 rounded-md border px-2 py-1 text-[11px] font-medium ${categoryStyle.badge}`}
                      >
                        {notification.category}
                      </span>
                    </div>

                    {/* FOOTER */}
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Clock3 className="h-3.5 w-3.5" />

                        <span>
                          {notification.date} · {notification.time}
                        </span>
                      </div>

                      {notification.unread && (
                        <button
                          type="button"
                          onClick={() => markAsRead(notification.id)}
                          className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 transition-colors hover:text-blue-800"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Tandai dibaca
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* EMPTY STATE */}
            {filteredNotifications.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#DBEAFE] py-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50">
                  <Bell className="h-6 w-6 text-blue-400" />
                </div>

                <h3 className="mt-4 text-sm font-semibold text-slate-700">
                  Tidak ada notifikasi
                </h3>

                <p className="mt-1 max-w-xs text-xs text-slate-500">
                  Notifikasi yang sesuai dengan pencarian atau filter
                  tidak ditemukan.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}