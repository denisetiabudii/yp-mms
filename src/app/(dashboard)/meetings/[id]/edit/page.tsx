import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Lock } from "lucide-react";

import { canManageMeeting, canViewMeeting } from "@/lib/access";
import { getSessionState } from "@/lib/auth/session";
import { getMeeting, meetingLock } from "@/lib/meetings";

import { NewMeetingForm } from "../../new/new-meeting-form";

type Props = {
  // Next.js 15+: params berupa Promise.
  params: Promise<{ id: string }>;
};

function Blocked({ id, title, text }: { id: string; title: string; text: string }) {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
        <Lock className="size-7" />
      </div>
      <h1 className="text-xl font-bold text-slate-800">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
      <Link
        href={`/meetings/${id}`}
        className="mt-6 inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-5 text-sm font-medium text-white transition hover:bg-blue-700"
      >
        Kembali ke detail rapat
      </Link>
    </div>
  );
}

export default async function EditMeetingPage({ params }: Props) {
  const { id } = await params;
  const session = await getSessionState();

  if (session.status !== "ok") redirect("/login");

  const viewer = { name: session.user.fullName, role: session.user.role };
  const meeting = getMeeting(id);

  // Netral: tidak membedakan "tidak ada" dari "tidak boleh dilihat".
  if (!meeting || !canViewMeeting(meeting, viewer)) notFound();

  if (!canManageMeeting(meeting, viewer)) {
    return (
      <Blocked
        id={id}
        title="Anda tidak berwenang"
        text="Hanya pimpinan rapat, notulis, atau administrator yang dapat mengubah rapat ini."
      />
    );
  }

  const lock = meetingLock(meeting);

  if (lock) return <Blocked id={id} title="Rapat tidak dapat diubah" text={lock} />;

  // key: formulir dibuat ulang bila membuka rapat lain.
  return <NewMeetingForm key={meeting.id} initialDate="" meeting={meeting} />;
}
