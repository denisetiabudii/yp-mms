import Link from "next/link";
import {
  CalendarDays,
  CalendarClock,
  ClipboardCheck,
  ListTodo,
  Clock,
  MapPin,
  Video,
  Users,
  Plus,
  ArrowRight,
  Inbox,
  type LucideIcon,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/* -------------------------------------------------------------------------- */
/* Rute                                                                       */
/* -------------------------------------------------------------------------- */

/** Rute pembuatan notulen baru. Sesuaikan dengan rute di aplikasi. */
const NEW_MINUTES_ROUTE = "/meetings/new";

/* -------------------------------------------------------------------------- */
/* Data                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * true  = tampilkan data contoh supaya desain bisa dinilai.
 * false = tampilkan kondisi kosong.
 * Saat backend siap, ganti `data` di bawah dengan hasil query dan hapus
 * seluruh data contoh.
 */
const SHOW_SAMPLE_DATA = true;

type Meeting = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string;
  location: string;
  mode: "Online" | "Tatap muka";
  participants: number;
};

type PendingApproval = {
  id: string;
  title: string;
  meetingDate: string; // YYYY-MM-DD
  author: string;
  waitingDays: number;
};

type ActionItem = {
  id: string;
  title: string;
  assignee: string;
  meeting: string;
  due: string; // YYYY-MM-DD
  overdue: boolean;
};

type Decision = {
  id: string;
  text: string;
  meeting: string;
  date: string; // YYYY-MM-DD
};

type DashboardData = {
  summary: {
    totalMeetings: number;
    upcomingMeetings: number;
    pendingApprovals: number;
    activeActions: number;
    overdueActions: number;
  };
  actionProgress: { done: number; total: number };
  upcomingMeetings: Meeting[];
  pendingApprovals: PendingApproval[];
  actionItems: ActionItem[];
  decisions: Decision[];
};

const emptyData: DashboardData = {
  summary: {
    totalMeetings: 0,
    upcomingMeetings: 0,
    pendingApprovals: 0,
    activeActions: 0,
    overdueActions: 0,
  },
  actionProgress: { done: 0, total: 0 },
  upcomingMeetings: [],
  pendingApprovals: [],
  actionItems: [],
  decisions: [],
};

const sampleData: DashboardData = {
  summary: {
    totalMeetings: 24,
    upcomingMeetings: 3,
    pendingApprovals: 2,
    activeActions: 8,
    overdueActions: 2,
  },
  actionProgress: { done: 12, total: 20 },
  upcomingMeetings: [
    {
      id: "m1",
      title: "Rapat Koordinasi Bulanan",
      date: "2026-11-11",
      time: "09:00 – 10:30",
      location: "Ruang Rapat Utama",
      mode: "Tatap muka",
      participants: 12,
    },
    {
      id: "m2",
      title: "Evaluasi Program Kuartal IV",
      date: "2026-11-13",
      time: "13:00 – 14:00",
      location: "Google Meet",
      mode: "Online",
      participants: 8,
    },
    {
      id: "m3",
      title: "Review Anggaran 2027",
      date: "2026-11-17",
      time: "10:00 – 12:00",
      location: "Ruang Rapat Lantai 2",
      mode: "Tatap muka",
      participants: 6,
    },
  ],
  pendingApprovals: [
    {
      id: "a1",
      title: "Notulen Rapat Evaluasi Mingguan",
      meetingDate: "2026-11-06",
      author: "Sari Wulandari",
      waitingDays: 3,
    },
    {
      id: "a2",
      title: "Notulen Rapat Perencanaan Kegiatan",
      meetingDate: "2026-11-04",
      author: "Dimas Pratama",
      waitingDays: 5,
    },
  ],
  actionItems: [
    {
      id: "t1",
      title: "Menyusun laporan realisasi anggaran",
      assignee: "Rina Kusuma",
      meeting: "Rapat Koordinasi Bulanan",
      due: "2026-11-07",
      overdue: true,
    },
    {
      id: "t2",
      title: "Mengirim undangan rapat evaluasi",
      assignee: "Budi Santoso",
      meeting: "Evaluasi Program Kuartal IV",
      due: "2026-11-09",
      overdue: true,
    },
    {
      id: "t3",
      title: "Memperbarui daftar peserta kegiatan",
      assignee: "Sari Wulandari",
      meeting: "Rapat Perencanaan Kegiatan",
      due: "2026-11-14",
      overdue: false,
    },
    {
      id: "t4",
      title: "Menyiapkan bahan presentasi anggaran",
      assignee: "Dimas Pratama",
      meeting: "Review Anggaran 2027",
      due: "2026-11-16",
      overdue: false,
    },
  ],
  decisions: [
    {
      id: "d1",
      text: "Anggaran kegiatan kuartal IV disetujui dengan penyesuaian pada pos transportasi.",
      meeting: "Rapat Koordinasi Bulanan",
      date: "2026-11-03",
    },
    {
      id: "d2",
      text: "Rapat evaluasi program dilaksanakan setiap dua minggu sekali.",
      meeting: "Rapat Evaluasi Mingguan",
      date: "2026-11-06",
    },
    {
      id: "d3",
      text: "Pelaporan tindak lanjut dilakukan paling lambat hari Jumat.",
      meeting: "Rapat Perencanaan Kegiatan",
      date: "2026-11-04",
    },
  ],
};

const data: DashboardData = SHOW_SAMPLE_DATA ? sampleData : emptyData;

/* -------------------------------------------------------------------------- */
/* Helper                                                                     */
/* -------------------------------------------------------------------------- */

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

/** "2026-11-11" -> { day: "11", month: "Nov" } (tanpa efek zona waktu) */
function getDateParts(iso: string) {
  const [, month, day] = iso.split("-");

  return {
    day: String(Number(day)),
    month: MONTHS[Number(month) - 1] ?? "",
  };
}

function formatShortDate(iso: string) {
  const { day, month } = getDateParts(iso);
  return `${day} ${month}`;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/* -------------------------------------------------------------------------- */
/* Komponen kecil                                                             */
/* -------------------------------------------------------------------------- */

type SummaryCardProps = {
  title: string;
  value: number;
  description: string;
  note?: { text: string; tone: "danger" | "warning" } | null;
  href: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  accent: string;
};

function SummaryCard({
  title,
  value,
  description,
  note,
  href,
  icon: Icon,
  iconColor,
  iconBg,
  accent,
}: SummaryCardProps) {
  return (
    <Link
      href={href}
      className="group block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0865ed]/40"
    >
      <Card
        className={`h-full gap-3 overflow-hidden rounded-xl border border-t-2 border-[#E2E8F0] ${accent} bg-white py-5 shadow-sm ring-0 transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-md`}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 px-5 pb-0">
          <CardTitle className="text-sm font-semibold text-[#64748B]">
            {title}
          </CardTitle>

          <div
            className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${iconBg}`}
          >
            <Icon className={`size-5 ${iconColor}`} />
          </div>
        </CardHeader>

        <CardContent className="space-y-1 px-5">
          <p className="text-3xl font-bold tracking-tight text-[#101b3a]">
            {value}
          </p>

          <p className="text-xs text-[#94A3B8]">{description}</p>

          {note && (
            <p
              className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                note.tone === "danger"
                  ? "bg-red-50 text-red-600"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              {note.text}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

function Panel({
  title,
  description,
  href,
  linkLabel,
  className = "",
  children,
}: {
  title: string;
  description: string;
  href: string;
  linkLabel: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card
      className={`gap-0 overflow-hidden rounded-xl border border-[#E2E8F0] bg-white py-0 shadow-sm ring-0 ${className}`}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-3 border-b border-[#EEF2F7] px-5 py-4">
        <div className="min-w-0">
          <CardTitle className="text-base font-bold text-[#101b3a]">
            {title}
          </CardTitle>
          <p className="mt-0.5 text-xs text-[#64748B]">{description}</p>
        </div>

        <Link
          href={href}
          className="inline-flex shrink-0 items-center gap-1 rounded text-xs font-semibold text-[#0865ed] transition-colors hover:text-[#0649b8] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0865ed]/40"
        >
          {linkLabel}
          <ArrowRight className="size-3.5" />
        </Link>
      </CardHeader>

      <CardContent className="p-0">{children}</CardContent>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
      <div className="flex size-10 items-center justify-center rounded-xl bg-[#F1F5F9] text-[#94A3B8]">
        <Inbox className="size-5" />
      </div>
      <p className="text-sm text-[#64748B]">{message}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Halaman                                                                    */
/* -------------------------------------------------------------------------- */

export default function DashboardPage() {
  const { summary, actionProgress } = data;

  const progressPercent =
    actionProgress.total > 0
      ? Math.round((actionProgress.done / actionProgress.total) * 100)
      : 0;

  const summaryCards: SummaryCardProps[] = [
    {
      title: "Total Rapat",
      value: summary.totalMeetings,
      description: "Seluruh rapat yang tercatat",
      href: "/archive",
      icon: CalendarDays,
      iconColor: "text-blue-600",
      iconBg: "bg-blue-50",
      accent: "border-t-blue-500",
    },
    {
      title: "Rapat Mendatang",
      value: summary.upcomingMeetings,
      description: "Rapat yang akan dilaksanakan",
      href: "/calendar",
      icon: CalendarClock,
      iconColor: "text-indigo-600",
      iconBg: "bg-indigo-50",
      accent: "border-t-indigo-500",
    },
    {
      title: "Menunggu Persetujuan",
      value: summary.pendingApprovals,
      description: "Notulen yang perlu ditinjau",
      note:
        summary.pendingApprovals > 0
          ? { text: "Perlu tindakan", tone: "warning" }
          : null,
      href: "/approvals",
      icon: ClipboardCheck,
      iconColor: "text-amber-600",
      iconBg: "bg-amber-50",
      accent: "border-t-amber-500",
    },
    {
      title: "Tindak Lanjut Aktif",
      value: summary.activeActions,
      description: "Tugas yang belum selesai",
      note:
        summary.overdueActions > 0
          ? { text: `${summary.overdueActions} terlambat`, tone: "danger" }
          : null,
      href: "/action-items",
      icon: ListTodo,
      iconColor: "text-emerald-600",
      iconBg: "bg-emerald-50",
      accent: "border-t-emerald-500",
    },
  ];

  return (
    <div className="space-y-6">
      {/* PAGE TITLE + AKSI UTAMA */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-[#101b3a]">
            Dasbor
          </h1>

          <p className="text-sm text-[#64748B]">
            Ringkasan rapat, persetujuan notulen, dan tindak lanjut.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/calendar"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#D8E5F7] bg-white px-4 text-sm font-semibold text-[#0865ed] transition-colors hover:bg-[#EFF6FF] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0865ed]/40"
          >
            <CalendarDays className="size-4" />
            Jadwalkan rapat
          </Link>

          <Link
            href={NEW_MINUTES_ROUTE}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-[#0860ed] to-[#0875f7] px-4 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:shadow-blue-600/30 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-300"
          >
            <Plus className="size-4" />
            Buat notulen
          </Link>
        </div>
      </div>

      {/* RINGKASAN */}
      <section
        aria-label="Ringkasan"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {summaryCards.map((card) => (
          <SummaryCard key={card.title} {...card} />
        ))}
      </section>

      {/* BARIS 1: RAPAT MENDATANG + PERSETUJUAN */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel
          title="Rapat Mendatang"
          description="Jadwal rapat terdekat"
          href="/calendar"
          linkLabel="Lihat kalender"
          className="lg:col-span-2"
        >
          {data.upcomingMeetings.length === 0 ? (
            <EmptyState message="Belum ada rapat yang dijadwalkan." />
          ) : (
            <ul className="divide-y divide-[#EEF2F7]">
              {data.upcomingMeetings.map((meeting) => {
                const { day, month } = getDateParts(meeting.date);
                const isOnline = meeting.mode === "Online";
                const PlaceIcon = isOnline ? Video : MapPin;

                return (
                  <li
                    key={meeting.id}
                    className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-[#F8FBFF]"
                  >
                    <div className="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl bg-[#EAF3FF] leading-none">
                      <span className="text-lg font-bold text-[#0865ed]">
                        {day}
                      </span>
                      <span className="mt-0.5 text-[11px] font-semibold text-[#0865ed]">
                        {month}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[#101b3a]">
                        {meeting.title}
                      </p>

                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#64748B]">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="size-3.5" />
                          {meeting.time}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <PlaceIcon className="size-3.5" />
                          {meeting.location}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Users className="size-3.5" />
                          {meeting.participants} peserta
                        </span>
                      </div>
                    </div>

                    <span
                      className={`hidden shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold sm:inline-flex ${
                        isOnline
                          ? "bg-sky-50 text-sky-700"
                          : "bg-violet-50 text-violet-700"
                      }`}
                    >
                      {meeting.mode}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel
          title="Menunggu Persetujuan"
          description="Notulen yang perlu ditinjau"
          href="/approvals"
          linkLabel="Lihat semua"
        >
          {data.pendingApprovals.length === 0 ? (
            <EmptyState message="Tidak ada notulen yang menunggu persetujuan." />
          ) : (
            <ul className="divide-y divide-[#EEF2F7]">
              {data.pendingApprovals.map((item) => (
                <li
                  key={item.id}
                  className="space-y-1.5 px-5 py-4 transition-colors hover:bg-[#FFFBF0]"
                >
                  <p className="text-sm font-semibold text-[#101b3a]">
                    {item.title}
                  </p>

                  <p className="text-xs text-[#64748B]">
                    Rapat {formatShortDate(item.meetingDate)} · disusun oleh{" "}
                    {item.author}
                  </p>

                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      item.waitingDays >= 5
                        ? "bg-red-50 text-red-600"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    Menunggu {item.waitingDays} hari
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* BARIS 2: TINDAK LANJUT + KEPUTUSAN */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel
          title="Tindak Lanjut"
          description="Tugas dari hasil rapat yang belum selesai"
          href="/action-items"
          linkLabel="Lihat semua"
          className="lg:col-span-2"
        >
          {/* Progres penyelesaian */}
          <div className="border-b border-[#EEF2F7] px-5 py-3.5">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-medium text-[#64748B]">
                Penyelesaian tindak lanjut
              </span>
              <span className="font-semibold text-[#101b3a]">
                {actionProgress.done} dari {actionProgress.total} selesai
                {actionProgress.total > 0 && ` (${progressPercent}%)`}
              </span>
            </div>

            <div
              role="progressbar"
              aria-label="Penyelesaian tindak lanjut"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progressPercent}
              className="h-2 overflow-hidden rounded-full bg-[#E8EEF8]"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {data.actionItems.length === 0 ? (
            <EmptyState message="Tidak ada tindak lanjut yang aktif." />
          ) : (
            <ul className="divide-y divide-[#EEF2F7]">
              {data.actionItems.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-[#F8FBFF]"
                >
                  <div
                    className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#075bea] to-[#168af2] text-xs font-bold text-white"
                    title={item.assignee}
                  >
                    {getInitials(item.assignee)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#101b3a]">
                      {item.title}
                    </p>
                    <p className="truncate text-xs text-[#64748B]">
                      {item.assignee} · {item.meeting}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      item.overdue
                        ? "bg-red-50 text-red-600"
                        : "bg-[#EEF2F7] text-[#475569]"
                    }`}
                  >
                    {item.overdue ? "Terlambat · " : "Tenggat "}
                    {formatShortDate(item.due)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Keputusan Terbaru"
          description="Hasil keputusan dari rapat terakhir"
          href="/decisions"
          linkLabel="Lihat semua"
        >
          {data.decisions.length === 0 ? (
            <EmptyState message="Belum ada keputusan yang tercatat." />
          ) : (
            <ul className="divide-y divide-[#EEF2F7]">
              {data.decisions.map((decision) => (
                <li
                  key={decision.id}
                  className="space-y-1.5 px-5 py-4 transition-colors hover:bg-[#F8FBFF]"
                >
                  <p className="line-clamp-3 text-sm leading-5 text-[#101b3a]">
                    {decision.text}
                  </p>

                  <p className="text-xs text-[#64748B]">
                    {decision.meeting} · {formatShortDate(decision.date)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}