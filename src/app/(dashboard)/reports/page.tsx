import { redirect } from "next/navigation";

import { getSessionState } from "@/lib/auth/session";

import { ReportsView } from "./reports-view";

export default async function ReportsPage() {
  const session = await getSessionState();

  if (session.status !== "ok") redirect("/login");

  return <ReportsView viewer={{ name: session.user.fullName, role: session.user.role }} />;
}
