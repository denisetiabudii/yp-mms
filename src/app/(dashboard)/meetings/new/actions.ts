"use server";

import { revalidatePath } from "next/cache";

import { UUID_PATTERN } from "@/lib/org-validation";
import { getSessionState } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

type Candidate = {
  id: string;
  full_name: string;
};

type CandidateResult =
  | { ok: true; candidates: Candidate[] }
  | { ok: false; error: string };

export type CreateMeetingInput = {
  title: string;
  purpose: string;
  typeId: string;
  unitId: string;
  departmentId: string;
  divisionId: string;
  classification: string;
  date: string;
  startTime: string;
  endTime: string;
  mode: string;
  location: string;
  link: string;
  leaderId: string;
  notetakerId: string;
  agenda: {
    topic: string;
    ownerId: string;
    duration: string;
  }[];
  participantIds: string[];
};

export type CreateMeetingResult =
  | { ok: true; meetingId: string; meetingNumber: string }
  | { ok: false; error: string };

const fail = (error: string) => ({ ok: false as const, error });

const NOT_ALLOWED = "Anda tidak berwenang melakukan ini.";

function isUUID(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function isUUIDOrEmpty(value: unknown): value is string {
  return value === "" || isUUID(value);
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const parsed = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function validTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function cleanText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/**
 * Server Action untuk mengambil kandidat pengelola/peserta
 * berdasarkan scope rapat.
 */
export async function getMeetingCandidatesAction(
  unitId: string,
  departmentId: string,
  divisionId: string,
): Promise<CandidateResult> {
  const session = await getSessionState();

  if (session.status !== "ok") {
    return fail(NOT_ALLOWED);
  }

  if (
    !isUUID(unitId) ||
    !isUUIDOrEmpty(departmentId) ||
    !isUUIDOrEmpty(divisionId) ||
    (divisionId && !departmentId)
  ) {
    return fail("Scope organisasi tidak valid.");
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_meeting_candidates", {
    p_org_node_id: unitId,
    p_department_node_id: departmentId || null,
    p_division_node_id: divisionId || null,
  });

  if (error) {
    console.error("Gagal memuat kandidat rapat:", error.code);

    return fail(
      "Gagal memuat daftar kandidat. Coba pilih ulang scope rapat.",
    );
  }

  const rows = (data ?? []) as {
  id: string;
  full_name: string;
}[];

return {
  ok: true,
  candidates: rows.map((row) => ({
    id: row.id,
    full_name: row.full_name,
  })),
};
}

/**
 * Server Action penyimpanan rapat.
 * Validasi dilakukan ulang di server, sedangkan aturan scope,
 * eligibility, nomor rapat, dan transaksi dijaga oleh database.
 */
export async function createMeetingAction(
  input: CreateMeetingInput,
): Promise<CreateMeetingResult> {
  const session = await getSessionState();

  if (session.status !== "ok") {
    return fail(NOT_ALLOWED);
  }

  if (!input || typeof input !== "object") {
    return fail("Data rapat tidak valid.");
  }

  const title = cleanText(input.title, 150);
  const purpose = cleanText(input.purpose, 500);
  const typeId = cleanText(input.typeId, 100);

  const unitId = input.unitId;
  const departmentId = input.departmentId || "";
  const divisionId = input.divisionId || "";

  const classification = input.classification;
  const date = input.date;
  const startTime = input.startTime;
  const endTime = input.endTime;
  const mode = input.mode;

  const location = cleanText(input.location, 120);
  const link = cleanText(input.link, 2048);

  const leaderId = input.leaderId;
  const notetakerId = input.notetakerId || "";

  const agendas = input.agenda;
  const participantIds = input.participantIds;

  // Validasi field utama.
  if (
    !title ||
    !typeId ||
    !isUUID(unitId) ||
    !isUUIDOrEmpty(departmentId) ||
    !isUUIDOrEmpty(divisionId) ||
    (divisionId && !departmentId) ||
    !validDate(date) ||
    !validTime(startTime) ||
    !validTime(endTime) ||
    endTime <= startTime ||
    !["Umum", "Internal", "Rahasia"].includes(classification) ||
    !["Luring", "Daring", "Hibrida"].includes(mode) ||
    !isUUID(leaderId) ||
    !isUUIDOrEmpty(notetakerId) ||
    (mode !== "Daring" && !location) ||
    (mode !== "Luring" && !/^https?:\/\/\S+$/i.test(link)) ||
    (link && !/^https?:\/\/\S+$/i.test(link)) ||
    !Array.isArray(agendas) ||
    agendas.length < 1 ||
    agendas.length > 30 ||
    !Array.isArray(participantIds) ||
    participantIds.length > 500
  ) {
    return fail("Periksa kembali data rapat. Ada isian yang tidak valid.");
  }

  // Validasi agenda.
  const cleanedAgendas = agendas.map((agenda) => ({
    topic: cleanText(agenda?.topic, 200),
    ownerId: agenda?.ownerId || "",
    duration: agenda?.duration || "",
  }));

  if (cleanedAgendas.some((agenda) => !agenda.topic)) {
    return fail("Semua topik agenda wajib diisi.");
  }

  if (
    cleanedAgendas.some(
      (agenda) =>
        !isUUIDOrEmpty(agenda.ownerId) ||
        (agenda.duration !== "" &&
          (!/^\d+$/.test(agenda.duration) ||
            Number(agenda.duration) < 1 ||
            Number(agenda.duration) > 480)),
    )
  ) {
    return fail("Pemilik atau durasi agenda tidak valid.");
  }

  // Validasi UUID peserta.
  if (
    participantIds.some(
      (id) => typeof id !== "string" || !UUID_PATTERN.test(id),
    )
  ) {
    return fail("Daftar peserta tidak valid.");
  }

  // Pimpinan dan notulis otomatis dimasukkan oleh RPC.
  const uniqueParticipantIds = [...new Set(participantIds)].filter(
    (id) => id !== leaderId && id !== notetakerId,
  );

  const supabase = await createClient();

  // Agenda pertama dikirim lewat parameter tersendiri.
  // Agenda berikutnya menggunakan JSONB.
  const additionalAgendas = cleanedAgendas.slice(1).map((agenda) => ({
    topic: agenda.topic,
    owner_id: agenda.ownerId || null,
    duration_minutes: agenda.duration
      ? Number(agenda.duration)
      : null,
  }));

  const { data: meetingId, error } = await supabase.rpc(
    "create_meeting_with_details",
    {
      p_title: title,
      p_meeting_type_id: typeId,
      p_org_node_id: unitId,
      p_department_node_id: departmentId || null,
      p_division_node_id: divisionId || null,
      p_classification: classification,
      p_start_at: `${date}T${startTime}:00+07:00`,
      p_end_at: `${date}T${endTime}:00+07:00`,
      p_mode: mode,
      p_location: location || null,
      p_meeting_link: link || null,
      p_leader_id: leaderId,
      p_notetaker_id: notetakerId || null,
      p_purpose: purpose || null,
      p_first_agenda_topic: cleanedAgendas[0].topic,
      p_first_agenda_owner_id: cleanedAgendas[0].ownerId || null,
      p_first_agenda_duration_minutes: cleanedAgendas[0].duration
        ? Number(cleanedAgendas[0].duration)
        : null,
      p_additional_agendas: additionalAgendas,
      p_participant_ids: uniqueParticipantIds,
    },
  );

  if (
    error ||
    typeof meetingId !== "string" ||
    !UUID_PATTERN.test(meetingId)
  ) {
    console.error("Create meeting RPC gagal:", error?.code);

    if (error?.code === "P0001" && error.message) {
      return fail(error.message);
    }

    if (error?.code === "42501") {
      return fail(
        "Anda tidak berwenang membuat rapat pada scope ini.",
      );
    }

    return fail("Rapat gagal disimpan. Periksa data dan coba lagi.");
  }

  // Ambil nomor resmi yang dibuat database.
  const { data: meeting, error: numberError } = await supabase
    .from("meetings")
    .select("meeting_number")
    .eq("id", meetingId)
    .maybeSingle();

  if (numberError) {
    console.error(
      "Rapat tersimpan, nomor rapat gagal dibaca:",
      numberError.code,
    );
  }

  revalidatePath("/meetings");

  return {
    ok: true,
    meetingId,
    meetingNumber: meeting?.meeting_number ?? "",
  };
}