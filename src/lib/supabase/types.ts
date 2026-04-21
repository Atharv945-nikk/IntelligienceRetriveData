/**
 * src/lib/supabase/types.ts
 *
 * Hand-crafted database types that match supabase/schema.sql exactly.
 * These give full IntelliSense throughout the codebase without needing
 * the Supabase CLI or code-generator.
 *
 * Update this file whenever you change the schema.
 */

// ─── Table row shapes ─────────────────────────────────────────────────────────

export interface DocumentRow {
  id: string;                   // uuid
  name: string;
  size_bytes: number;
  num_pages: number;
  created_at: string;           // ISO 8601
}

export interface DocumentChunkRow {
  id: string;                   // uuid
  document_id: string;          // fk → documents.id
  chunk_index: number;
  content: string;
  embedding: number[] | null;   // vector(1536) — null before indexing
  created_at: string;
}

// ─── RPC return types ─────────────────────────────────────────────────────────

export interface MatchChunkResult {
  id: string;
  document_id: string;
  content: string;
  similarity: number;           // 0–1  (cosine similarity)
}

// ─── Supabase Database generic type ──────────────────────────────────────────
// Pass this to createClient<Database>() for end-to-end type safety.

export interface Database {
  public: {
    Tables: {
      documents: {
        Row: DocumentRow;
        Insert: Omit<DocumentRow, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<DocumentRow, "id">>;
      };
      document_chunks: {
        Row: DocumentChunkRow;
        Insert: Omit<DocumentChunkRow, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<DocumentChunkRow, "id">>;
      };
    };
    Functions: {
      match_chunks: {
        Args: {
          query_embedding: number[];
          match_count?: number;
          match_threshold?: number;
        };
        Returns: MatchChunkResult[];
      };
    };
    Enums: Record<string, never>;
  };
}
