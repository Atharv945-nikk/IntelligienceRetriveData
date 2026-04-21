/**
 * src/lib/supabase/server.ts
 * Server-only Supabase admin client — use in Route Handlers & Server Actions.
 * Uses the SERVICE ROLE key — bypasses RLS, NEVER expose to the browser.
 */
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

let _adminClient: SupabaseClient<Database> | null = null;

/**
 * Returns the shared admin Supabase client (lazy singleton).
 * Throws at call-time if env vars are missing, not at import time.
 */
export function getSupabaseAdmin(): SupabaseClient<Database> {
  if (_adminClient) return _adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing env vars: set NEXT_PUBLIC_SUPABASE_URL and " +
        "SUPABASE_SERVICE_ROLE_KEY in .env.local\n" +
        "Find them at: Supabase Dashboard → Settings → API"
    );
  }

  _adminClient = createClient<Database>(url, serviceKey, {
    auth: {
      // Server-side usage — no session management needed
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _adminClient;
}

/**
 * Lazy proxy — drop-in for the admin client.
 * @example
 *   import { supabaseAdmin } from "@/lib/supabase/server"
 *   const { data } = await supabaseAdmin.from("documents").select()
 */
export const supabaseAdmin = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop: string | symbol) {
    const client = getSupabaseAdmin();
    const value = (client as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === "function" ? value.bind(client) : value;
  },
});
