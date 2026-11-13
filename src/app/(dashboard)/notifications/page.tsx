import { redirect } from "next/navigation";

import { getSessionState } from "@/lib/auth/session";

import { NotificationsView } from "./notifications-view";

export default async function NotificationsPage() {
  const session = await getSessionState();

  if (session.status !== "ok") redirect("/login");

  return <NotificationsView loginName={session.user.fullName} />;
}
