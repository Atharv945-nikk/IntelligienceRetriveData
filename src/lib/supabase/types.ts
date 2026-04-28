/**
 * src/lib/supabase/types.ts
 */

export interface DocumentRow {
  id: number;
  content: string;
  metadata: {
    filename: string;
    chunk_index: number;
    [key: string]: any;
  };
  embedding: number[] | null;   // vector(1536) - Standardized on OpenAI
  created_at: string;
}

export interface MatchDocumentResult {
  id: number;
  content: string;
  metadata: any;
  similarity: number;
}

export interface Database {
  public: {
    Tables: {
      documents: {
        Row: DocumentRow;
        Insert: Omit<DocumentRow, "id" | "created_at"> & {
          id?: number;
          created_at?: string;
        };
        Update: Partial<Omit<DocumentRow, "id">>;
      };
    };
    Functions: {
      match_documents: {
        Args: {
          query_embedding: number[];
          match_count?: number;
          match_threshold?: number;
        };
        Returns: MatchDocumentResult[];
      };
    };
  };
}
