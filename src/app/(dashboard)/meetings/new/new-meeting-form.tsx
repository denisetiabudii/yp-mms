"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Plus, Trash2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  CLASSIFICATIONS,
  DEPARTMENTS,
  MEETING_MODES,
  MEETING_TYPES,
  PEOPLE,
  UNITS,
  previewMeetingNumber,
  describeMeetingChanges,
  type Classification,
  type Meeting,
  type MeetingMode,
} from "@/lib/meetings";

/* ----------------------------- Gaya bersama ----------------------------- */

const controlClass =
  "h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 aria-[invalid=true]:border-red-400 aria-[invalid=true]:ring-red-400/20";

const textareaClass =
  "min-h-20 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

const primaryButton =
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40";

const secondaryButton =
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40";
type MeetingMasterData = {
  meetingTypes: {
    id: string;
    name: string;
    sort_order: number;
  }[];
  orgNodes: {
    id: string;
    parent_id: string | null;
    kind: string;
    name: string;
    code: string | null;
    sort_order: number;
  }[];
};
type AgendaDraft = {
  key: number;
  topic: string;
  owner: string;
  duration: string;
};

type FormErrors = Partial<
  Record<
    | "title"
    | "unitId"
    | "date"
    | "startTime"
    | "endTime"
    | "location"
    | "leader"
    | "agenda"
    | "link"
    | "reason",
    string
  >
>;

function Field({
  id,
  label,
  required,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Formulir rapat. Tanpa `meeting` = membuat rapat baru; dengan `meeting` = mengubah
 * rapat yang sudah ada (hanya yang berstatus Dijadwalkan; dijaga oleh halaman edit).
 */
export function NewMeetingForm({
  initialDate,
  meeting,
  masterData,
}: {
  initialDate: string;
  meeting?: Meeting;
  masterData?: MeetingMasterData;
}) {
  const nextKey = React.useRef(meeting ? meeting.agenda.length + 1 : 2);

  const [title, setTitle] = React.useState(meeting?.title ?? "");
  const [purpose, setPurpose] = React.useState(meeting?.purpose ?? "");
  const [typeId, setTypeId] = React.useState<string>(
    meeting?.typeId ?? masterData?.meetingTypes[0]?.id ?? MEETING_TYPES[0].id,
  );
  const [unitId, setUnitId] = React.useState(meeting?.unitId ?? "");
  const [departmentId, setDepartmentId] = React.useState(
    meeting?.departmentId ?? "",
  );
  const [divisionId, setDivisionId] = React.useState("");
  const [date, setDate] = React.useState(meeting?.date ?? initialDate);
  const [startTime, setStartTime] = React.useState(meeting?.startTime ?? "");
  const [endTime, setEndTime] = React.useState(meeting?.endTime ?? "");
  const [mode, setMode] = React.useState<MeetingMode>(
    meeting?.mode ?? "Luring",
  );
  const [location, setLocation] = React.useState(meeting?.location ?? "");
  const [link, setLink] = React.useState(meeting?.link ?? "");
  const [leader, setLeader] = React.useState(meeting?.leader ?? "");
  const [notetaker, setNotetaker] = React.useState(meeting?.notetaker ?? "");
  const [classification, setClassification] = React.useState<Classification>(
    meeting?.classification ?? "Internal",
  );
  const [participantIds, setParticipantIds] = React.useState<string[]>(() =>
    meeting
      ? PEOPLE.filter((p) =>
          meeting.participants.some((x) => x.name === p.name),
        ).map((p) => p.id)
      : [],
  );
  const [agenda, setAgenda] = React.useState<AgendaDraft[]>(() =>
    meeting
      ? meeting.agenda.map((a, index) => ({
          key: index + 1,
          topic: a.topic,
          owner: a.owner,
          duration: a.durationMinutes ? String(a.durationMinutes) : "",
        }))
      : [{ key: 1, topic: "", owner: "", duration: "" }],
  );

  const [errors, setErrors] = React.useState<FormErrors>({});
  const [saved, setSaved] = React.useState(false);
  const [reason, setReason] = React.useState("");

  // Master data dari Supabase untuk form baru.
  // Halaman edit masih menggunakan data dummy sementara.
  const meetingTypeOptions = masterData?.meetingTypes ?? MEETING_TYPES;

  const unitOptions = masterData
    ? masterData.orgNodes
        .filter((node) => node.kind === "unit")
        .map((node) => ({
          id: node.id,
          name: node.name,
        }))
    : UNITS;

  const departments = masterData
    ? masterData.orgNodes
        .filter(
          (node) => node.kind === "departemen" && node.parent_id === unitId,
        )
        .map((node) => ({
          id: node.id,
          name: node.name,
        }))
    : DEPARTMENTS.filter((department) => department.unitId === unitId);

  const divisions = masterData
    ? masterData.orgNodes
        .filter(
          (node) => node.kind === "divisi" && node.parent_id === departmentId,
        )
        .map((node) => ({
          id: node.id,
          name: node.name,
        }))
    : [];

  // Mode ubah: bandingkan dengan data asli untuk tahu apa yang berubah dan apakah alasan wajib.
  const diff = meeting
    ? describeMeetingChanges(meeting, {
        title,
        purpose,
        typeId,
        date,
        startTime,
        endTime,
        mode,
        location,
        link,
        leader,
        notetaker,
        classification,
        participantNames: PEOPLE.filter((p) =>
          participantIds.includes(p.id),
        ).map((p) => p.name),
        agenda: agenda.map((a) => ({
          topic: a.topic,
          owner: a.owner,
          duration: a.duration,
        })),
      })
    : null;
  const needsReason =
    !!diff && (diff.scheduleChanged || diff.classificationChanged);

  function handleUnitChange(value: string) {
    setUnitId(value);
    setDepartmentId("");
    setDivisionId("");
  }

  function toggleParticipant(id: string) {
    setParticipantIds((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );
  }

  function updateAgenda(key: number, patch: Partial<AgendaDraft>) {
    setAgenda((current) =>
      current.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    );
  }

  function addAgenda() {
    setAgenda((current) => [
      ...current,
      { key: nextKey.current++, topic: "", owner: "", duration: "" },
    ]);
  }

  function removeAgenda(key: number) {
    setAgenda((current) =>
      current.length === 1
        ? current
        : current.filter((item) => item.key !== key),
    );
  }

  /** Aturan bisnis PRD bagian 10 + validasi dasar form. */
  function validate(): FormErrors {
    const next: FormErrors = {};

    if (!title.trim()) next.title = "Judul rapat wajib diisi.";
    if (!unitId) next.unitId = "Pilih unit penyelenggara.";
    if (!date) next.date = "Tanggal rapat wajib diisi.";
    if (!startTime) next.startTime = "Waktu mulai wajib diisi.";
    if (!endTime) next.endTime = "Waktu selesai wajib diisi.";
    if (startTime && endTime && endTime <= startTime) {
      next.endTime = "Waktu selesai harus setelah waktu mulai.";
    }
    if (mode !== "Daring" && !location.trim()) {
      next.location = "Lokasi wajib diisi untuk rapat luring/hibrida.";
    }
    if (mode !== "Luring" && !link.trim()) {
      next.link = "Tautan rapat wajib diisi untuk rapat daring/hibrida.";
    } else if (link.trim() && !/^https?:\/\/\S+$/i.test(link.trim())) {
      next.link = "Tautan harus diawali http:// atau https://.";
    }
    if (!leader) next.leader = "Pimpinan rapat wajib dipilih.";
    if (!agenda.some((item) => item.topic.trim())) {
      next.agenda = "Minimal satu agenda harus diisi.";
    }

    if (diff) {
      if (needsReason && reason.trim().length < 5) {
        next.reason = "Alasan perubahan wajib diisi (minimal 5 karakter).";
      }
    }

    return next;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const result = validate();
    setErrors(result);

    if (Object.keys(result).length > 0) {
      // Fokuskan kolom pertama yang salah agar mudah diperbaiki.
      const firstId = Object.keys(result)[0];
      document.getElementById(`field-${firstId}`)?.focus();
      return;
    }

    // TODO: simpan ke Supabase lewat Server Action (validasi ulang di server,
    // nomor rapat dibuat database, rekam audit_logs, kirim notifikasi undangan).
    setSaved(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const numberPreview = previewMeetingNumber(
    unitId,
    departmentId || undefined,
    date,
  );

  if (saved) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Card className="border-emerald-200 shadow-sm">
          <CardContent className="space-y-4 p-8 text-center">
            <CheckCircle2 className="mx-auto size-12 text-emerald-600" />
            <h1 className="text-xl font-bold">
              {meeting
                ? "Perubahan rapat lolos validasi"
                : "Data rapat lolos validasi"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Form belum tersambung ke backend, jadi{" "}
              {meeting ? "perubahan" : "rapat"} ini belum benar-benar tersimpan.
            </p>

            {diff && diff.changes.length > 0 && (
              <ul className="mx-auto max-w-md list-disc space-y-1 rounded-lg bg-slate-50 py-3 pl-8 pr-4 text-left text-xs text-slate-600">
                {diff.changes.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            )}

            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href={meeting ? `/meetings/${meeting.id}` : "/meetings"}
                className={primaryButton}
              >
                {meeting
                  ? "Kembali ke detail rapat"
                  : "Kembali ke daftar rapat"}
              </Link>
              <button
                type="button"
                onClick={() => setSaved(false)}
                className={secondaryButton}
              >
                Ubah lagi
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const errorCount = Object.keys(errors).length;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* HEADER */}
      <div className="space-y-3">
        <Link
          href={meeting ? `/meetings/${meeting.id}` : "/meetings"}
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-700"
        >
          <ArrowLeft className="size-4" />
          {meeting ? "Kembali ke detail rapat" : "Kembali ke daftar rapat"}
        </Link>

        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {meeting ? "Ubah Rapat" : "Buat Rapat"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Isi data rapat, peserta, dan agenda. Kolom bertanda{" "}
            <span className="text-red-500">*</span> wajib diisi.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {errorCount > 0 && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            Terdapat {errorCount} isian yang perlu diperbaiki.
          </div>
        )}

        {/* 1. IDENTITAS */}
        <Card className="border-[#DBEAFE] shadow-sm">
          <CardHeader className="border-b bg-[#F8FAFC]">
            <CardTitle className="text-base">Identitas Rapat</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 p-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field
                id="field-title"
                label="Judul rapat"
                required
                error={errors.title}
              >
                <Input
                  id="field-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  aria-invalid={!!errors.title}
                  aria-describedby={
                    errors.title ? "field-title-error" : undefined
                  }
                  placeholder="Contoh: Rapat Koordinasi Program Ramadan"
                  maxLength={150}
                />
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Field id="field-purpose" label="Tujuan rapat">
                <textarea
                  id="field-purpose"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className={textareaClass}
                  placeholder="Ringkas tujuan atau hasil yang diharapkan dari rapat."
                  maxLength={500}
                />
              </Field>
            </div>

            <Field id="field-typeId" label="Jenis rapat" required>
              <select
                id="field-typeId"
                value={typeId}
                onChange={(e) => setTypeId(e.target.value)}
                className={controlClass}
              >
                {meetingTypeOptions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              id="field-classification"
              label="Klasifikasi"
              required
              hint={
                classification === "Rahasia"
                  ? "Rahasia: hanya peserta dan pengguna yang diberi akses eksplisit; tidak muncul di pencarian umum."
                  : classification === "Internal"
                    ? "Internal: hanya peserta dan pengguna berwenang pada scope rapat."
                    : "Umum: dapat dilihat pengguna dalam unit sesuai kebijakan."
              }
            >
              <select
                id="field-classification"
                value={classification}
                onChange={(e) =>
                  setClassification(e.target.value as Classification)
                }
                className={controlClass}
              >
                {CLASSIFICATIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              id="field-unitId"
              label="Unit"
              required
              error={errors.unitId}
              hint={
                meeting
                  ? "Unit tidak dapat diubah agar nomor rapat tetap. Bila salah unit, batalkan lalu buat rapat baru."
                  : undefined
              }
            >
              <select
                id="field-unitId"
                value={unitId}
                onChange={(e) => handleUnitChange(e.target.value)}
                disabled={!!meeting}
                aria-invalid={!!errors.unitId}
                aria-describedby={
                  errors.unitId ? "field-unitId-error" : undefined
                }
                className={controlClass}
              >
                <option value="">Pilih unit…</option>
                {unitOptions.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              id="field-departmentId"
              label="Departemen"
              hint={
                unitId && departments.length === 0
                  ? "Unit ini tidak memiliki departemen."
                  : undefined
              }
            >
              <select
                id="field-departmentId"
                value={departmentId}
                onChange={(e) => {
                  setDepartmentId(e.target.value);
                  setDivisionId("");
                }}
                disabled={!!meeting || departments.length === 0}
                className={`${controlClass} disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400`}
              >
                <option value="">
                  {unitId
                    ? "Seluruh unit / tanpa departemen"
                    : "Pilih unit dahulu"}
                </option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              id="field-divisionId"
              label="Divisi"
              hint={
                departmentId && divisions.length === 0
                  ? "Departemen ini tidak memiliki divisi."
                  : undefined
              }
            >
              <select
                id="field-divisionId"
                value={divisionId}
                onChange={(e) => setDivisionId(e.target.value)}
                disabled={!!meeting || !departmentId || divisions.length === 0}
                className={`${controlClass} disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400`}
              >
                <option value="">
                  {departmentId ? "Tanpa divisi" : "Pilih departemen dahulu"}
                </option>
                {divisions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="rounded-lg border border-dashed border-blue-200 bg-blue-50/50 px-4 py-3 sm:col-span-2">
              <p className="text-xs text-slate-500">
                {meeting ? "Nomor rapat" : "Pratinjau nomor rapat"}
              </p>
              <p className="mt-1 font-mono text-sm font-semibold text-blue-800">
                {meeting ? meeting.number : numberPreview}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {meeting
                  ? "Nomor rapat tetap dan tidak berubah."
                  : "Nomor urut dibuat otomatis oleh sistem saat rapat disimpan."}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 2. WAKTU & TEMPAT */}
        <Card className="border-[#DBEAFE] shadow-sm">
          <CardHeader className="border-b bg-[#F8FAFC]">
            <CardTitle className="text-base">Waktu dan Tempat</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 p-5 sm:grid-cols-3">
            <Field id="field-date" label="Tanggal" required error={errors.date}>
              <Input
                id="field-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                aria-invalid={!!errors.date}
                aria-describedby={errors.date ? "field-date-error" : undefined}
              />
            </Field>

            <Field
              id="field-startTime"
              label="Mulai (WIB)"
              required
              error={errors.startTime}
            >
              <Input
                id="field-startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                aria-invalid={!!errors.startTime}
                aria-describedby={
                  errors.startTime ? "field-startTime-error" : undefined
                }
              />
            </Field>

            <Field
              id="field-endTime"
              label="Selesai (WIB)"
              required
              error={errors.endTime}
            >
              <Input
                id="field-endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                aria-invalid={!!errors.endTime}
                aria-describedby={
                  errors.endTime ? "field-endTime-error" : undefined
                }
              />
            </Field>

            <Field id="field-mode" label="Pelaksanaan" required>
              <select
                id="field-mode"
                value={mode}
                onChange={(e) => setMode(e.target.value as MeetingMode)}
                className={controlClass}
              >
                {MEETING_MODES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              id="field-location"
              label="Lokasi"
              required={mode !== "Daring"}
              error={errors.location}
            >
              <Input
                id="field-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                aria-invalid={!!errors.location}
                aria-describedby={
                  errors.location ? "field-location-error" : undefined
                }
                placeholder="Contoh: Ruang Meeting Utama"
                maxLength={120}
              />
            </Field>

            <Field
              id="field-link"
              label="Tautan rapat"
              required={mode !== "Luring"}
              error={errors.link}
            >
              <Input
                id="field-link"
                type="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                aria-invalid={!!errors.link}
                aria-describedby={errors.link ? "field-link-error" : undefined}
                placeholder="https://…"
              />
            </Field>
          </CardContent>
        </Card>

        {/* 3. PENGELOLA & PESERTA */}
        <Card className="border-[#DBEAFE] shadow-sm">
          <CardHeader className="border-b bg-[#F8FAFC]">
            <CardTitle className="text-base">Pengelola dan Peserta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 p-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                id="field-leader"
                label="Pimpinan rapat"
                required
                error={errors.leader}
              >
                <select
                  id="field-leader"
                  value={leader}
                  onChange={(e) => setLeader(e.target.value)}
                  aria-invalid={!!errors.leader}
                  aria-describedby={
                    errors.leader ? "field-leader-error" : undefined
                  }
                  className={controlClass}
                >
                  <option value="">Pilih pimpinan…</option>
                  {PEOPLE.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name} — {p.position}
                    </option>
                  ))}
                </select>
              </Field>

              <Field
                id="field-notetaker"
                label="Notulis"
                hint="Boleh dikosongkan dan ditetapkan kemudian."
              >
                <select
                  id="field-notetaker"
                  value={notetaker}
                  onChange={(e) => setNotetaker(e.target.value)}
                  className={controlClass}
                >
                  <option value="">Belum ditetapkan</option>
                  {PEOPLE.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name} — {p.position}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <fieldset>
              <legend className="text-sm font-medium text-slate-700">
                Peserta{" "}
                <span className="font-normal text-muted-foreground">
                  ({participantIds.length} dipilih)
                </span>
              </legend>

              <div className="mt-2 grid max-h-60 gap-1 overflow-y-auto rounded-lg border border-slate-200 p-2 sm:grid-cols-2">
                {PEOPLE.map((person) => {
                  const checked = participantIds.includes(person.id);

                  return (
                    <label
                      key={person.id}
                      className={`flex cursor-pointer items-start gap-2.5 rounded-md px-2.5 py-2 text-sm transition hover:bg-blue-50 ${
                        checked ? "bg-blue-50" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleParticipant(person.id)}
                        className="mt-0.5 size-4 rounded border-slate-300 accent-blue-600"
                      />
                      <span>
                        <span className="block font-medium text-slate-800">
                          {person.name}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {person.position}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </CardContent>
        </Card>

        {/* 4. AGENDA */}
        <Card className="border-[#DBEAFE] shadow-sm">
          <CardHeader className="border-b bg-[#F8FAFC]">
            <CardTitle className="text-base">
              Agenda <span className="text-red-500">*</span>
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Minimal satu agenda sebelum rapat dijadwalkan.
            </p>
          </CardHeader>
          <CardContent className="space-y-4 p-5">
            {agenda.map((item, index) => (
              <div
                key={item.key}
                className="grid gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-[2rem_1fr_12rem_6rem_2.25rem] sm:items-center"
              >
                <span className="flex size-7 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700">
                  {index + 1}
                </span>

                <Input
                  id={index === 0 ? "field-agenda" : undefined}
                  aria-label={`Topik agenda ${index + 1}`}
                  placeholder="Topik pembahasan"
                  value={item.topic}
                  onChange={(e) =>
                    updateAgenda(item.key, { topic: e.target.value })
                  }
                  aria-invalid={index === 0 && !!errors.agenda}
                  maxLength={200}
                />

                <select
                  aria-label={`Pemilik agenda ${index + 1}`}
                  value={item.owner}
                  onChange={(e) =>
                    updateAgenda(item.key, { owner: e.target.value })
                  }
                  className={controlClass}
                >
                  <option value="">Pemilik agenda</option>
                  {PEOPLE.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>

                <Input
                  aria-label={`Durasi agenda ${index + 1} (menit)`}
                  type="number"
                  min={1}
                  max={480}
                  placeholder="Menit"
                  value={item.duration}
                  onChange={(e) =>
                    updateAgenda(item.key, { duration: e.target.value })
                  }
                />

                <button
                  type="button"
                  onClick={() => removeAgenda(item.key)}
                  disabled={agenda.length === 1}
                  aria-label={`Hapus agenda ${index + 1}`}
                  className="inline-flex size-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}

            {errors.agenda && (
              <p role="alert" className="text-xs text-red-600">
                {errors.agenda}
              </p>
            )}

            <button
              type="button"
              onClick={addAgenda}
              className={secondaryButton}
            >
              <Plus className="size-4" />
              Tambah agenda
            </button>
          </CardContent>
        </Card>

        {/* ALASAN PERUBAHAN (hanya mode ubah, bila jadwal/klasifikasi berubah) */}
        {diff && (
          <Card className="border-[#DBEAFE] shadow-sm">
            <CardHeader className="border-b bg-[#F8FAFC]">
              <CardTitle className="text-base">Ringkasan Perubahan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-5">
              {diff.changes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Belum ada perubahan dari data semula.
                </p>
              ) : (
                <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
                  {diff.changes.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              )}

              {diff.scheduleChanged && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Jadwal atau tempat berubah: seluruh peserta akan menerima
                  pemberitahuan perubahan.
                </p>
              )}

              {needsReason && (
                <Field
                  id="field-reason"
                  label="Alasan perubahan"
                  required
                  error={errors.reason}
                  hint="Dicatat di audit log dan disertakan pada pemberitahuan ke peserta."
                >
                  <textarea
                    id="field-reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    aria-invalid={!!errors.reason}
                    aria-describedby={
                      errors.reason ? "field-reason-error" : undefined
                    }
                    className={textareaClass}
                    maxLength={300}
                  />
                </Field>
              )}
            </CardContent>
          </Card>
        )}

        {/* AKSI */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            href={meeting ? `/meetings/${meeting.id}` : "/meetings"}
            className={secondaryButton}
          >
            Batal
          </Link>
          <button
            type="submit"
            disabled={!!diff && diff.changes.length === 0}
            className={`${primaryButton} disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {meeting ? "Simpan Perubahan" : "Simpan Rapat"}
          </button>
        </div>
      </form>
    </div>
  );
}
