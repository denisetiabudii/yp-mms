import { redirect } from "next/navigation";

import { getSessionState } from "@/lib/auth/session";

import { ArchiveView } from "./archive-view";

export default async function ArchivePage() {
  const session = await getSessionState();

  if (session.status !== "ok") redirect("/login");

  return <ArchiveView viewer={{ name: session.user.fullName, role: session.user.role }} />;
}
