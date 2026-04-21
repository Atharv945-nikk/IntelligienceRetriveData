/**
 * src/lib/supabase/queries.ts
 * Typed, reusable data-access functions for the RAG app.
 * All functions run server-side only.
 *
 * NOTE: We cast `supabaseAdmin` to `any` on individual .from()/.rpc() calls
 * because the Database generic causes the Supabase SDK (v2) to infer
 * Insert/RPC arg types as `never` unless the full generated types are used.
 * Our manual types in ./types.ts remain the authoritative shape documentation.
 */
import { supabaseAdmin } from "./server";
import type { DocumentRow, MatchChunkResult } from "./types";

// Shorthand to escape the generic for calls that need it
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

// ─── Documents ────────────────────────────────────────────────────────────────

/** Fetch all documents ordered newest-first. */
export async function listDocuments(): Promise<DocumentRow[]> {
  const { data, error } = await db
    .from("documents")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`listDocuments: ${error.message}`);
  return (data as DocumentRow[]) ?? [];
}

/** Fetch a single document by ID. Returns null if not found. */
export async function getDocument(id: string): Promise<DocumentRow | null> {
  const { data, error } = await db
    .from("documents")
    .select("*")
    .eq("id", id)
    .single();

  if (error && error.code !== "PGRST116") {
    throw new Error(`getDocument: ${error.message}`);
  }
  return (data as DocumentRow) ?? null;
}

/** Insert a new document record and return the created row. */
export async function createDocument(
  input: Pick<DocumentRow, "name" | "size_bytes" | "num_pages">
): Promise<DocumentRow> {
  const { data, error } = await db
    .from("documents")
    .insert(input)
    .select()
    .single();

  if (error || !data) throw new Error(`createDocument: ${error?.message}`);
  return data as DocumentRow;
}

/** Delete a document and all its chunks (FK cascade handles the rest). */
export async function deleteDocument(id: string): Promise<void> {
  const { error } = await db.from("documents").delete().eq("id", id);
  if (error) throw new Error(`deleteDocument: ${error.message}`);
}

// ─── Chunks ───────────────────────────────────────────────────────────────────

/** Insert a batch of embedding chunks for one document. */
export async function insertChunks(
  chunks: Array<{
    document_id: string;
    chunk_index: number;
    content: string;
    embedding: number[];
  }>
): Promise<void> {
  const rows = chunks.map((c) => ({
    document_id: c.document_id,
    chunk_index: c.chunk_index,
    content: c.content,
    // Supabase pgvector expects a JSON-serialised array
    embedding: JSON.stringify(c.embedding),
  }));

  const { error } = await db.from("document_chunks").insert(rows);
  if (error) throw new Error(`insertChunks: ${error.message}`);
}

/** Count how many chunks belong to a document. */
export async function countChunks(documentId: string): Promise<number> {
  const { count, error } = await db
    .from("document_chunks")
    .select("id", { count: "exact", head: true })
    .eq("document_id", documentId);

  if (error) throw new Error(`countChunks: ${error.message}`);
  return (count as number) ?? 0;
}

// ─── Similarity search ────────────────────────────────────────────────────────

/**
 * Run pgvector cosine similarity search via the match_chunks RPC.
 * Returns the top-k chunks most relevant to the query embedding.
 */
export async function matchChunks(
  queryEmbedding: number[],
  options?: { matchCount?: number; matchThreshold?: number }
): Promise<MatchChunkResult[]> {
  const { data, error } = await db.rpc("match_chunks", {
    query_embedding: queryEmbedding,
    match_count: options?.matchCount ?? 5,
    match_threshold: options?.matchThreshold ?? 0.4,
  });

  if (error) throw new Error(`matchChunks: ${error.message}`);
  return (data as MatchChunkResult[]) ?? [];
}

/**
 * Resolve document IDs → human-readable names.
 * Used to build source citation lists after a similarity search.
 */
export async function resolveDocumentNames(
  documentIds: string[]
): Promise<Record<string, string>> {
  if (documentIds.length === 0) return {};

  const { data, error } = await db
    .from("documents")
    .select("id, name")
    .in("id", documentIds);

  if (error) throw new Error(`resolveDocumentNames: ${error.message}`);

  return Object.fromEntries(
    ((data as Array<{ id: string; name: string }>) ?? []).map((d) => [
      d.id,
      d.name,
    ])
  );
}
