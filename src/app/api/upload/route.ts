/**
 * POST /api/upload
 * Accepts a PDF or DOCX, parses + chunks + embeds it, then stores in Supabase.
 */
import { NextRequest, NextResponse } from "next/server";
import { ingestDocument } from "@/lib/actions/ingest";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    // ── 1. Ingest document (Parsing + Chunking + Embedding + Storage) ─────────
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await ingestDocument(buffer, file.name);

    return NextResponse.json({
      success: true,
      document: {
        id: `doc-${Date.now()}`, // Temporary ID for UI compatibility
        name: file.name,
        size_bytes: file.size,
        num_pages: 0, 
        chunk_count: result.chunkCount,
        created_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("[POST /api/upload]", err);
    const message = err instanceof Error ? err.message : "Unexpected error during upload.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
