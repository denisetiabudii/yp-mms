"use server";

import type { SearchResult } from "@/components/layout/app-header";
import { createClient } from "@/lib/supabase/server";

const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 100;
const MAX_RESULTS = 5;

// TODO: sesuaikan dengan nilai status yang dipakai di database.
const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  review: "Menunggu review",
  revision: "Revisi",
  approved: "Disetujui",
};

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Jakarta",
});

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
}

/**
 * Pencarian notulen untuk kolom cari di header.
 *
 * - Berjalan dengan sesi pengguna, jadi RLS tetap berlaku: notulen yang tidak
 *   boleh dilihat (mis. klasifikasi Rahasia) tidak akan muncul.
 * - Input diperlakukan sebagai data tak tepercaya: dibersihkan, dibatasi,
 *   dan wildcard LIKE di-escape. Tidak ada .or() dari string input.
 */
export async function searchMinutesAction(query: string): Promise<SearchResult[]> {
  if (typeof query !== "string") return [];

  const q = query
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_QUERY_LENGTH);

  if (q.length < MIN_QUERY_LENGTH) return [];

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  // Escape \, % dan _ supaya dibaca sebagai teks biasa, bukan wildcard.
  const pattern = `%${q.replace(/[\\%_]/g, "\\$&")}%`;

  // TODO: sesuaikan nama tabel dan kolom dengan skema Anda.
  const { data, error } = await supabase
    .from("minutes")
    .select("id, title, meeting_date, status")
    .ilike("title", pattern)
    .order("meeting_date", { ascending: false })
    .limit(MAX_RESULTS);

  if (error) {
    console.error("[search-minutes] gagal mencari:", error.code ?? error.message);
    // Dilempar agar header menampilkan "Pencarian gagal", bukan "tidak ada hasil".
    throw new Error("Pencarian gagal");
  }

  return (data ?? []).map((row) => ({
    id: String(row.id),
    title: String(row.title),
    date: formatDate(String(row.meeting_date)),
    status: STATUS_LABELS[String(row.status)] ?? String(row.status),
    // TODO: sesuaikan dengan rute halaman detail notulen.
    href: `/minutes/${row.id}`,
  }));
}