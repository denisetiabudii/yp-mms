
"use client";

import * as React from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
  Plus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const days = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

const meetings = [
  {
    date: 5,
    title: "Rapat Koordinasi",
    time: "09.00 - 10.30",
    location: "Ruang Meeting Utama",
    color: "bg-blue-500",
  },
  {
    date: 8,
    title: "Evaluasi Program",
    time: "13.00 - 14.00",
    location: "Ruang Diskusi",
    color: "bg-emerald-500",
  },
  {
    date: 12,
    title: "Rapat Divisi",
    time: "10.00 - 11.30",
    location: "Online Meeting",
    color: "bg-violet-500",
  },
];

export default function KalenderRapatPage() {
  const [currentDate, setCurrentDate] = React.useState(new Date(2026, 10, 1));

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  const monthName = currentDate.toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });

  const calendarDays = [
    ...Array.from({ length: firstDay }, (_, i) => ({
      date: null,
      key: `empty-${i}`,
    })),
    ...Array.from({ length: totalDays }, (_, i) => ({
      date: i + 1,
      key: `day-${i + 1}`,
    })),
  ];

  const selectedMeetings = meetings.filter(
    (meeting) => meeting.date === 5,
  );

  return (
    <div className="space-y-6 pt-20">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Kalender Rapat
          </h1>
          <p className="text-sm text-muted-foreground">
            Jadwal dan agenda rapat organisasi.
          </p>
        </div>

        <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
          <Plus className="size-4" />
          Buat Rapat
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="overflow-hidden border-[#DBEAFE] shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between border-b bg-[#F8FAFC]">
            <div>
              <CardTitle className="text-lg capitalize">
                {monthName}
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Jadwal kegiatan bulanan
              </p>
            </div>

            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  setCurrentDate(new Date(year, month - 1, 1))
                }
              >
                <ChevronLeft className="size-4" />
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  setCurrentDate(new Date(year, month + 1, 1))
                }
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-3 sm:p-5">
            <div className="grid grid-cols-7">
              {days.map((day) => (
                <div
                  key={day}
                  className="border-b py-3 text-center text-xs font-semibold text-muted-foreground"
                >
                  {day}
                </div>
              ))}

              {calendarDays.map(({ date, key }) => {
                const hasMeeting = meetings.some(
                  (meeting) => meeting.date === date,
                );

                return (
                  <div
                    key={key}
                    className="min-h-[76px] border-b border-r border-[#E2E8F0] p-1 sm:min-h-[100px] sm:p-2"
                  >
                    {date && (
                      <button
                        className={`flex size-7 items-center justify-center rounded-full text-xs font-medium transition hover:bg-blue-100 ${
                          date === 5
                            ? "bg-blue-600 text-white hover:bg-blue-700"
                            : "text-slate-700"
                        }`}
                      >
                        {date}
                      </button>
                    )}

                    {hasMeeting && (
                      <div className="mt-1 space-y-1">
                        {meetings
                          .filter((meeting) => meeting.date === date)
                          .map((meeting) => (
                            <div
                              key={meeting.title}
                              className={`${meeting.color} truncate rounded px-1 py-1 text-[9px] font-medium text-white sm:text-[11px]`}
                            >
                              {meeting.title}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-[#DBEAFE] shadow-sm">
            <CardHeader className="border-b bg-[#F8FAFC]">
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="size-5 text-blue-600" />
                Agenda Hari Ini
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4 p-4">
              {selectedMeetings.length > 0 ? (
                selectedMeetings.map((meeting) => (
                  <div
                    key={meeting.title}
                    className="rounded-lg border border-slate-200 p-3"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-1 size-2.5 shrink-0 rounded-full ${meeting.color}`}
                      />

                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold">
                          {meeting.title}
                        </h3>

                        <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock3 className="size-3.5" />
                          {meeting.time}
                        </p>

                        <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <MapPin className="size-3.5" />
                          {meeting.location}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Tidak ada agenda rapat hari ini.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-[#DBEAFE] shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm">
                Ringkasan Agenda
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-3">
              {[
                ["Total Rapat", meetings.length, "text-blue-600"],
                ["Rapat Mendatang", 2, "text-emerald-600"],
                ["Rapat Selesai", 1, "text-amber-600"],
              ].map(([label, value, color]) => (
                <div
                  key={label}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm text-muted-foreground">
                    {label}
                  </span>
                  <span className={`text-sm font-bold ${color}`}>
                    {value}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
