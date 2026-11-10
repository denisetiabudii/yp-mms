import { notFound } from "next/navigation";

import { MinuteEditor } from "@/components/minutes/minute-editor";
import { getMeeting } from "@/lib/meetings";
import { createBlankMinute, getMinute } from "@/lib/minutes";

type Props = {
  // Id notulen = id rapat. Next.js 15+: params berupa Promise.
  params: Promise<{ id: string }>;
};

export default async function MinuteDetailPage({ params }: Props) {
  const { id } = await params;
  const meeting = getMeeting(id);

  // TODO (backend): juga notFound() bila pengguna tidak berhak mengakses
  // rapat/notulen ini (RLS, klasifikasi Rahasia, dan cegah IDOR).
  if (!meeting) notFound();

  const minute = getMinute(id) ?? createBlankMinute(meeting);

  return <MinuteEditor meeting={meeting} initialMinute={minute} />;
}