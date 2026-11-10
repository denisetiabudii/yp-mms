"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  History,
  Lock,
  Plus,
  Printer,
  RotateCcw,
  Send,
  Trash2,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  classificationStyles,
  formatDate,
  formatTimeRange,
  getMeetingType,
  getUnit,
  minuteStatusStyles,
  type Meeting,
  type MinuteStatus,
} from "@/lib/meetings";
import {
  formatDateTime,
  type Minute,
  type MinuteContent,
  type MinuteDecision,
  type MinuteEvent,
  type MinuteVersion,
} from "@/lib/minutes";

/* ----------------------------- Gaya bersama ----------------------------- */

const textareaClass =
  "min-h-24 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 read-only:bg-slate-50 read-only:text-slate-700 aria-[invalid=true]:border-red-400";

const btn =
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-50";
const btnPrimary = `${btn} bg-blue-600 text-white hover:bg-blue-700`;
const btnSecondary = `${btn} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`;
const btnSuccess = `${btn} bg-emerald-600 text-white hover:bg-emerald-700`;
const btnWarning = `${btn} bg-amber-500 text-white hover:bg-amber-600`;
const btnDanger = `${btn} bg-red-600 text-white hover:bg-red-700`;

/** Status yang masih boleh disunting notulis. */
const EDITABLE: MinuteStatus[] = ["Belum dibuat", "Draft", "Revisi", "Ditolak"];

type Role = "notulis" | "pimpinan";

type SubmitErrors = {
  agenda?: string;
  conclusion?: string;
  decisions?: string;
};

export function MinuteEditor({
  meeting,
  initialMinute,
}: {
  meeting: Meeting;
  initialMinute: Minute;
}) {
  /*
    SIMULASI PERAN: sampai autentikasi Supabase tersedia, peran dipilih
    manual. Ganti dengan peran/hak akses dari sesi pengguna, dan tegakkan
    juga di server (Server Action + RLS), bukan hanya di UI.
  */
  const [role, setRole] = React.useState<Role>("notulis");

  const [status, setStatus] = React.useState<MinuteStatus>(initialMinute.status);
  const [content, setContent] = React.useState<MinuteContent>(initialMinute.content);
  const [versions, setVersions] = React.useState<MinuteVersion[]>(initialMinute.versions);
  const [events, setEvents] = React.useState<MinuteEvent[]>(initialMinute.events);
  const [approvedBy, setApprovedBy] = React.useState(initialMinute.approvedBy);
  const [approvedAt, setApprovedAt] = React.useState(initialMinute.approvedAt);

  const [viewVersion, setViewVersion] = React.useState<number | null>(null);
  const [errors, setErrors] = React.useState<SubmitErrors>({});
  const [notice, setNotice] = React.useState("");
  const [reviewNote, setReviewNote] = React.useState("");
  const [reviewError, setReviewError] = React.useState("");
  const [amendOpen, setAmendOpen] = React.useState(false);
  const [amendReason, setAmendReason] = React.useState("");
  const [amendError, setAmendError] = React.useState("");

  const decisionKey = React.useRef(100);

  const actorName = role === "notulis" ? meeting.notetaker || "Notulis" : meeting.leader;
  const snapshot = viewVersion
    ? versions.find((version) => version.version === viewVersion)
    : undefined;
  const shown = snapshot ? snapshot.content : content;

  const canEdit = role === "notulis" && EDITABLE.includes(status) && !snapshot;
  const canSubmit = role === "notulis" && EDITABLE.includes(status) && !snapshot;
  const canReview = role === "pimpinan" && status === "Menunggu Review" && !snapshot;
  const canAmend = status === "Disetujui" && !snapshot;

  const latestVersion = versions.length;
  const draftVersion = latestVersion + 1;

  /* ------------------------------ Util ------------------------------ */

  function logEvent(action: string, note?: string) {
    const now = new Date().toISOString();

    setEvents((current) => [
      { id: `${now}-${current.length}`, at: now, actor: actorName, action, note },
      ...current,
    ]);
  }

  function clearFeedback() {
    setNotice("");
    setErrors({});
  }

  /* ------------------------- Perubahan isi ------------------------- */

  function updateField(
    field: "conclusion" | "obstacles" | "recommendations",
    value: string,
  ) {
    setContent((current) => ({ ...current, [field]: value }));
    clearFeedback();
  }

  function updateNote(order: number, value: string) {
    setContent((current) => ({
      ...current,
      agendaNotes: current.agendaNotes.map((item) =>
        item.agendaOrder === order ? { ...item, discussion: value } : item,
      ),
    }));
    clearFeedback();
  }

  function addDecision() {
    const id = `d${decisionKey.current++}`;

    setContent((current) => ({
      ...current,
      decisions: [
        ...current.decisions,
        { id, text: "", basis: "", needsAction: true },
      ],
    }));
    clearFeedback();
  }

  function updateDecision(id: string, patch: Partial<MinuteDecision>) {
    setContent((current) => ({
      ...current,
      decisions: current.decisions.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    }));
    clearFeedback();
  }

  function removeDecision(id: string) {
    setContent((current) => ({
      ...current,
      decisions: current.decisions.filter((item) => item.id !== id),
    }));
    clearFeedback();
  }

  /* ----------------------------- Alur kerja ----------------------------- */

  function saveDraft() {
    if (status === "Belum dibuat") {
      setStatus("Draft");
      logEvent("Notulen dibuat");
    }

    // TODO: simpan ke Supabase lewat Server Action.
    setNotice("Draft tersimpan.");
    setErrors({});
  }

  function submitForReview() {
    const next: SubmitErrors = {};

    if (content.agendaNotes.some((item) => !item.discussion.trim())) {
      next.agenda = "Ringkasan pembahasan setiap agenda wajib diisi.";
    }
    if (!content.conclusion.trim()) {
      next.conclusion = "Kesimpulan rapat wajib diisi.";
    }
    if (content.decisions.some((item) => !item.text.trim())) {
      next.decisions = "Rumusan keputusan tidak boleh kosong. Isi atau hapus barisnya.";
    }

    setErrors(next);
    setNotice("");

    if (Object.keys(next).length > 0) return;

    const now = new Date().toISOString();
    const reason =
      status === "Revisi" || status === "Ditolak"
        ? "Perbaikan setelah review"
        : latestVersion > 0
          ? "Amandemen diajukan ulang"
          : "Diajukan untuk review";

    setVersions((current) => [
      ...current,
      {
        version: current.length + 1,
        savedAt: now,
        savedBy: actorName,
        reason,
        content,
      },
    ]);

    if (status === "Belum dibuat") logEvent("Notulen dibuat");

    setStatus("Menunggu Review");
    logEvent("Diajukan untuk review", `Versi ${draftVersion}`);
    setNotice(`Versi ${draftVersion} diajukan dan menunggu review pimpinan rapat.`);
    // TODO: server — kunci versi, kirim notifikasi ke pimpinan rapat.
  }

  function review(decision: "approve" | "revise" | "reject") {
    if (decision !== "approve" && !reviewNote.trim()) {
      setReviewError(
        decision === "revise"
          ? "Komentar wajib diisi saat meminta revisi."
          : "Alasan penolakan wajib diisi.",
      );
      return;
    }

    setReviewError("");

    const labels = {
      approve: { status: "Disetujui", action: "Disetujui" },
      revise: { status: "Revisi", action: "Revisi diminta" },
      reject: { status: "Ditolak", action: "Ditolak" },
    } as const;

    const { status: nextStatus, action } = labels[decision];

    setStatus(nextStatus);
    logEvent(action, reviewNote.trim() || undefined);

    if (decision === "approve") {
      setApprovedBy(actorName);
      setApprovedAt(new Date().toISOString());
    }

    setReviewNote("");
    setNotice(`Notulen ${nextStatus.toLowerCase()}.`);
    // TODO: server — simpan ke tabel approvals + audit_logs, notifikasi notulis.
  }

  function startAmendment() {
    if (!amendReason.trim()) {
      setAmendError("Alasan amandemen wajib diisi.");
      return;
    }

    setAmendError("");
    setStatus("Draft");
    setApprovedBy(undefined);
    setApprovedAt(undefined);
    logEvent("Amandemen dimulai", amendReason.trim());
    setAmendReason("");
    setAmendOpen(false);
    setNotice(
      `Amandemen dimulai. Versi ${latestVersion} yang disetujui tetap tersimpan di riwayat.`,
    );
  }

  /* ------------------------------- Tampilan ------------------------------- */

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="space-y-3 print:space-y-1">
        <Link
          href="/minutes"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-700 print:hidden"
        >
          <ArrowLeft className="size-4" />
          Kembali ke daftar notulen
        </Link>

        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
          <div className="min-w-0">
            <p className="font-mono text-xs text-muted-foreground">{meeting.number}</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">
              Notulen: {meeting.title}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {getMeetingType(meeting.typeId)?.name} · {getUnit(meeting.unitId)?.name} ·{" "}
              {formatDate(meeting.date)}, {formatTimeRange(meeting.startTime, meeting.endTime)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={minuteStatusStyles[status]}>
              {status}
            </Badge>
            <Badge variant="outline" className="border-slate-200 bg-white text-slate-600">
              {latestVersion > 0 ? `Versi ${latestVersion}` : "Belum ada versi"}
              {EDITABLE.includes(status) && latestVersion > 0 ? ` · draft v${draftVersion}` : ""}
            </Badge>
            <Badge variant="outline" className={classificationStyles[meeting.classification]}>
              {meeting.classification === "Rahasia" && <Lock className="mr-1 size-3" />}
              {meeting.classification}
            </Badge>
          </div>
        </div>

        {/* SIMULASI PERAN */}
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-amber-300 bg-amber-50 px-4 py-2.5 text-sm print:hidden">
          <span className="font-medium text-amber-800">Simulasi peran:</span>
          <div className="inline-flex rounded-lg border border-amber-200 bg-white p-0.5">
            {(
              [
                ["notulis", `Notulis (${meeting.notetaker || "—"})`],
                ["pimpinan", `Pimpinan rapat (${meeting.leader})`],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={role === value}
                onClick={() => setRole(value)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                  role === value
                    ? "bg-amber-500 text-white"
                    : "text-amber-800 hover:bg-amber-100"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <span className="text-xs text-amber-700">
            Hanya untuk uji alur; akan diganti hak akses dari sesi login.
          </span>
        </div>
      </div>

      {/* BANNER KONDISI */}
      {snapshot && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 print:hidden"
        >
          <span>
            Menampilkan <strong>versi {snapshot.version}</strong> (hanya baca), disimpan{" "}
            {formatDateTime(snapshot.savedAt)} oleh {snapshot.savedBy}.
          </span>
          <button type="button" onClick={() => setViewVersion(null)} className={btnSecondary}>
            Kembali ke versi aktif
          </button>
        </div>
      )}

      {status === "Disetujui" && !snapshot && (
        <div role="status" className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <Lock className="mt-0.5 size-4 shrink-0" />
          <span>
            Notulen disetujui oleh <strong>{approvedBy}</strong>
            {approvedAt ? ` pada ${formatDateTime(approvedAt)}` : ""} dan terkunci (hanya baca).
            Perubahan hanya lewat amandemen yang tercatat di riwayat.
          </span>
        </div>
      )}

      {(status === "Revisi" || status === "Ditolak") && !snapshot && (
        <div role="status" className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
          <strong>{status === "Revisi" ? "Revisi diminta." : "Notulen ditolak."}</strong>{" "}
          {events.find((e) => e.action === "Revisi diminta" || e.action === "Ditolak")?.note}
        </div>
      )}

      {notice && (
        <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 print:hidden">
          {notice}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* ============================ ISI ============================ */}
        <div className="space-y-6">
          {/* PEMBAHASAN PER AGENDA */}
          <Card className="border-[#DBEAFE] shadow-sm">
            <CardHeader className="border-b bg-[#F8FAFC]">
              <CardTitle className="text-base">Pembahasan per Agenda</CardTitle>
              {errors.agenda && (
                <p role="alert" className="text-xs text-red-600">{errors.agenda}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-5 p-5">
              {meeting.agenda.map((agenda) => {
                const note = shown.agendaNotes.find((n) => n.agendaOrder === agenda.order);
                const missing = !!errors.agenda && !note?.discussion.trim();
                const id = `agenda-${agenda.order}`;

                return (
                  <div key={agenda.order} className="space-y-1.5">
                    <label htmlFor={id} className="flex items-start gap-3 text-sm font-medium text-slate-800">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700">
                        {agenda.order}
                      </span>
                      <span>
                        {agenda.topic}
                        <span className="block text-xs font-normal text-muted-foreground">
                          Pemilik agenda: {agenda.owner || "—"}
                        </span>
                      </span>
                    </label>
                    <textarea
                      id={id}
                      value={note?.discussion ?? ""}
                      readOnly={!canEdit}
                      aria-invalid={missing}
                      onChange={(e) => updateNote(agenda.order, e.target.value)}
                      placeholder="Ringkasan diskusi, data yang dibahas, dan masukan peserta."
                      className={textareaClass}
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* KESIMPULAN, KENDALA, REKOMENDASI */}
          <Card className="border-[#DBEAFE] shadow-sm">
            <CardHeader className="border-b bg-[#F8FAFC]">
              <CardTitle className="text-base">Kesimpulan, Kendala, dan Rekomendasi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 p-5">
              <div className="space-y-1.5">
                <label htmlFor="conclusion" className="text-sm font-medium text-slate-700">
                  Kesimpulan <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="conclusion"
                  value={shown.conclusion}
                  readOnly={!canEdit}
                  aria-invalid={!!errors.conclusion}
                  onChange={(e) => updateField("conclusion", e.target.value)}
                  placeholder="Hasil pembahasan yang disepakati."
                  className={textareaClass}
                />
                {errors.conclusion && (
                  <p role="alert" className="text-xs text-red-600">{errors.conclusion}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="obstacles" className="text-sm font-medium text-slate-700">
                  Kendala / isu
                </label>
                <textarea
                  id="obstacles"
                  value={shown.obstacles}
                  readOnly={!canEdit}
                  onChange={(e) => updateField("obstacles", e.target.value)}
                  className={`${textareaClass} min-h-20`}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="recommendations" className="text-sm font-medium text-slate-700">
                  Rekomendasi
                </label>
                <textarea
                  id="recommendations"
                  value={shown.recommendations}
                  readOnly={!canEdit}
                  onChange={(e) => updateField("recommendations", e.target.value)}
                  className={`${textareaClass} min-h-20`}
                />
              </div>
            </CardContent>
          </Card>

          {/* KEPUTUSAN */}
          <Card className="border-[#DBEAFE] shadow-sm">
            <CardHeader className="border-b bg-[#F8FAFC]">
              <CardTitle className="text-base">Keputusan Rapat ({shown.decisions.length})</CardTitle>
              <p className="text-xs text-muted-foreground">
                Keputusan yang membutuhkan tindak lanjut wajib dibuatkan action item
                (PIC dan deadline) di modul Tindak Lanjut.
              </p>
              {errors.decisions && (
                <p role="alert" className="text-xs text-red-600">{errors.decisions}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-4 p-5">
              {shown.decisions.length === 0 && (
                <p className="text-sm text-muted-foreground">Belum ada keputusan dicatat.</p>
              )}

              {shown.decisions.map((decision, index) => (
                <div key={decision.id} className="space-y-3 rounded-lg border border-slate-200 p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-purple-50 text-xs font-semibold text-purple-700">
                      {index + 1}
                    </span>

                    <div className="min-w-0 flex-1 space-y-3">
                      <Input
                        aria-label={`Rumusan keputusan ${index + 1}`}
                        placeholder="Rumusan keputusan"
                        value={decision.text}
                        readOnly={!canEdit}
                        onChange={(e) => updateDecision(decision.id, { text: e.target.value })}
                        maxLength={300}
                      />
                      <Input
                        aria-label={`Dasar atau pertimbangan keputusan ${index + 1}`}
                        placeholder="Dasar / pertimbangan"
                        value={decision.basis}
                        readOnly={!canEdit}
                        onChange={(e) => updateDecision(decision.id, { basis: e.target.value })}
                        maxLength={300}
                      />
                      <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={decision.needsAction}
                          disabled={!canEdit}
                          onChange={(e) =>
                            updateDecision(decision.id, { needsAction: e.target.checked })
                          }
                          className="size-4 rounded border-slate-300 accent-blue-600"
                        />
                        Memerlukan tindak lanjut (action item)
                      </label>
                    </div>

                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => removeDecision(decision.id)}
                        aria-label={`Hapus keputusan ${index + 1}`}
                        className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {canEdit && (
                <button type="button" onClick={addDecision} className={btnSecondary}>
                  <Plus className="size-4" />
                  Tambah keputusan
                </button>
              )}
            </CardContent>
          </Card>

          {/* AKSI NOTULIS */}
          {canSubmit && (
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end print:hidden">
              <button type="button" onClick={saveDraft} className={btnSecondary}>
                Simpan draft
              </button>
              <button type="button" onClick={submitForReview} className={btnPrimary}>
                <Send className="size-4" />
                Kirim untuk review (v{draftVersion})
              </button>
            </div>
          )}
        </div>

        {/* ======================== PANEL SAMPING ======================== */}
        <div className="space-y-6">
          {/* REVIEW PIMPINAN */}
          {canReview && (
            <Card className="border-amber-200 shadow-sm print:hidden">
              <CardHeader className="border-b bg-amber-50">
                <CardTitle className="text-base">Review Pimpinan Rapat</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-5">
                <label htmlFor="review-note" className="text-sm font-medium text-slate-700">
                  Komentar
                </label>
                <textarea
                  id="review-note"
                  value={reviewNote}
                  onChange={(e) => {
                    setReviewNote(e.target.value);
                    setReviewError("");
                  }}
                  aria-invalid={!!reviewError}
                  placeholder="Wajib diisi untuk revisi atau penolakan."
                  className={textareaClass}
                />
                {reviewError && (
                  <p role="alert" className="text-xs text-red-600">{reviewError}</p>
                )}

                <div className="grid gap-2">
                  <button type="button" onClick={() => review("approve")} className={btnSuccess}>
                    <CheckCircle2 className="size-4" />
                    Setujui
                  </button>
                  <button type="button" onClick={() => review("revise")} className={btnWarning}>
                    <RotateCcw className="size-4" />
                    Minta revisi
                  </button>
                  <button type="button" onClick={() => review("reject")} className={btnDanger}>
                    <XCircle className="size-4" />
                    Tolak
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          {role === "pimpinan" && status === "Menunggu Review" && snapshot && (
            <p className="text-xs text-muted-foreground print:hidden">
              Kembali ke versi aktif untuk melakukan review.
            </p>
          )}

          {/* AMANDEMEN */}
          {canAmend && (
            <Card className="border-[#DBEAFE] shadow-sm print:hidden">
              <CardHeader className="border-b bg-[#F8FAFC]">
                <CardTitle className="text-base">Amandemen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-5">
                {!amendOpen ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Notulen yang disetujui tidak dapat diubah langsung. Ajukan
                      amandemen untuk membuat versi baru.
                    </p>
                    <button type="button" onClick={() => setAmendOpen(true)} className={btnSecondary}>
                      Ajukan amandemen
                    </button>
                  </>
                ) : (
                  <>
                    <label htmlFor="amend-reason" className="text-sm font-medium text-slate-700">
                      Alasan amandemen <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="amend-reason"
                      value={amendReason}
                      onChange={(e) => {
                        setAmendReason(e.target.value);
                        setAmendError("");
                      }}
                      aria-invalid={!!amendError}
                      className={textareaClass}
                    />
                    {amendError && (
                      <p role="alert" className="text-xs text-red-600">{amendError}</p>
                    )}
                    <div className="flex gap-2">
                      <button type="button" onClick={startAmendment} className={btnPrimary}>
                        Mulai amandemen
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAmendOpen(false);
                          setAmendError("");
                        }}
                        className={btnSecondary}
                      >
                        Batal
                      </button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* RIWAYAT VERSI */}
          <Card className="border-[#DBEAFE] shadow-sm print:hidden">
            <CardHeader className="border-b bg-[#F8FAFC]">
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="size-4 text-blue-600" />
                Versi
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {versions.length === 0 ? (
                <p className="p-5 text-sm text-muted-foreground">
                  Versi pertama dibuat saat notulen dikirim untuk review.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {[...versions].reverse().map((version) => (
                    <li key={version.version} className="flex items-center justify-between gap-3 px-5 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800">
                          Versi {version.version}
                          {version.version === latestVersion && (
                            <span className="ml-2 text-xs font-normal text-emerald-600">terbaru</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {version.reason} · {version.savedBy}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(version.savedAt)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setViewVersion(version.version)}
                        aria-label={`Lihat versi ${version.version}`}
                        aria-pressed={viewVersion === version.version}
                        className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-blue-100 hover:text-blue-700"
                      >
                        <Eye className="size-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* RIWAYAT AKTIVITAS */}
          <Card className="border-[#DBEAFE] shadow-sm print:hidden">
            <CardHeader className="border-b bg-[#F8FAFC]">
              <CardTitle className="text-base">Riwayat Aktivitas</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              {events.length === 0 ? (
                <p className="text-sm text-muted-foreground">Belum ada aktivitas.</p>
              ) : (
                <ol className="relative space-y-4 border-l border-slate-200 pl-5">
                  {events.map((event) => (
                    <li key={event.id} className="relative">
                      <span className="absolute -left-[26px] top-1.5 size-2.5 rounded-full border-2 border-white bg-blue-500" />
                      <p className="text-sm font-medium text-slate-800">{event.action}</p>
                      <p className="text-xs text-muted-foreground">
                        {event.actor} · {formatDateTime(event.at)}
                      </p>
                      {event.note && (
                        <p className="mt-1 rounded-md bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600">
                          {event.note}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>

          <div className="print:hidden">
            <button type="button" onClick={() => window.print()} className={btnSecondary}>
              <Printer className="size-4" />
              Cetak / simpan PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}