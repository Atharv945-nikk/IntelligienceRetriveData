"use server";

import { LlamaCloud } from "@llamaindex/llama-cloud";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { generateEmbedding } from "@/lib/openai";
import { insertDocumentChunks } from "@/lib/supabase/queries";
import { Readable } from "stream";

/**
 * Ingest a document using LlamaParse + OpenAI embeddings
 */
export async function ingestDocument(
  fileBuffer: Buffer,
  fileName: string
) {
  try {
    console.log(`[Ingest] Starting: ${fileName}`);

    // ======================================================
    // 1. Initialize LlamaCloud
    // ======================================================

    const llamaKey = process.env.LLAMA_CLOUD_API_KEY;

    if (!llamaKey) {
      throw new Error("Missing LLAMA_CLOUD_API_KEY");
    }

    const llamaClient = new LlamaCloud({
      apiKey: llamaKey,
    });

    // ======================================================
    // 2. Upload + Parse PDF
    // ======================================================

    console.log("[Ingest] Parsing PDF with LlamaParse...");

    const stream = Readable.from(fileBuffer);

    const file = await llamaClient.files.create({
      file: stream as any,
      purpose: "parse",
    });

    const parsingResult = await llamaClient.parsing.parse({
      file_id: file.id,
      tier: "agentic",
      version: "2026-04-09",
      expand: ["markdown"],
    });

    const res = parsingResult as any;

    // ======================================================
    // 3. Extract Text Safely
    // ======================================================

    let fullText = "";

    const collectText = (obj: any): string[] => {
      const results: string[] = [];

      if (!obj) return results;

      // STRING
      if (typeof obj === "string") {
        const cleaned = obj.trim();

        // avoid tiny useless strings
        if (cleaned.length > 30) {
          results.push(cleaned);
        }

        return results;
      }

      // ARRAY
      if (Array.isArray(obj)) {
        for (const item of obj) {
          results.push(...collectText(item));
        }

        return results;
      }

      // OBJECT
      if (typeof obj === "object") {
        for (const key in obj) {
          results.push(...collectText(obj[key]));
        }
      }

      return results;
    };

    const extractedTexts = collectText(res);

    fullText = extractedTexts.join("\n\n");

    console.log(
      "[Ingest] Extracted text length:",
      fullText.length
    );

    if (!fullText || fullText.trim().length === 0) {
      console.error(
        "[Ingest] Full Result JSON:",
        JSON.stringify(res, null, 2)
      );

      throw new Error("No text extracted from document");
    }

    // ======================================================
    // 4. Split into Chunks
    // ======================================================

    console.log("[Ingest] Splitting into chunks...");

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const chunks = (
      await splitter.splitText(fullText)
    ).filter((chunk) => chunk.trim().length > 0);

    if (chunks.length === 0) {
      throw new Error("No valid chunks found.");
    }

    console.log(
      `[Ingest] Created ${chunks.length} chunks.`
    );

    // ======================================================
    // 5. Generate OpenAI Embeddings
    // ======================================================

    console.log(
      "[Ingest] Generating OpenAI embeddings..."
    );

    const embeddings: number[][] = [];

    for (const chunk of chunks) {
      try {
        const embedding = await generateEmbedding(chunk);

        embeddings.push(embedding);
      } catch (embeddingError) {
        console.error(
          "[Ingest] Embedding Error:",
          embeddingError
        );

        throw new Error(
          "Failed to generate embeddings."
        );
      }
    }

    // ======================================================
    // 6. Store in Supabase
    // ======================================================

    console.log(
      "[Ingest] Saving vectors to Supabase..."
    );

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

    const insertedCount =
      await insertDocumentChunks(rows);

    console.log(
      `[Ingest] SUCCESS: ${fileName} (${insertedCount} chunks)`
    );

    return {
      success: true,
      chunkCount: insertedCount,
    };
  } catch (err) {
    console.error("[Ingest] Global Error:", err);

    throw err;
  }
}