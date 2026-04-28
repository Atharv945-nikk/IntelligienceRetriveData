import { NextRequest, NextResponse } from "next/server";
import { matchDocuments } from "@/lib/supabase";
import { generateEmbedding } from "@/lib/openai"; // ✅ OpenAI for search
import { geminiChat } from "@/lib/gemini";      // ✅ Gemini for chat

/**
 * Basic system prompt builder for RAG.
 */
function buildRagSystemPrompt(contextChunks: any[]): string {
  const contextBlock = contextChunks.length > 0
    ? contextChunks.map((c, i) => `[Source ${i + 1} | relevance: ${(c.similarity * 100).toFixed(1)}%]\n${c.content}`).join("\n\n---\n\n")
    : "No relevant document chunks found.";

  return `You are Cortex Obsidian, an advanced AI assistant.
Answer using ONLY the retrieved context below. If context is missing, say so.

## Retrieved Context
${contextBlock}

## Response Guidelines:
- Be concise and factual.
- Use markdown for structure.`;
}

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { message, conversationHistory = [] } = await req.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    // 1. Embed the query using OpenAI (1536 dims)
    console.log("[Chat] Embedding query with OpenAI...");
    const queryEmbedding = await generateEmbedding(message);

    // 2. Vector Search (Supabase)
    console.log("[Chat] Searching knowledge base...");
    const results = await matchDocuments(queryEmbedding, {
      matchCount: 5,
      matchThreshold: 0.1,
    });

    // 3. Prepare Context
    const sourceNames = [...new Set(results.map((r) => r.metadata?.filename))].filter(Boolean);
    const systemPrompt = buildRagSystemPrompt(results);

    // 4. Generate Response with Gemini
    console.log("[Chat] Generating answer with Gemini...");
    const aiResponse = await geminiChat(systemPrompt, message, conversationHistory);

    // 5. Stream SSE Response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send response delta
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ delta: aiResponse })}\n\n`)
          );

          // Send sources and done signal
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ done: true, sources: sourceNames })}\n\n`
            )
          );
        } catch (e) {
          console.error("[Chat] Stream Error:", e);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });

  } catch (err: any) {
    console.error("[Chat] Global Error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}