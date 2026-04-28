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
import type { DocumentRow, MatchDocumentResult } from "./types";

// Shorthand to escape the generic for calls that need it
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

/** Fetch unique filenames by aggregating chunk metadata. */
export async function listDocuments(): Promise<DocumentRow[]> {
  // We use a simple select and then filter in JS for maximum compatibility with Supabase's simple API.
  // In a real production app, you might use a Postgres VIEW or a more complex RPC.
  const { data, error } = await db
    .from("documents")
    .select("id, content, metadata, created_at")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`listDocuments: ${error.message}`);

  const rows = (data as DocumentRow[]) ?? [];
  
  // Aggregate by filename
  const seenFiles = new Set<string>();
  const uniqueDocs: DocumentRow[] = [];
  
  for (const row of rows) {
    const filename = row.metadata.filename;
    if (!seenFiles.has(filename)) {
      seenFiles.add(filename);
      uniqueDocs.push(row);
    }
  }
  
  return uniqueDocs;
}

/** Count how many chunks exist for a specific filename. */
export async function countChunks(filename: string): Promise<number> {
  const { count, error } = await db
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("metadata->>filename", filename);

  if (error) throw new Error(`countChunks: ${error.message}`);
  return (count as number) ?? 0;
}

/** Insert a batch of chunks into the documents table. */
export async function insertDocumentChunks(
  chunks: Array<{
    content: string;
    metadata: {
      filename: string;
      chunk_index: number;
      file_size: number;
      total_chunks: number;
      upload_date: string;
      [key: string]: any;
    };
    embedding: number[];
  }>
): Promise<number> {
  const rows = chunks.map((c) => ({
    content: c.content,
    metadata: c.metadata,
    // Supabase pgvector can accept a plain JS array [0.1, 0.2, ...] 
    // and correctly type-cast it to a vector in the DB.
    embedding: c.embedding,
  }));

  const { data, error } = await db.from("documents").insert(rows).select("id");
  if (error) throw new Error(`insertDocumentChunks: ${error.message}`);
  
  return (data as any[])?.length ?? 0;
}

// ─── Similarity search ────────────────────────────────────────────────────────

/** Delete all chunks belonging to a specific filename. */
export async function deleteDocumentByFilename(filename: string): Promise<void> {
  const { error } = await db
    .from("documents")
    .delete()
    .eq("metadata->>filename", filename);
    
  if (error) throw new Error(`deleteDocumentByFilename: ${error.message}`);
}

/** Resolve a filename from a chunk ID. */
export async function getDocumentByChunkId(id: number): Promise<DocumentRow | null> {
  const { data, error } = await db
    .from("documents")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return data as DocumentRow;
}

/**
 * Run pgvector cosine similarity search via the match_documents RPC.
 * Returns the top-k chunks most relevant to the query embedding.
 */
export async function matchDocuments(
  queryEmbedding: number[],
  options?: { matchCount?: number; matchThreshold?: number }
): Promise<MatchDocumentResult[]> {
  const { data, error } = await db.rpc("match_documents", {
    query_embedding: queryEmbedding,
    match_threshold: options?.matchThreshold ?? 0.4,
    match_count: options?.matchCount ?? 5,
  });

  if (error) throw new Error(`matchDocuments: ${error.message}`);
  return (data as MatchDocumentResult[]) ?? [];
}
