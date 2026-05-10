import Groq from "groq-sdk";

/**
 * src/lib/gemini.ts
 *
 * Previously used Google Gemini.
 * Now uses Groq API — FREE tier.
 * Model: llama-3.3-70b-versatile
 *
 * Add to .env.local:
 *   GROQ_API_KEY=your_key_here
 *
 * Get a free key at: https://console.groq.com
 */

let _client: Groq | null = null;

function getClient() {
  if (_client) return _client;
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("Missing GROQ_API_KEY in .env.local");
  _client = new Groq({ apiKey });
  return _client;
}

/**
 * Drop-in replacement for geminiChat().
 * Same signature — no changes needed in any other file.
 */
export async function geminiChat(
  systemPrompt: string,
  userMessage: string,
  history: any[] = []
): Promise<string> {
  const client = getClient();

  // Convert generic history to Groq/OpenAI format
  const messages: Groq.Chat.ChatCompletionMessageParam[] = [
    // System prompt
    {
      role: "system",
      content: systemPrompt,
    },
    // Previous conversation turns
    ...history.map((m) => ({
      role: (m.role === "assistant" ? "assistant" : "user") as "user" | "assistant",
      content: String(m.content || ""),
    })),
    // Current user message
    {
      role: "user" as const,
      content: userMessage,
    },
  ];

  try {
    const response = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages,
      max_tokens: 1024,
      temperature: 0.7,
    });

    return (
      response.choices[0]?.message?.content ||
      "I'm sorry, I couldn't generate a response."
    );
  } catch (err: any) {
    console.error("[Groq] Chat Error:", err?.message || err);
    throw new Error(`Failed to generate response from Gemini: ${err?.message}`);
  }
}