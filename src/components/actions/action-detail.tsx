"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  RotateCcw,
  Send,
  UserRound,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  actionStatusStyles,
  isOpen,
  isOverdue,
  priorityStyles,
  todayJakarta,
  type ActionItem,
  type ActionStatus,
  type ActionUpdate,
} from "@/lib/actions";
import { PEOPLE, formatDate, getMeeting } from "@/lib/meetings";
import { formatDateTime } from "@/lib/minutes";

const textareaClass =
  "min-h-20 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 aria-[invalid=true]:border-red-400";
const selectClass =
  "h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";
const btn =
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-50";
const btnPrimary = `${btn} bg-blue-600 text-white hover:bg-blue-700`;
const btnSuccess = `${btn} bg-emerald-600 text-white hover:bg-emerald-700`;
const btnWarning = `${btn} bg-amber-500 text-white hover:bg-amber-600`;
const btnDanger = `${btn} bg-red-600 text-white hover:bg-red-700`;

type Role = "pic" | "verifikator";

export function ActionDetail({ initialItem }: { initialItem: ActionItem }) {
  /*
    SIMULASI PERAN: ganti dengan peran dari sesi login dan tegakkan juga
    di server (Server Action + RLS). PIC hanya boleh memperbarui tugasnya;
    verifikator/pimpinan yang memverifikasi, mengubah penugasan, atau membatalkan.
  */
  const [role, setRole] = React.useState<Role>("pic");

  const [item, setItem] = React.useState(initialItem);
  const [notice, setNotice] = React.useState("");

  // form pembaruan progres (PIC)
  const [nextStatus, setNextStatus] = React.useState<ActionStatus>("Berjalan");
  const [progress, setProgress] = React.useState(String(initialItem.progress));
  const [note, setNote] = React.useState("");
  const [obstacle, setObstacle] = React.useState("");
  const [evidence, setEvidence] = React.useState("");
  const [updateErrors, setUpdateErrors] = React.useState<{ progress?: string; note?: string; evidence?: string }>({});

  // verifikasi
  const [verifyNote, setVerifyNote] = React.useState("");
  const [verifyError, setVerifyError] = React.useState("");

  // ubah penugasan / batalkan
  const [newDeadline, setNewDeadline] = React.useState("");
  const [newPic, setNewPic] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [reasonError, setReasonError] = React.useState("");

  const today = todayJakarta();
  const meeting = item.meetingId ? getMeeting(item.meetingId) : undefined;
  const overdue = isOverdue(item, today);
  const actor = role === "pic" ? item.pic : item.verifier;

  const canUpdate = role === "pic" && (item.status === "Belum dimulai" || item.status === "Berjalan");
  const canVerify = role === "verifikator" && item.status === "Menunggu verifikasi";
  const canManage = role === "verifikator" && isOpen(item.status);

  function apply(
    patch: Partial<ActionItem>,
    entry: Omit<ActionUpdate, "id" | "at" | "actor" | "status" | "progress"> & {
      status?: ActionStatus;
      progress?: number;
    },
  ) {
    const now = new Date().toISOString();
    const status = entry.status ?? patch.status ?? item.status;
    const progressValue = entry.progress ?? patch.progress ?? item.progress;

    setItem((current) => ({
      ...current,
      ...patch,
      status,
      progress: progressValue,
      updates: [
        { ...entry, id: `${now}-${current.updates.length}`, at: now, actor, status, progress: progressValue },
        ...current.updates,
      ],
    }));
  }

  function submitUpdate() {
    const errors: typeof updateErrors = {};
    const value = Number(progress);

    if (progress.trim() === "" || Number.isNaN(value) || value < 0 || value > 100) {
      errors.progress = "Progres harus berupa angka 0–100.";
    }

    if (nextStatus === "Menunggu verifikasi") {
      // Aturan PRD: status selesai wajib disertai catatan atau bukti.
      if (!note.trim() && !evidence.trim()) {
        errors.note = "Isi catatan atau bukti penyelesaian sebelum diajukan.";
      }
    } else if (!note.trim()) {
      errors.note = "Catatan progres wajib diisi.";
    }

    if (evidence.trim() && !/^https?:\/\/\S+$/i.test(evidence.trim()) && evidence.trim().length < 5) {
      errors.evidence = "Isi tautan (https://…) atau uraian bukti yang jelas.";
    }

    setUpdateErrors(errors);
    setNotice("");
    if (Object.keys(errors).length > 0) return;

    const done = nextStatus === "Menunggu verifikasi";

    apply(
      { status: nextStatus, progress: done ? 100 : value },
      {
        action: done ? "Diajukan untuk verifikasi" : "Progres diperbarui",
        note: note.trim() || undefined,
        obstacle: obstacle.trim() || undefined,
        evidence: evidence.trim() || undefined,
      },
    );

    setNote("");
    setObstacle("");
    setEvidence("");
    setNotice(done ? `Diajukan ke ${item.verifier} untuk verifikasi.` : "Progres tersimpan.");
    // TODO: server — simpan ke action_item_updates + audit_logs, notifikasi verifikator.
  }

  function verify(decision: "ok" | "rework") {
    if (decision === "rework" && !verifyNote.trim()) {
      setVerifyError("Komentar wajib diisi saat meminta perbaikan.");
      return;
    }

    setVerifyError("");

    if (decision === "ok") {
      apply(
        { status: "Selesai", progress: 100, completedAt: today },
        { action: "Diverifikasi selesai", note: verifyNote.trim() || undefined },
      );
      setNotice("Action item diverifikasi dan ditandai selesai.");
    } else {
      apply(
        { status: "Berjalan", progress: Math.min(item.progress, 90), completedAt: undefined },
        { action: "Perbaikan diminta", note: verifyNote.trim() },
      );
      setNotice("Dikembalikan ke PIC untuk diperbaiki.");
    }

    setVerifyNote("");
  }

  function changeAssignment() {
    const deadlineChanged = !!newDeadline && newDeadline !== item.deadline;
    const picChanged = !!newPic && newPic !== item.pic;

    if (!deadlineChanged && !picChanged) {
      setReasonError("Pilih deadline atau PIC baru yang berbeda dari saat ini.");
      return;
    }
    if (!reason.trim()) {
      // Aturan PRD: perubahan PIC/deadline wajib mencatat alasan dan pelaku.
      setReasonError("Alasan perubahan wajib diisi.");
      return;
    }

    const parts: string[] = [];
    if (deadlineChanged) parts.push(`Deadline ${formatDate(item.deadline)} → ${formatDate(newDeadline)}`);
    if (picChanged) parts.push(`PIC ${item.pic} → ${newPic}`);

    apply(
      { deadline: deadlineChanged ? newDeadline : item.deadline, pic: picChanged ? newPic : item.pic },
      { action: "Penugasan diubah", note: `${parts.join("; ")}. Alasan: ${reason.trim()}` },
    );

    setNewDeadline("");
    setNewPic("");
    setReason("");
    setReasonError("");
    setNotice("Penugasan diubah dan dicatat di riwayat.");
  }

  function cancelAction() {
    if (!reason.trim()) {
      setReasonError("Alasan pembatalan wajib diisi.");
      return;
    }

    apply({ status: "Dibatalkan" }, { action: "Dibatalkan", note: reason.trim() });
    setReason("");
    setReasonError("");
    setNotice("Action item dibatalkan.");
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="space-y-3">
        <Link href="/action-items" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-700">
          <ArrowLeft className="size-4" />
          Kembali ke tindak lanjut
        </Link>

        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
          <div className="min-w-0">
            <p className="font-mono text-xs text-muted-foreground">{item.number}</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">{item.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {meeting ? (
                <>
                  Dari rapat{" "}
                  <Link href={`/meetings/${meeting.id}`} className="text-blue-600 hover:underline">
                    {meeting.title}
                  </Link>
                </>
              ) : (
                "Instruksi langsung"
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={actionStatusStyles[item.status]}>{item.status}</Badge>
            <Badge variant="outline" className={priorityStyles[item.priority]}>{item.priority}</Badge>
            {overdue && (
              <Badge variant="outline" className="border-red-200 bg-red-100 text-red-700">
                <AlertTriangle className="mr-1 size-3" />
                Terlambat
              </Badge>
            )}
          </div>
        </div>

        {/* SIMULASI PERAN */}
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-amber-300 bg-amber-50 px-4 py-2.5 text-sm">
          <span className="font-medium text-amber-800">Simulasi peran:</span>
          <div className="inline-flex rounded-lg border border-amber-200 bg-white p-0.5">
            {(
              [
                ["pic", `PIC (${item.pic})`],
                ["verifikator", `Verifikator (${item.verifier})`],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={role === value}
                onClick={() => setRole(value)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                  role === value ? "bg-amber-500 text-white" : "text-amber-800 hover:bg-amber-100"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <span className="text-xs text-amber-700">Hanya untuk uji alur; akan diganti hak akses dari sesi login.</span>
        </div>
      </div>

      {notice && (
        <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {notice}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          {/* RINGKASAN */}
          <Card className="border-[#DBEAFE] shadow-sm">
            <CardHeader className="border-b bg-[#F8FAFC]">
              <CardTitle className="text-base">Ringkasan</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5 p-5 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Hasil yang diharapkan</p>
                <p className="mt-1 text-sm text-slate-800">{item.expectedResult || "—"}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Progres</p>
                <div className="mt-2 flex items-center gap-3">
                  <div
                    role="progressbar"
                    aria-valuenow={item.progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Progres"
                    className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200"
                  >
                    <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${item.progress}%` }} />
                  </div>
                  <span className="text-sm font-semibold text-slate-700">{item.progress}%</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <UserRound className="mt-0.5 size-4 text-blue-500" />
                <div>
                  <p className="text-xs text-muted-foreground">PIC</p>
                  <p className="text-sm font-medium text-slate-800">{item.pic}</p>
                  {item.supporters.length > 0 && (
                    <p className="text-xs text-muted-foreground">Pendukung: {item.supporters.join(", ")}</p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CalendarDays className={`mt-0.5 size-4 ${overdue ? "text-red-500" : "text-blue-500"}`} />
                <div>
                  <p className="text-xs text-muted-foreground">Deadline</p>
                  <p className={`text-sm font-medium ${overdue ? "text-red-600" : "text-slate-800"}`}>
                    {formatDate(item.deadline, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                  </p>
                  <p className="text-xs text-muted-foreground">Verifikator: {item.verifier}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* FORM PROGRES (PIC) */}
          {canUpdate && (
            <Card className="border-blue-200 shadow-sm">
              <CardHeader className="border-b bg-blue-50">
                <CardTitle className="text-base">Perbarui Progres</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label htmlFor="next-status" className="text-sm font-medium text-slate-700">Status</label>
                    <select
                      id="next-status"
                      value={nextStatus}
                      onChange={(e) => {
                        const value = e.target.value as ActionStatus;
                        setNextStatus(value);
                        if (value === "Menunggu verifikasi") setProgress("100");
                      }}
                      className={selectClass}
                    >
                      <option value="Berjalan">Berjalan</option>
                      <option value="Menunggu verifikasi">Selesai — ajukan verifikasi</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="progress" className="text-sm font-medium text-slate-700">Progres (%)</label>
                    <Input
                      id="progress"
                      type="number"
                      min={0}
                      max={100}
                      value={progress}
                      readOnly={nextStatus === "Menunggu verifikasi"}
                      onChange={(e) => setProgress(e.target.value)}
                      aria-invalid={!!updateErrors.progress}
                    />
                    {updateErrors.progress && <p role="alert" className="text-xs text-red-600">{updateErrors.progress}</p>}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="note" className="text-sm font-medium text-slate-700">
                    Catatan {nextStatus !== "Menunggu verifikasi" && <span className="text-red-500">*</span>}
                  </label>
                  <textarea
                    id="note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    aria-invalid={!!updateErrors.note}
                    placeholder="Apa yang sudah dikerjakan?"
                    className={textareaClass}
                  />
                  {updateErrors.note && <p role="alert" className="text-xs text-red-600">{updateErrors.note}</p>}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label htmlFor="obstacle" className="text-sm font-medium text-slate-700">Kendala</label>
                    <Input id="obstacle" value={obstacle} onChange={(e) => setObstacle(e.target.value)} maxLength={200} />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="evidence" className="text-sm font-medium text-slate-700">Bukti (tautan / uraian)</label>
                    <Input
                      id="evidence"
                      value={evidence}
                      onChange={(e) => setEvidence(e.target.value)}
                      aria-invalid={!!updateErrors.evidence}
                      placeholder="https://…"
                    />
                    {updateErrors.evidence && <p role="alert" className="text-xs text-red-600">{updateErrors.evidence}</p>}
                  </div>
                </div>

                <div className="flex justify-end">
                  <button type="button" onClick={submitUpdate} className={btnPrimary}>
                    <Send className="size-4" />
                    {nextStatus === "Menunggu verifikasi" ? "Ajukan verifikasi" : "Simpan progres"}
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          {role === "pic" && item.status === "Menunggu verifikasi" && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Menunggu verifikasi dari {item.verifier}. Ganti ke peran Verifikator untuk mencoba.
            </p>
          )}

          {/* RIWAYAT */}
          <Card className="border-[#DBEAFE] shadow-sm">
            <CardHeader className="border-b bg-[#F8FAFC]">
              <CardTitle className="text-base">Riwayat</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <ol className="relative space-y-5 border-l border-slate-200 pl-5">
                {item.updates.map((update) => (
                  <li key={update.id} className="relative">
                    <span className="absolute -left-[26px] top-1.5 size-2.5 rounded-full border-2 border-white bg-blue-500" />
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-slate-800">{update.action}</p>
                      <Badge variant="outline" className={actionStatusStyles[update.status]}>{update.status}</Badge>
                      <span className="text-xs text-slate-500">{update.progress}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{update.actor} · {formatDateTime(update.at)}</p>
                    {update.note && <p className="mt-1 rounded-md bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700">{update.note}</p>}
                    {update.obstacle && <p className="mt-1 text-xs text-orange-700">Kendala: {update.obstacle}</p>}
                    {update.evidence && (
                      /^https?:\/\//i.test(update.evidence) ? (
                        <a
                          href={update.evidence}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                        >
                          <ExternalLink className="size-3" />
                          Bukti
                        </a>
                      ) : (
                        <p className="mt-1 text-xs text-slate-600">Bukti: {update.evidence}</p>
                      )
                    )}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>

        {/* PANEL SAMPING */}
        <div className="space-y-6">
          {canVerify && (
            <Card className="border-amber-200 shadow-sm">
              <CardHeader className="border-b bg-amber-50">
                <CardTitle className="text-base">Verifikasi</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-5">
                <label htmlFor="verify-note" className="text-sm font-medium text-slate-700">Komentar</label>
                <textarea
                  id="verify-note"
                  value={verifyNote}
                  onChange={(e) => {
                    setVerifyNote(e.target.value);
                    setVerifyError("");
                  }}
                  aria-invalid={!!verifyError}
                  placeholder="Wajib diisi bila meminta perbaikan."
                  className={textareaClass}
                />
                {verifyError && <p role="alert" className="text-xs text-red-600">{verifyError}</p>}
                <div className="grid gap-2">
                  <button type="button" onClick={() => verify("ok")} className={btnSuccess}>
                    <CheckCircle2 className="size-4" />
                    Verifikasi selesai
                  </button>
                  <button type="button" onClick={() => verify("rework")} className={btnWarning}>
                    <RotateCcw className="size-4" />
                    Minta perbaikan
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          {canManage && (
            <Card className="border-[#DBEAFE] shadow-sm">
              <CardHeader className="border-b bg-[#F8FAFC]">
                <CardTitle className="text-base">Ubah Penugasan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-5">
                <div className="space-y-1.5">
                  <label htmlFor="new-deadline" className="text-sm font-medium text-slate-700">Deadline baru</label>
                  <Input id="new-deadline" type="date" value={newDeadline} onChange={(e) => { setNewDeadline(e.target.value); setReasonError(""); }} />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="new-pic" className="text-sm font-medium text-slate-700">PIC baru</label>
                  <select id="new-pic" value={newPic} onChange={(e) => { setNewPic(e.target.value); setReasonError(""); }} className={selectClass}>
                    <option value="">Tidak diubah</option>
                    {PEOPLE.filter((p) => p.name !== item.pic).map((p) => (
                      <option key={p.id} value={p.name}>{p.name} — {p.position}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="reason" className="text-sm font-medium text-slate-700">
                    Alasan <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="reason"
                    value={reason}
                    onChange={(e) => { setReason(e.target.value); setReasonError(""); }}
                    aria-invalid={!!reasonError}
                    className={textareaClass}
                  />
                  {reasonError && <p role="alert" className="text-xs text-red-600">{reasonError}</p>}
                </div>

                <div className="grid gap-2">
                  <button type="button" onClick={changeAssignment} className={btnPrimary}>Simpan perubahan</button>
                  <button type="button" onClick={cancelAction} className={btnDanger}>
                    <XCircle className="size-4" />
                    Batalkan action item
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Perubahan PIC/deadline dan pembatalan wajib beralasan dan tercatat di riwayat.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}