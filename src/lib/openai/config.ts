/**
 * src/lib/openai/config.ts
 * Single source of truth for all OpenAI model names and default parameters.
 * Read once at call-time so hot-reloads in dev pick up .env.local changes.
 */

export type ChatModel =
  | "gpt-4o"
  | "gpt-4o-mini"
  | "gpt-4-turbo"
  | "gpt-3.5-turbo"
  | (string & {}); // allow custom/fine-tuned model IDs

export type EmbeddingModel =
  | "text-embedding-3-small"   // 1536 dims — matches the Supabase schema
  | "text-embedding-3-large"   // 3072 dims — needs schema change
  | "text-embedding-ada-002"   // 1536 dims — legacy
  | (string & {});

export interface OpenAIConfig {
  apiKey: string;
  chatModel: ChatModel;
  embeddingModel: EmbeddingModel;
  /** Embedding vector dimensions — must match the pgvector column */
  embeddingDims: number;
  /** Default temperature for RAG completions */
  ragTemperature: number;
  /** Max tokens returned per RAG completion */
  ragMaxTokens: number;
}

/** Read and validate all OpenAI-related env vars. Throws at call-time. */
export function getOpenAIConfig(): OpenAIConfig {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing OPENAI_API_KEY — add it to .env.local\n" +
        "Get your key at: https://platform.openai.com/api-keys"
    );
  }

  const chatModel =
    (process.env.OPENAI_CHAT_MODEL as ChatModel) ?? "gpt-4o-mini";

  const embeddingModel =
    (process.env.OPENAI_EMBEDDING_MODEL as EmbeddingModel) ??
    "text-embedding-3-small";

  // Keep dims in sync with the vector() column in supabase/schema.sql
  const embeddingDims = embeddingModel === "text-embedding-3-large" ? 3072 : 1536;

  return {
    apiKey,
    chatModel,
    embeddingModel,
    embeddingDims,
    ragTemperature: 0.2,
    ragMaxTokens: 1024,
  };
}
