/**
 * POST /api/upload
 * Accepts a PDF or DOCX, parses + chunks + embeds it, then stores in Supabase.
 */
import { NextRequest, NextResponse } from "next/server";
import { createDocument, deleteDocument, insertChunks } from "@/lib/supabase";
import { parseDocument, chunkText } from "@/lib/document-parser";
import { createEmbeddingBatch } from "@/lib/openai";

export const runtime = "nodejs";

const BATCH_SIZE = 20; // chunks per embedding API call
const SUPPORTED_EXTENSIONS = ["pdf", "docx"];

export async function POST(req: NextRequest) {
  try {
    // ── 1. Validate file ─────────────────────────────────────────────────────
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    const extension = file.name.toLowerCase().split(".").pop() || "";
    if (!SUPPORTED_EXTENSIONS.includes(extension)) {
      return NextResponse.json(
        { error: `Unsupported file type. Supported: ${SUPPORTED_EXTENSIONS.join(", ")}` },
        { status: 400 }
      );
    }

    // ── 2. Parse Document ────────────────────────────────────────────────────
    const buffer = Buffer.from(await file.arrayBuffer());
    const { text, numPages } = await parseDocument(buffer, file.name);

    if (!text.trim()) {
      return NextResponse.json(
        { error: "Could not extract text. The document may be empty or unreadable." },
        { status: 422 }
      );
    }

    // ── 3. Chunk text ────────────────────────────────────────────────────────
    const chunks = chunkText(text, 1500, 200);

    // ── 4. Insert document metadata ──────────────────────────────────────────
    const document = await createDocument({
      name: file.name,
      size_bytes: file.size,
      num_pages: numPages,
    });

    // ── 5. Embed in batches, then insert chunks ──────────────────────────────
    try {
      for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batchTexts = chunks.slice(i, i + BATCH_SIZE);
        const embeddings = await createEmbeddingBatch(batchTexts);

        await insertChunks(
          batchTexts.map((content, j) => ({
            document_id: document.id,
            chunk_index: i + j,
            content,
            embedding: embeddings[j],
          }))
        );
      }
    } catch (embeddingErr) {
      // Roll back document on embedding failure
      console.error("Embedding failure, rolling back document:", embeddingErr);
      await deleteDocument(document.id).catch(() => null);
      throw embeddingErr;
    }

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        name: document.name,
        size_bytes: document.size_bytes,
        num_pages: document.num_pages,
        chunk_count: chunks.length,
        created_at: document.created_at,
      },
    });
  } catch (err) {
    console.error("[POST /api/upload]", err);
    const message = err instanceof Error ? err.message : "Unexpected error during upload.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
