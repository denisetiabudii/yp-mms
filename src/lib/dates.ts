/**
 * Utilitas tanggal berbasis string ISO "YYYY-MM-DD" (zona Asia/Jakarta).
 * Semua hitungan memakai UTC agar tidak bergeser oleh zona waktu perangkat.
 */

export const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
] as const;

/** Senin sebagai hari pertama (kebiasaan di Indonesia). */
export const DAY_SHORT = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"] as const;

const pad = (n: number) => String(n).padStart(2, "0");

export function toISO(year: number, month: number, day: number) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function parseISO(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return { year, month, day };
}

export function addDays(iso: string, amount: number) {
  const { year, month, day } = parseISO(iso);
  const date = new Date(Date.UTC(year, month - 1, day + amount));

  return toISO(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

/** Geser ke bulan lain; hasilnya selalu tanggal 1 bulan tujuan. */
export function addMonths(iso: string, amount: number) {
  const { year, month } = parseISO(iso);
  const date = new Date(Date.UTC(year, month - 1 + amount, 1));

  return toISO(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
}

/** 0 = Senin … 6 = Minggu. */
export function weekdayIndex(iso: string) {
  const { year, month, day } = parseISO(iso);

  return (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7;
}

export function startOfWeek(iso: string) {
  return addDays(iso, -weekdayIndex(iso));
}

/** Selisih hari (b - a). Positif bila b setelah a. */
export function diffDays(a: string, b: string) {
  const first = parseISO(a);
  const second = parseISO(b);

  return Math.round(
    (Date.UTC(second.year, second.month - 1, second.day) -
      Date.UTC(first.year, first.month - 1, first.day)) /
      86_400_000,
  );
}

/** Grid 6 minggu × 7 hari untuk tampilan bulanan. */
export function monthGrid(iso: string) {
  const { year, month } = parseISO(iso);
  const first = toISO(year, month, 1);
  const start = startOfWeek(first);

  return Array.from({ length: 6 }, (_, week) =>
    Array.from({ length: 7 }, (_, day) => addDays(start, week * 7 + day)),
  );
}

export function monthLabel(iso: string) {
  const { year, month } = parseISO(iso);

  return `${MONTH_NAMES[month - 1]} ${year}`;
}
