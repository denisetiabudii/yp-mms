"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PRIORITIES, todayJakarta, type Priority } from "@/lib/actions";
import { MEETINGS, PEOPLE, getMeeting } from "@/lib/meetings";
import { getMinute } from "@/lib/minutes";

const controlClass =
  "h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 aria-[invalid=true]:border-red-400 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";
const textareaClass =
  "min-h-20 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";
const primaryButton =
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40";
const secondaryButton =
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40";

type FormErrors = Partial<Record<"title" | "pic" | "deadline" | "verifier", string>>;

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
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Pembungkus: membaca ?meeting= dan ?decision= (dari tombol "Action item"
 * di halaman Keputusan) untuk mengisi form. useSearchParams wajib di <Suspense>.
 */
export default function NewActionItemPage() {
  return (
    <Suspense fallback={null}>
      <FormFromUrl />
    </Suspense>
  );
}

function FormFromUrl() {
  const params = useSearchParams();
  const meetingId = params.get("meeting") ?? "";
  const decisionId = params.get("decision") ?? "";

  return (
    <NewActionItemForm
      key={`${meetingId}:${decisionId}`}
      initialMeetingId={getMeeting(meetingId) ? meetingId : ""}
      initialDecisionId={decisionId}
    />
  );
}

function NewActionItemForm({
  initialMeetingId,
  initialDecisionId,
}: {
  initialMeetingId: string;
  initialDecisionId: string;
}) {
  const initialMeeting = initialMeetingId ? getMeeting(initialMeetingId) : undefined;
  const initialDecision = getMinute(initialMeetingId)?.content.decisions.find(
    (d) => d.id === initialDecisionId && d.needsAction,
  );

  const [title, setTitle] = React.useState(
    initialDecision ? `Menindaklanjuti: ${initialDecision.text}` : "",
  );
  const [meetingId, setMeetingId] = React.useState(initialMeetingId);
  const [decisionId, setDecisionId] = React.useState(initialDecision ? initialDecisionId : "");
  const [pic, setPic] = React.useState("");
  const [supporters, setSupporters] = React.useState<string[]>([]);
  const [deadline, setDeadline] = React.useState("");
  const [priority, setPriority] = React.useState<Priority>("Normal");
  const [expectedResult, setExpectedResult] = React.useState("");
  const [verifier, setVerifier] = React.useState(initialMeeting?.leader ?? "");

  const [errors, setErrors] = React.useState<FormErrors>({});
  const [saved, setSaved] = React.useState(false);

  const today = todayJakarta();
  const decisions = (getMinute(meetingId)?.content.decisions ?? []).filter((d) => d.needsAction);

  function handleMeetingChange(value: string) {
    setMeetingId(value);
    setDecisionId(""); // keputusan milik rapat lama tidak berlaku lagi

    const leader = getMeeting(value)?.leader;
    if (leader && !verifier) setVerifier(leader);
  }

  function handleDecisionChange(value: string) {
    setDecisionId(value);

    const decision = decisions.find((d) => d.id === value);
    if (decision && !title.trim()) setTitle(`Menindaklanjuti: ${decision.text}`);
  }

  function toggleSupporter(name: string) {
    setSupporters((current) =>
      current.includes(name) ? current.filter((x) => x !== name) : [...current, name],
    );
  }

  /** Aturan PRD: action item wajib punya judul, PIC, dan deadline. */
  function validate(): FormErrors {
    const next: FormErrors = {};

    if (!title.trim()) next.title = "Judul action item wajib diisi.";
    if (!pic) next.pic = "PIC wajib dipilih.";
    if (!deadline) next.deadline = "Deadline wajib diisi.";
    else if (deadline < today) next.deadline = "Deadline tidak boleh sebelum hari ini.";
    if (!verifier) next.verifier = "Verifikator wajib dipilih.";

    return next;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const result = validate();
    setErrors(result);

    if (Object.keys(result).length > 0) {
      document.getElementById(`field-${Object.keys(result)[0]}`)?.focus();
      return;
    }

    // TODO: simpan lewat Server Action (validasi ulang di server, nomor AI-xxx
    // dibuat database, audit_logs, notifikasi ke PIC dan pendukung).
    setSaved(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (saved) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="border-emerald-200 shadow-sm">
          <CardContent className="space-y-4 p-8 text-center">
            <CheckCircle2 className="mx-auto size-12 text-emerald-600" />
            <h1 className="text-xl font-bold">Data action item lolos validasi</h1>
            <p className="text-sm text-muted-foreground">
              Form belum tersambung ke backend, jadi action item ini belum benar-benar tersimpan.
            </p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/action-items" className={primaryButton}>Kembali ke tindak lanjut</Link>
              <button type="button" onClick={() => setSaved(false)} className={secondaryButton}>Ubah lagi</button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const errorCount = Object.keys(errors).length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-3">
        <Link href="/action-items" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-700">
          <ArrowLeft className="size-4" />
          Kembali ke tindak lanjut
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Buat Action Item</h1>
          <p className="text-sm text-muted-foreground">
            Kolom bertanda <span className="text-red-500">*</span> wajib diisi.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {errorCount > 0 && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Terdapat {errorCount} isian yang perlu diperbaiki.
          </div>
        )}

        <Card className="border-[#DBEAFE] shadow-sm">
          <CardHeader className="border-b bg-[#F8FAFC]">
            <CardTitle className="text-base">Sumber</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 p-5 sm:grid-cols-2">
            <Field id="field-meeting" label="Rapat" hint="Kosongkan untuk instruksi langsung.">
              <select
                id="field-meeting"
                value={meetingId}
                onChange={(e) => handleMeetingChange(e.target.value)}
                className={controlClass}
              >
                <option value="">Tanpa rapat (instruksi langsung)</option>
                {MEETINGS.map((m) => (
                  <option key={m.id} value={m.id}>{m.title}</option>
                ))}
              </select>
            </Field>

            <Field
              id="field-decision"
              label="Keputusan"
              hint={
                meetingId && decisions.length === 0
                  ? "Rapat ini belum memiliki keputusan yang perlu tindak lanjut."
                  : undefined
              }
            >
              <select
                id="field-decision"
                value={decisionId}
                onChange={(e) => handleDecisionChange(e.target.value)}
                disabled={!meetingId || decisions.length === 0}
                className={controlClass}
              >
                <option value="">{meetingId ? "Tidak terkait keputusan" : "Pilih rapat dahulu"}</option>
                {decisions.map((d) => (
                  <option key={d.id} value={d.id}>{d.text}</option>
                ))}
              </select>
            </Field>
          </CardContent>
        </Card>

        <Card className="border-[#DBEAFE] shadow-sm">
          <CardHeader className="border-b bg-[#F8FAFC]">
            <CardTitle className="text-base">Detail Tugas</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 p-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field id="field-title" label="Judul tugas" required error={errors.title}>
                <Input
                  id="field-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  aria-invalid={!!errors.title}
                  aria-describedby={errors.title ? "field-title-error" : undefined}
                  maxLength={200}
                  placeholder="Apa yang harus dikerjakan?"
                />
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Field id="field-expected" label="Hasil yang diharapkan">
                <textarea
                  id="field-expected"
                  value={expectedResult}
                  onChange={(e) => setExpectedResult(e.target.value)}
                  className={textareaClass}
                  maxLength={500}
                  placeholder="Bentuk hasil atau bukti yang dianggap selesai."
                />
              </Field>
            </div>

            <Field id="field-pic" label="PIC" required error={errors.pic}>
              <select
                id="field-pic"
                value={pic}
                onChange={(e) => setPic(e.target.value)}
                aria-invalid={!!errors.pic}
                aria-describedby={errors.pic ? "field-pic-error" : undefined}
                className={controlClass}
              >
                <option value="">Pilih PIC…</option>
                {PEOPLE.map((p) => (
                  <option key={p.id} value={p.name}>{p.name} — {p.position}</option>
                ))}
              </select>
            </Field>

            <Field id="field-deadline" label="Deadline" required error={errors.deadline}>
              <Input
                id="field-deadline"
                type="date"
                min={today}
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                aria-invalid={!!errors.deadline}
                aria-describedby={errors.deadline ? "field-deadline-error" : undefined}
              />
            </Field>

            <Field id="field-priority" label="Prioritas">
              <select
                id="field-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className={controlClass}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </Field>

            <Field
              id="field-verifier"
              label="Verifikator"
              required
              error={errors.verifier}
              hint="Yang memastikan tugas benar-benar selesai."
            >
              <select
                id="field-verifier"
                value={verifier}
                onChange={(e) => setVerifier(e.target.value)}
                aria-invalid={!!errors.verifier}
                aria-describedby={errors.verifier ? "field-verifier-error" : undefined}
                className={controlClass}
              >
                <option value="">Pilih verifikator…</option>
                {PEOPLE.map((p) => (
                  <option key={p.id} value={p.name}>{p.name} — {p.position}</option>
                ))}
              </select>
            </Field>

            <fieldset className="sm:col-span-2">
              <legend className="text-sm font-medium text-slate-700">
                Pendukung{" "}
                <span className="font-normal text-muted-foreground">({supporters.length} dipilih)</span>
              </legend>
              <div className="mt-2 grid max-h-48 gap-1 overflow-y-auto rounded-lg border border-slate-200 p-2 sm:grid-cols-2">
                {PEOPLE.filter((p) => p.name !== pic).map((p) => {
                  const checked = supporters.includes(p.name);

                  return (
                    <label
                      key={p.id}
                      className={`flex cursor-pointer items-start gap-2.5 rounded-md px-2.5 py-2 text-sm transition hover:bg-blue-50 ${checked ? "bg-blue-50" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSupporter(p.name)}
                        className="mt-0.5 size-4 rounded border-slate-300 accent-blue-600"
                      />
                      <span>
                        <span className="block font-medium text-slate-800">{p.name}</span>
                        <span className="block text-xs text-muted-foreground">{p.position}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </CardContent>
        </Card>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link href="/action-items" className={secondaryButton}>Batal</Link>
          <button type="submit" className={primaryButton}>Simpan Action Item</button>
        </div>
      </form>
    </div>
  );
}