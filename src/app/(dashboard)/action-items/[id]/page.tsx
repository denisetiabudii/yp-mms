import { notFound } from "next/navigation";

import { ActionDetail } from "@/components/actions/action-detail";
import { getAction } from "@/lib/actions";

type Props = {
  // Next.js 15+: params berupa Promise.
  params: Promise<{ id: string }>;
};

export default async function ActionItemDetailPage({ params }: Props) {
  const { id } = await params;
  const item = getAction(id);

  // TODO (backend): notFound() juga bila pengguna tidak berhak (RLS/IDOR).
  if (!item) notFound();

  return <ActionDetail initialItem={item} />;
}