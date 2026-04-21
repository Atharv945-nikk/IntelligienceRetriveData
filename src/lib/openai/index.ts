/**
 * src/lib/openai/index.ts
 * Barrel export — everything consumers need from one import path.
 *
 * @example
 *   import { openai, createEmbedding, ragCompletionStream } from "@/lib/openai"
 */

// Client
export { openai, getOpenAIClient } from "./client";

// Config types & accessor
export type { OpenAIConfig, ChatModel, EmbeddingModel } from "./config";
export { getOpenAIConfig } from "./config";

// Embeddings
export {
  createEmbedding,
  createEmbeddingBatch,
  cosineSimilarity,
} from "./completions";

// Chat / completions
export type { ConversationMessage } from "./chat";
export {
  ragCompletion,
  ragCompletionStream,
  buildRagSystemPrompt,
} from "./chat";
