/**
 * src/lib/supabase/index.ts
 * Barrel export — import everything from "@/lib/supabase"
 *
 * @example
 *   // Browser component
 *   import { supabase } from "@/lib/supabase"
 *
 *   // Server route handler
 *   import { supabaseAdmin, listDocuments, matchChunks } from "@/lib/supabase"
 */

// Browser client (safe for "use client" components)
export { supabase, getSupabaseBrowser } from "./client";

// Server admin client (Route Handlers / Server Actions only)
export { supabaseAdmin, getSupabaseAdmin } from "./server";

// Typed query helpers
export {
  listDocuments,
  insertDocumentChunks,
  countChunks,
  deleteDocumentByFilename,
  getDocumentByChunkId,
  matchDocuments,
} from "./queries";

// TypeScript types
export type {
  Database,
  DocumentRow,
  MatchDocumentResult,
} from "./types";
