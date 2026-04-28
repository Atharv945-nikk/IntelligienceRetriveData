import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * GEMINI SDK CONFIGURATION
 * Strategy: Use v1beta and gemini-1.5-flash for maximum reliability/speed.
 * Focus: Chat completions only. No embeddings used here.
 */
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

export async function geminiChat(
  systemPrompt: string,
  userMessage: string,
  history: any[] = []
): Promise<string> {
  // Use v1beta to ensure gemini-1.5-flash availability
  const model = genAI.getGenerativeModel(
    { model: "gemini-1.5-flash" },
    { apiVersion: "v1beta" }
  );

  // Convert generic history to Gemini format
  const chatHistory = history.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: String(m.content || "") }],
  }));

  const prompt = `System Instructions: ${systemPrompt}\n\nUser Question: ${userMessage}`;

  try {
    const result = await model.generateContent({
      contents: [
        ...chatHistory,
        { role: "user", parts: [{ text: prompt }] },
      ],
    });

    const response = await result.response;
    return response.text() || "I'm sorry, I couldn't generate a response.";
  } catch (err) {
    console.error("[Gemini] Chat Error:", err);
    throw new Error("Failed to generate response from Gemini.");
  }
}