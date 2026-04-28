/**
 * GET /api/documents
 * Returns all documents with chunk counts ordered newest-first.
 *
 * DELETE /api/documents  (not supported — use /api/documents/[id])
 */
import { NextResponse } from "next/server";
import { listDocuments, countChunks } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET() {
  try {
    const docs = await listDocuments();

    // Enrich with count and format for UI
    const documents = await Promise.all(
      docs.map(async (doc) => {
        const chunkCount = await countChunks(doc.metadata.filename);
        return {
          id: doc.id,
          name: doc.metadata.filename,
          size_bytes: doc.metadata.file_size || 0,
          num_pages: doc.metadata.num_pages || 0,
          created_at: doc.created_at,
          chunk_count: chunkCount,
        };
      })
    );

    return NextResponse.json({ documents });
  } catch (err) {
    console.error("[GET /api/documents]", err);
    const message = err instanceof Error ? err.message : "Failed to fetch documents.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
