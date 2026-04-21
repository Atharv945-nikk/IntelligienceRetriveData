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

    // Fetch chunk counts in parallel
    const withCounts = await Promise.all(
      docs.map(async (doc) => ({
        ...doc,
        chunk_count: await countChunks(doc.id),
      }))
    );

    return NextResponse.json({ documents: withCounts });
  } catch (err) {
    console.error("[GET /api/documents]", err);
    const message = err instanceof Error ? err.message : "Failed to fetch documents.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
