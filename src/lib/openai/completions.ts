/**
 * src/lib/openai/embeddings.ts
 * Utilities for generating and working with OpenAI embeddings.
 */
import { getOpenAIClient } from "./client";
import { getOpenAIConfig } from "./config";

/**
 * Embed a single string.
 * Normalises whitespace first for better embedding quality.
 */
export async function createEmbedding(text: string): Promise<number[]> {
  const { embeddingModel } = getOpenAIConfig();
  const client = getOpenAIClient();

  const response = await client.embeddings.create({
    model: embeddingModel,
    input: text.replace(/\s+/g, " ").trim(),
  });

  return response.data[0].embedding;
}

/**
 * Embed multiple strings in a single API call (more efficient for batch jobs).
 * Returns embeddings in the same order as the input array.
 */
export async function createEmbeddingBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const { embeddingModel } = getOpenAIConfig();
  const client = getOpenAIClient();

  const response = await client.embeddings.create({
    model: embeddingModel,
    input: texts.map((t) => t.replace(/\s+/g, " ").trim()),
  });

  // The API guarantees order is preserved
  return response.data
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}

/**
 * Cosine similarity between two embedding vectors.
 * Returns a value in [−1, 1] where 1 is identical.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
  const magA = Math.sqrt(a.reduce((s, x) => s + x * x, 0));
  const magB = Math.sqrt(b.reduce((s, x) => s + x * x, 0));
  return magA && magB ? dot / (magA * magB) : 0;
}
