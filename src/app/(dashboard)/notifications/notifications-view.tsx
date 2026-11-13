"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Bell,
  CalendarCheck,
  CheckCheck,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileText,
  RotateCcw,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CURRENT_USER, todayJakarta } from "@/lib/actions";
import { diffDays } from "@/lib/dates";
import { PEOPLE } from "@/lib/meetings";
import { formatDateTime } from "@/lib/minutes";
import {
  KIND_CATEGORY,
  buildNotifications,
  dateOf,
  type Notification,
  type NotificationCategory,
  type NotificationKind,
} from "@/lib/notifications";

const selectClass =
  "h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

const icons: Record<NotificationKind, { icon: React.ComponentType<{ className?: string }>; color: string; bg: string }> = {
  undangan: { icon: CalendarCheck, color: "text-blue-600", bg: "bg-blue-50" },
  pengingat: { icon: Bell, color: "text-amber-600", bg: "bg-amber-50" },
  dibatalkan: { icon: XCircle, color: "text-red-600", bg: "bg-red-50" },
  "notulen-review": { icon: FileText, color: "text-amber-600", bg: "bg-amber-50" },
  "notulen-revisi": { icon: RotateCcw, color: "text-orange-600", bg: "bg-orange-50" },
  "notulen-disetujui": { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
  "tugas-baru": { icon: ClipboardList, color: "text-indigo-600", bg: "bg-indigo-50" },
  deadline: { icon: Clock3, color: "text-amber-600", bg: "bg-amber-50" },
  terlambat: { icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
  verifikasi: { icon: CheckCircle2, color: "text-amber-600", bg: "bg-amber-50" },
  "tugas-selesai": { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
};

const TABS = ["Semua", "Belum dibaca", "Rapat", "Notulen", "Tugas"] as const;
type Tab = (typeof TABS)[number];

export function NotificationsView({ loginName }: { loginName: string }) {
  const today = todayJakarta();

  /*
    SIMULASI PENGGUNA: akun login Anda (mis. Administrator) tidak ada di data
    contoh, jadi pilih salah satu pengguna contoh untuk melihat notifikasinya.
    Di produksi, notifikasi diambil untuk pengguna yang sedang login saja.
  */
  const options = Array.from(new Set([loginName, ...PEOPLE.map((p) => p.name)]));
  const [user, setUser] = React.useState(
    () => (buildNotifications(loginName, todayJakarta()).length > 0 ? loginName : CURRENT_USER),
  );

  const list = React.useMemo(() => buildNotifications(user, today), [user, today]);

  // Status baca disimpan di memori per pengguna simulasi. Contoh awal: yang lebih dari 3 hari dianggap sudah dibaca.
  const [read, setRead] = React.useState<Record<string, string[]>>({});
  const initialRead = React.useMemo(
    () => list.filter((n) => diffDays(dateOf(n.at), today) > 3).map((n) => n.id),
    [list, today],
  );
  const readIds = read[user] ?? initialRead;
  const isRead = (id: string) => readIds.includes(id);

  const [tab, setTab] = React.useState<Tab>("Semua");

  function setReadIds(ids: string[]) {
    setRead((current) => ({ ...current, [user]: ids }));
  }

  const markRead = (id: string) => !isRead(id) && setReadIds([...readIds, id]);
  const toggle = (id: string) => setReadIds(isRead(id) ? readIds.filter((x) => x !== id) : [...readIds, id]);
  const markAll = () => setReadIds(list.map((n) => n.id));

  const unread = list.filter((n) => !isRead(n.id));
  const filtered = list.filter(
    (n) => tab === "Semua" || (tab === "Belum dibaca" ? !isRead(n.id) : KIND_CATEGORY[n.kind] === (tab as NotificationCategory)),
  );

  const groups: { label: string; items: Notification[] }[] = [
    { label: "Hari ini", items: filtered.filter((n) => dateOf(n.at) >= today) },
    { label: "Kemarin", items: filtered.filter((n) => diffDays(dateOf(n.at), today) === 1) },
    { label: "Sebelumnya", items: filtered.filter((n) => diffDays(dateOf(n.at), today) > 1) },
  ].filter((group) => group.items.length > 0);

  const tabCount = (t: Tab) =>
    t === "Semua" ? list.length : t === "Belum dibaca" ? unread.length : list.filter((n) => KIND_CATEGORY[n.kind] === t).length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifikasi</h1>
          <p className="text-sm text-muted-foreground">
            {unread.length > 0 ? `${unread.length} belum dibaca` : "Semua notifikasi sudah dibaca"}
          </p>
        </div>

        <button
          type="button"
          onClick={markAll}
          disabled={unread.length === 0}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CheckCheck className="size-4" />
          Tandai semua dibaca
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-amber-300 bg-amber-50 px-4 py-2.5 text-sm">
        <label htmlFor="sim-user" className="font-medium text-amber-800">Simulasi pengguna:</label>
        <select id="sim-user" value={user} onChange={(e) => setUser(e.target.value)} className={selectClass}>
          {options.map((name) => (
            <option key={name} value={name}>{name === loginName ? `${name} (akun login)` : name}</option>
          ))}
        </select>
        <span className="text-xs text-amber-700">Hanya untuk uji; di produksi hanya notifikasi milik pengguna yang login.</span>
      </div>

      <div role="tablist" aria-label="Filter notifikasi" className="flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              tab === t ? "bg-blue-600 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-blue-50"
            }`}
          >
            {t} ({tabCount(t)})
          </button>
        ))}
      </div>

      {groups.length === 0 ? (
        <Card className="border-[#DBEAFE] shadow-sm">
          <CardContent className="py-14 text-center">
            <Bell className="mx-auto size-10 text-slate-300" />
            <p className="mt-3 text-sm text-muted-foreground">
              {list.length === 0 ? "Belum ada notifikasi untuk pengguna ini." : "Tidak ada notifikasi pada filter ini."}
            </p>
          </CardContent>
        </Card>
      ) : (
        groups.map((group) => (
          <section key={group.label} aria-label={group.label} className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">{group.label}</h2>

            <Card className="overflow-hidden border-[#DBEAFE] shadow-sm">
              <ul className="divide-y divide-slate-100">
                {group.items.map((n) => {
                  const style = icons[n.kind];
                  const unreadItem = !isRead(n.id);

                  return (
                    <li key={n.id} className={`flex items-start gap-3 px-4 py-3.5 transition ${unreadItem ? "bg-blue-50/50" : "bg-white"}`}>
                      <div className={`mt-0.5 rounded-lg p-2 ${style.bg}`}>
                        <style.icon className={`size-4 ${style.color}`} />
                      </div>

                      <Link href={n.href} onClick={() => markRead(n.id)} className="min-w-0 flex-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className={`text-sm ${unreadItem ? "font-semibold text-slate-900" : "font-medium text-slate-700"}`}>{n.title}</p>
                          {n.urgent && <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">Penting</Badge>}
                        </div>
                        <p className="mt-0.5 text-xs leading-5 text-slate-500">{n.body}</p>
                        <p className="mt-1 text-[11px] text-slate-400">{n.category} · {formatDateTime(n.at)}</p>
                      </Link>

                      <button
                        type="button"
                        onClick={() => toggle(n.id)}
                        aria-label={unreadItem ? "Tandai sudah dibaca" : "Tandai belum dibaca"}
                        title={unreadItem ? "Tandai sudah dibaca" : "Tandai belum dibaca"}
                        className="mt-1 inline-flex size-6 shrink-0 items-center justify-center rounded-full hover:bg-blue-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                      >
                        <span className={`size-2.5 rounded-full ${unreadItem ? "bg-blue-600" : "border border-slate-300"}`} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </section>
        ))
      )}

      <p className="text-xs text-muted-foreground">
        Notifikasi dalam aplikasi mencakup undangan, pengingat, notulen, dan tugas. Pengiriman email belum aktif
        (PRD: keputusan terbuka nomor 8). Status baca belum tersimpan permanen dan angka di ikon lonceng header
        masih contoh sampai tabel notifikasi tersedia di database.
      </p>
    </div>
  );
}
