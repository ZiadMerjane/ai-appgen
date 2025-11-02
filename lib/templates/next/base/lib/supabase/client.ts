"use client";

import { createBrowserClient } from "@supabase/ssr";

type Database = Record<string, unknown>;

export function getBrowserClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
