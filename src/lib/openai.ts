/**
 * src/lib/openai.ts
 *
 * Previously used OpenAI text-embedding-3-small (1536 dims).
 * Now uses HuggingFace Inference API — FREE tier.
 *
 * Model: sentence-transformers/all-MiniLM-L6-v2
 * Dimensions: 384
 *
 * ⚠️  IMPORTANT — Supabase migration required:
 *   1. Drop and recreate the embedding column:
 *        ALTER TABLE documents
 *          ALTER COLUMN embedding TYPE vector(384)
 *          USING embedding::vector(384);
 *
 *   2. Recreate the match_documents RPC with match_threshold
 *      comparing against vector(384) instead of vector(1536).
 *      (The function body itself doesn't change, only the column type.)
 *
 *   3. Re-ingest all existing documents so their embeddings are 384-dim.
 */

const HF_API_URL =
  "https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2/pipeline/feature-extraction";

const EXPECTED_DIMS = 384;

/**
 * Generate a single 384-dimensional embedding using HuggingFace (free).
 * Drop-in replacement for the old generateEmbedding() from OpenAI.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.HUGGINGFACE_API_KEY;

  if (!apiKey) {
    throw new Error("Missing HUGGINGFACE_API_KEY in .env.local");
  }

  // Clean text — same as before
  const cleanText = text.replace(/\n/g, " ").trim();

  try {
    const response = await fetch(HF_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: cleanText,
        options: {
          wait_for_model: true, // auto-waits if model is cold-starting
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `HuggingFace API error ${response.status}: ${errorText}`
      );
    }

    const result = await response.json();

    // HuggingFace returns either:
    //   - number[]          (single input → flat array)
    //   - number[][]        (batch input → array of arrays)
    // We always send a single string, so we expect a flat array.
    let embedding: number[];

    if (
      Array.isArray(result) &&
      result.length > 0 &&
      Array.isArray(result[0])
    ) {
      // Batch-style response — take the first row
      embedding = result[0] as number[];
    } else if (Array.isArray(result)) {
      embedding = result as number[];
    } else {
      throw new Error(
        `Unexpected HuggingFace response shape: ${JSON.stringify(result).slice(0, 200)}`
      );
    }

    if (embedding.length !== EXPECTED_DIMS) {
      throw new Error(
        `Unexpected embedding dimension: got ${embedding.length}, expected ${EXPECTED_DIMS}`
      );
    }

    return embedding;
  } catch (err: any) {
    console.error("[HuggingFace] Embedding Error:", err.message);
    throw err;
  }
}