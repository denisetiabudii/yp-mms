import {
  CalendarDays,
  CalendarClock,
  ClipboardCheck,
  ListTodo,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const summaryData = [
  {
    title: "Total Rapat",
    value: "0",
    description: "Seluruh rapat organisasi",
    icon: CalendarDays,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-50",
    accent: "border-t-blue-500",
  },
  {
    title: "Rapat Mendatang",
    value: "0",
    description: "Rapat yang akan dilaksanakan",
    icon: CalendarClock,
    iconColor: "text-indigo-600",
    iconBg: "bg-indigo-50",
    accent: "border-t-indigo-500",
  },
  {
    title: "Notulen Menunggu Approval",
    value: "0",
    description: "Menunggu persetujuan",
    icon: ClipboardCheck,
    iconColor: "text-amber-600",
    iconBg: "bg-amber-50",
    accent: "border-t-amber-500",
  },
  {
    title: "Action Items Aktif",
    value: "0",
    description: "Tindak lanjut yang belum selesai",
    icon: ListTodo,
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-50",
    accent: "border-t-emerald-500",
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6 pt-20">
      {/* PAGE TITLE */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-[#1E3A8A]">
          Dashboard
        </h1>

        <p className="text-sm text-[#64748B]">
          Ringkasan aktivitas rapat organisasi.
        </p>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryData.map((item) => {
          const Icon = item.icon;

          return (
            <Card
              key={item.title}
              className={`overflow-hidden rounded-xl border border-[#E2E8F0] border-t-2 ${item.accent} bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md`}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-semibold text-[#64748B]">
                  {item.title}
                </CardTitle>

                <div
                  className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${item.iconBg}`}
                >
                  <Icon className={`size-5 ${item.iconColor}`} />
                </div>
              </CardHeader>

              <CardContent className="space-y-1">
                <p className="text-3xl font-bold tracking-tight text-[#1E293B]">
                  {item.value}
                </p>

                <p className="text-xs text-[#94A3B8]">
                  {item.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}