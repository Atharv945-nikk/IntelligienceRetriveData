import OpenAI from "openai";

/**
 * OPENAI SDK CONFIGURATION
 * Strategy: Use text-embedding-3-small (1536 dims) for cost-efficiency and performance.
 * Focus: Vector embeddings only.
 */

let _openai: OpenAI | null = null;

function getOpenAIClient() {
  if (_openai) return _openai;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY in .env.local");
  _openai = new OpenAI({ apiKey });
  return _openai;
}

/**
 * Generate a single 1536-dimensional embedding using OpenAI.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const client = getOpenAIClient();
  
  // Clean text as recommended by OpenAI (strip newlines)
  const cleanText = text.replace(/\n/g, " ");

  try {
    const response = await client.embeddings.create({
      model: "text-embedding-3-small",
      input: cleanText,
      encoding_format: "float",
    });

    const embedding = response.data[0].embedding;
    if (!embedding || embedding.length !== 1536) {
      throw new Error(`Unexpected embedding dimension: ${embedding?.length}`);
    }

    return embedding;
  } catch (err: any) {
    console.error("[OpenAI] Embedding Error:", err.message);
    throw err;
  }
}

/**
 * Note: If you choose to use batching later, OpenAI supports up to 2048 inputs per request.
 * For now, we follow the user request to use a loop in the ingestion layer for maximum stability.
 */
