/**
 * POST /api/chat
 * Streaming RAG completion over SSE.
 */
import { NextRequest, NextResponse } from "next/server";
import { matchChunks, resolveDocumentNames } from "@/lib/supabase";
import { createEmbedding, ragCompletionStream, buildRagSystemPrompt } from "@/lib/openai";

export const runtime = "nodejs";

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: NextRequest) {
  try {
    const { message, conversationHistory = [] }: {
      message: string;
      conversationHistory: ConversationMessage[];
    } = await req.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    // ── 1. Embed the query ───────────────────────────────────────────────────
    const queryEmbedding = await createEmbedding(message);

    // ── 2. Vector similarity search ──────────────────────────────────────────
    const chunks = await matchChunks(queryEmbedding, {
      matchCount: 5,
      matchThreshold: 0.4,
    });

    // ── 3. Resolve source doc names for citations ────────────────────────────
    const documentIds = [...new Set(chunks.map((c) => c.document_id))];
    const nameMap = await resolveDocumentNames(documentIds);
    const sourceNames = documentIds.map((id) => nameMap[id]).filter(Boolean);

    // ── 4. Build context-injected system prompt ──────────────────────────────
    const systemPrompt = buildRagSystemPrompt(chunks);

    // ── 5. Stream completion ─────────────────────────────────────────────────
    const stream = await ragCompletionStream(systemPrompt, message, conversationHistory);

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content ?? "";
            if (delta) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`)
              );
            }
          }
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ done: true, sources: sourceNames })}\n\n`)
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("[POST /api/chat]", err);
    const message = err instanceof Error ? err.message : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
