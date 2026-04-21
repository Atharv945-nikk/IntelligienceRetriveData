/**
 * src/lib/supabase/client.ts
 * Browser-safe Supabase client — use in "use client" components.
 * Uses NEXT_PUBLIC_ keys; safe to bundle in the browser.
 */
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

let _browserClient: SupabaseClient<Database> | null = null;

/**
 * Returns the shared browser Supabase client (lazy singleton).
 * Throws at call-time if env vars are missing, not at import time.
 */
export function getSupabaseBrowser(): SupabaseClient<Database> {
  if (_browserClient) return _browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing env vars: set NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local\n" +
        "Find them at: Supabase Dashboard → Settings → API"
    );
  }

  _browserClient = createClient<Database>(url, anonKey);
  return _browserClient;
}

/**
 * Lazy proxy — create once, use everywhere.
 * @example
 *   import { supabase } from "@/lib/supabase"
 *   const { data } = await supabase.from("documents").select()
 */
export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop: string | symbol) {
    const client = getSupabaseBrowser();
    const value = (client as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === "function" ? value.bind(client) : value;
  },
});
