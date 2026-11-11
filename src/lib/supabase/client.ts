import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseEnv } from "./env";

/** Klien untuk Client Component (mis. realtime nanti). */
export function createClient() {
  const { url, key } = getSupabaseEnv();

  return createBrowserClient(url, key);
}
