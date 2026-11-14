import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  Clock3,
  FileText,
  Link2,
  Lock,
  MapPin,
  UserRound,
  Users,
  Vote,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { MeetingActions } from "@/components/meetings/meeting-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { canManageMeeting } from "@/lib/access";
import { ACTION_ITEMS, isOpen } from "@/lib/actions";
import { getSessionState } from "@/lib/auth/session";
import {
  ATTENDANCE_STATUSES,
  attendanceStyles,
  classificationStyles,
  formatDate,
  formatTimeRange,
  getDepartment,
  getMeeting,
  getMeetingType,
  getUnit,
  meetingStatusStyles,
  minuteStatusStyles,
} from "@/lib/meetings";

type Props = {
  // Next.js 15+: params berupa Promise.
  params: Promise<{ id: string }>;
};

export default async function MeetingDetailPage({ params }: Props) {
  const { id } = await params;
  const meeting = getMeeting(id);

  // TODO (backend): selain "tidak ada", tampilkan notFound() juga untuk rapat
  // yang tidak boleh diakses pengguna (cegah IDOR; jangan bocorkan keberadaannya).
  if (!meeting) notFound();

  const session = await getSessionState();
  const canManage =
    session.status === "ok" &&
    canManageMeeting(meeting, { name: session.user.fullName, role: session.user.role });
  const openActionItems = ACTION_ITEMS.filter((a) => a.meetingId === meeting.id && isOpen(a.status)).length;

  const unit = getUnit(meeting.unitId);
  const department = getDepartment(meeting.departmentId);
  const type = getMeetingType(meeting.typeId);

  const attendanceSummary = ATTENDANCE_STATUSES.map((status) => ({
    status,
    total: meeting.participants.filter((p) => p.attendance === status).length,
  })).filter((item) => item.total > 0);

  const infoRows: { icon: typeof CalendarDays; label: string; value: ReactNode }[] = [
    { icon: CalendarDays, label: "Tanggal", value: formatDate(meeting.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" }) },
    { icon: Clock3, label: "Waktu", value: formatTimeRange(meeting.startTime, meeting.endTime) },
    { icon: MapPin, label: "Tempat", value: `${meeting.location} (${meeting.mode})` },
    { icon: UserRound, label: "Pimpinan rapat", value: meeting.leader },
    { icon: UserRound, label: "Notulis", value: meeting.notetaker || "Belum ditetapkan" },
  ];

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="space-y-3">
        <Link
          href="/meetings"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-700"
        >
          <ArrowLeft className="size-4" />
          Kembali ke daftar rapat
        </Link>

        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
          <div className="min-w-0">
            <p className="font-mono text-xs text-muted-foreground">
              {meeting.number}
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">
              {meeting.title}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {type?.name} · {unit?.name}
              {department ? ` · ${department.name}` : ""}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={meetingStatusStyles[meeting.status]}>
              {meeting.status}
            </Badge>
            <Badge variant="outline" className={classificationStyles[meeting.classification]}>
              {meeting.classification === "Rahasia" && <Lock className="mr-1 size-3" />}
              {meeting.classification}
            </Badge>
          </div>
        </div>
      </div>

      <MeetingActions meeting={meeting} canManage={canManage} openActionItems={openActionItems} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          {/* TUJUAN */}
          {meeting.purpose && (
            <Card className="border-[#DBEAFE] shadow-sm">
              <CardHeader className="border-b bg-[#F8FAFC]">
                <CardTitle className="text-base">Tujuan Rapat</CardTitle>
              </CardHeader>
              <CardContent className="p-5 text-sm leading-6 text-slate-700">
                {meeting.purpose}
              </CardContent>
            </Card>
          )}

          {/* AGENDA */}
          <Card className="border-[#DBEAFE] shadow-sm">
            <CardHeader className="border-b bg-[#F8FAFC]">
              <CardTitle className="text-base">Agenda</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ol className="divide-y divide-slate-100">
                {meeting.agenda.map((item) => (
                  <li key={item.order} className="flex items-start gap-4 px-5 py-4">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700">
                      {item.order}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-800">{item.topic}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Pemilik agenda: {item.owner || "—"}
                      </p>
                    </div>
                    {item.durationMinutes && (
                      <span className="shrink-0 text-xs text-slate-500">
                        {item.durationMinutes} menit
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          {/* PESERTA */}
          <Card className="overflow-hidden border-[#DBEAFE] shadow-sm">
            <CardHeader className="border-b bg-[#F8FAFC]">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="size-4 text-blue-600" />
                Peserta ({meeting.participants.length})
              </CardTitle>
              {attendanceSummary.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {attendanceSummary.map((item) => (
                    <Badge
                      key={item.status}
                      variant="outline"
                      className={attendanceStyles[item.status]}
                    >
                      {item.status}: {item.total}
                    </Badge>
                  ))}
                </div>
              )}
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500">
                    <tr>
                      <th className="px-5 py-3 text-left font-semibold">Nama</th>
                      <th className="px-5 py-3 text-left font-semibold">Jabatan</th>
                      <th className="px-5 py-3 text-left font-semibold">Kehadiran</th>
                      <th className="px-5 py-3 text-left font-semibold">Catatan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {meeting.participants.map((person) => (
                      <tr key={person.name} className="border-t border-slate-100">
                        <td className="px-5 py-3 font-medium text-slate-800">
                          {person.name}
                        </td>
                        <td className="px-5 py-3 text-slate-600">{person.position}</td>
                        <td className="px-5 py-3">
                          <Badge variant="outline" className={attendanceStyles[person.attendance]}>
                            {person.attendance}
                          </Badge>
                        </td>
                        <td className="px-5 py-3 text-xs text-slate-500">
                          {person.note ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SIDEBAR KANAN */}
        <div className="space-y-6">
          <Card className="border-[#DBEAFE] shadow-sm">
            <CardHeader className="border-b bg-[#F8FAFC]">
              <CardTitle className="text-base">Informasi Rapat</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-5">
              {infoRows.map((row) => (
                <div key={row.label} className="flex items-start gap-3">
                  <row.icon className="mt-0.5 size-4 shrink-0 text-blue-500" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{row.label}</p>
                    <p className="text-sm font-medium text-slate-800">{row.value}</p>
                  </div>
                </div>
              ))}

              {meeting.link && (
                <div className="flex items-start gap-3">
                  <Link2 className="mt-0.5 size-4 shrink-0 text-blue-500" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Tautan rapat</p>
                    <a
                      href={meeting.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all text-sm font-medium text-blue-600 hover:underline"
                    >
                      {meeting.link}
                    </a>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-[#DBEAFE] shadow-sm">
            <CardHeader className="border-b bg-[#F8FAFC]">
              <CardTitle className="text-base">Tindak Lanjut Rapat</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-5">
              <Link
                href={`/minutes/${meeting.id}`}
                className="flex items-center justify-between rounded-lg border border-slate-200 p-3 transition hover:border-blue-300 hover:bg-blue-50/50"
              >
                <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <FileText className="size-4 text-sky-600" />
                  Notulen
                </span>
                <Badge variant="outline" className={minuteStatusStyles[meeting.minuteStatus]}>
                  {meeting.minuteStatus}
                </Badge>
              </Link>

              <Link
                href="/decisions"
                className="flex items-center justify-between rounded-lg border border-slate-200 p-3 transition hover:border-blue-300 hover:bg-blue-50/50"
              >
                <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Vote className="size-4 text-purple-600" />
                  Keputusan
                </span>
                <span className="text-sm font-bold text-slate-700">
                  {meeting.decisionCount}
                </span>
              </Link>

              <Link
                href="/action-items"
                className="flex items-center justify-between rounded-lg border border-slate-200 p-3 transition hover:border-blue-300 hover:bg-blue-50/50"
              >
                <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <ClipboardList className="size-4 text-orange-600" />
                  Action item
                </span>
                <span className="text-sm font-bold text-slate-700">
                  {meeting.actionItemCount}
                </span>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
