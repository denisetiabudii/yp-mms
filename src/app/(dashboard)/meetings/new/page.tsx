
import { createClient } from "@/lib/supabase/server";
import { NewMeetingForm } from "./new-meeting-form";

type Props = {
  searchParams: Promise<{ date?: string | string[] }>;
};

/** Hanya menerima tanggal nyata berformat YYYY-MM-DD. */
function validDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return "";
  }

  const parsed = new Date(`${value}T00:00:00Z`);

  return !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
    ? value
    : "";
}

export default async function NewMeetingPage({ searchParams }: Props) {
  const { date } = await searchParams;
  const initialDate = validDate(date);

  const supabase = await createClient();

  const [
    { data: meetingTypes, error: meetingTypesError },
    { data: orgNodes, error: orgNodesError },
  ] = await Promise.all([
    supabase
      .from("meeting_types")
      .select("id, name, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),

    supabase
      .from("org_nodes")
      .select("id, parent_id, kind, name, code, sort_order")
      .eq("is_active", true)
      .in("kind", ["unit", "departemen", "divisi"])
      .order("sort_order", { ascending: true }),
  ]);

  if (meetingTypesError || orgNodesError) {
    console.error("Gagal memuat master data rapat:", {
      meetingTypesError,
      orgNodesError,
    });

    throw new Error("Gagal memuat data master rapat.");
  }

  return (
    <NewMeetingForm
      key={initialDate}
      initialDate={initialDate}
      masterData={{
        meetingTypes: meetingTypes ?? [],
        orgNodes: orgNodes ?? [],
      }}
    />
  );
}
