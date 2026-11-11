"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/** Keluar dari perangkat ini. Dipakai lewat <form action={signOutAction}>. */
export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });

  redirect("/login?reason=logout");
}
