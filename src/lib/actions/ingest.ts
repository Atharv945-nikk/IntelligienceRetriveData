"use server";

import { LlamaCloud } from "@llamaindex/llama-cloud";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { generateEmbedding } from "@/lib/openai"; // ✅ Uses OpenAI
import { insertDocumentChunks } from "@/lib/supabase/queries";
import { Readable } from "stream";

/**
 * Ingest a document using LlamaParse for parsing and OpenAI for embeddings.
 */
export async function ingestDocument(fileBuffer: Buffer, fileName: string) {
  try {
    console.log(`[Ingest] Starting: ${fileName}`);

    // 1. Initialize LlamaParse
    const llamaKey = process.env.LLAMA_CLOUD_API_KEY;
    if (!llamaKey) throw new Error("Missing LLAMA_CLOUD_API_KEY");
    const llamaClient = new LlamaCloud({ apiKey: llamaKey });

    // 2. Parse PDF to Markdown
    console.log("[Ingest] Parsing PDF with LlamaParse...");
    const stream = Readable.from(fileBuffer);
    const file = await llamaClient.files.create({ file: stream as any, purpose: "parse" });

    const parsingResult = await llamaClient.parsing.parse({
      file_id: file.id,
      tier: "agentic",
      version: "2026-04-09",
      expand: ["markdown"],
    });

    let fullText = "";
    const res = parsingResult as any;
    
    const extract = (val: any): string => {
      if (typeof val === "string") return val.trim();
      if (val && typeof val === "object") {
        return (val.markdown || val.text || val.content || val.value || "").trim();
      }
      return "";
    };

    // Attempt all extraction paths
    fullText = extract(res.markdown_full) || extract(res.markdown) || extract(res.text_full) || extract(res.text);

    if (!fullText.trim() && Array.isArray(res.items)) {
      fullText = res.items.map((it: any) => extract(it)).filter(Boolean).join("\n\n");
    }

    if (!fullText.trim() && Array.isArray(res.pages)) {
      fullText = res.pages.map((p: any) => extract(p)).filter(Boolean).join("\n\n");
    }

    if (!fullText.trim()) {
      console.error("[Ingest] Full Result Keys:", Object.keys(res));
      console.error("[Ingest] Full Result JSON:", JSON.stringify(res, null, 2));
      throw new Error(`No text extracted. Model returned keys: ${Object.keys(res).join(", ")}`);
    }

    // 3. Chunking (LangChain)
    console.log("[Ingest] Splitting into chunks...");
    const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });
    const chunks = (await splitter.splitText(fullText)).filter(c => c.trim().length > 0);
    
    if (chunks.length === 0) throw new Error("No valid chunks found.");
    console.log(`[Ingest] Created ${chunks.length} chunks.`);

    // 4. Generate Embeddings (Loop-based for stability as requested)
    console.log("[Ingest] Generating OpenAI embeddings (1536 dims)...");
    const embeddings: number[][] = [];
    
    for (const chunk of chunks) {
      try {
        const emb = await generateEmbedding(chunk);
        embeddings.push(emb);
      } catch (embErr) {
        console.error(`[Ingest] Error embedding chunk:`, embErr);
        // We fail the whole ingestion if a chunk fails to keep data integrity
        throw new Error("Failed to generate embeddings for all chunks.");
      }
    }

    // 5. Store in Supabase
    console.log("[Ingest] Saving vectors to Supabase...");
    const rows = chunks.map((content, index) => ({
      content,
      metadata: {
        filename: fileName,
        chunk_index: index,
        total_chunks: chunks.length,
        file_size: fileBuffer.length,
        upload_date: new Date().toISOString(),
      },
      embedding: embeddings[index],
    }));

    const insertedCount = await insertDocumentChunks(rows);
    console.log(`[Ingest] SUCCESS: Ingested ${fileName} (${insertedCount} chunks)`);

    return { success: true, chunkCount: insertedCount };
  } catch (err) {
    console.error("[Ingest] Global Error:", err);
    throw err;
  }
}