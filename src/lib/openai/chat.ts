/**
 * src/lib/openai/chat.ts
 * Chat completion helpers — both non-streaming and streaming (SSE).
 */
import { getOpenAIClient } from "./client";
import { getOpenAIConfig } from "./config";
import type { ChatCompletionMessageParam } from "openai/resources";
import type { ChatCompletionChunk } from "openai/resources/chat/completions";
import type { Stream } from "openai/streaming";

export type ConversationMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

// ─── Non-streaming ────────────────────────────────────────────────────────────

/**
 * Single-turn RAG completion.
 * Injects a system prompt containing retrieved document context.
 */
export async function ragCompletion(
  systemPrompt: string,
  userMessage: string,
  history: ConversationMessage[] = []
): Promise<string> {
  const { chatModel, ragTemperature, ragMaxTokens } = getOpenAIConfig();
  const client = getOpenAIClient();

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...history.map((m) => ({ role: m.role, content: m.content }) as ChatCompletionMessageParam),
    { role: "user", content: userMessage },
  ];

  const response = await client.chat.completions.create({
    model: chatModel,
    messages,
    temperature: ragTemperature,
    max_tokens: ragMaxTokens,
    stream: false,
  });

  return response.choices[0].message.content ?? "";
}

// ─── Streaming ────────────────────────────────────────────────────────────────

/**
 * Start a streaming RAG completion.
 * Returns the raw OpenAI stream — callers iterate over it with `for await`.
 *
 * @example
 *   const stream = await ragCompletionStream(systemPrompt, userMessage, history)
 *   for await (const chunk of stream) {
 *     const delta = chunk.choices[0]?.delta?.content ?? ""
 *     controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`))
 *   }
 */
export async function ragCompletionStream(
  systemPrompt: string,
  userMessage: string,
  history: ConversationMessage[] = []
): Promise<Stream<ChatCompletionChunk>> {
  const { chatModel, ragTemperature } = getOpenAIConfig();
  const client = getOpenAIClient();

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...history.map((m) => ({ role: m.role, content: m.content }) as ChatCompletionMessageParam),
    { role: "user", content: userMessage },
  ];

  return client.chat.completions.create({
    model: chatModel,
    messages,
    temperature: ragTemperature,
    stream: true,
  });
}

// ─── Prompt builders ─────────────────────────────────────────────────────────

/**
 * Build the system prompt for a RAG query, injecting retrieved context chunks.
 */
export function buildRagSystemPrompt(
  contextChunks: Array<{ content: string; similarity: number }>
): string {
  const hasContext = contextChunks.length > 0;

  const contextBlock = hasContext
    ? contextChunks
        .map(
          (c, i) =>
            `[Source ${i + 1} | relevance: ${(c.similarity * 100).toFixed(1)}%]\n${c.content}`
        )
        .join("\n\n---\n\n")
    : "No relevant document chunks were found in the knowledge base.";

  return `You are Cortex Obsidian, an advanced AI research assistant.
Answer the user's question using ONLY the document context provided below.
If the context is insufficient, say so clearly — do not hallucinate.

## Retrieved Context
${contextBlock}

## Response Guidelines
- Be concise and factual.
- Use markdown (headers, bullets, bold) where it aids clarity.
- If no context was found, advise the user to upload relevant documents first.`;
}
