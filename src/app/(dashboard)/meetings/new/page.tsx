import { NewMeetingForm } from "./new-meeting-form";

type Props = {
  // Next.js 15+: searchParams berupa Promise.
  searchParams: Promise<{ date?: string | string[] }>;
};

/** Hanya terima tanggal nyata berformat YYYY-MM-DD (mis. dari kalender); selain itu diabaikan. */
function validDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";

  const parsed = new Date(`${value}T00:00:00Z`);

  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : "";
}

export default async function NewMeetingPage({ searchParams }: Props) {
  const { date } = await searchParams;
  const initialDate = validDate(date);

  // key: bila pengguna kembali ke kalender lalu memilih tanggal lain, formulir dibuat ulang.
  return <NewMeetingForm key={initialDate} initialDate={initialDate} />;
}
