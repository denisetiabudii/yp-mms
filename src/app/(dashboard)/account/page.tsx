import { redirect } from "next/navigation";

import { getSessionState } from "@/lib/auth/session";

import { AccountView } from "./account-view";

export default async function AccountPage() {
  const session = await getSessionState();

  if (session.status !== "ok") redirect("/login");

  const { user } = session;

  return <AccountView fullName={user.fullName} email={user.email} roleLabel={user.roleLabel} />;
}
