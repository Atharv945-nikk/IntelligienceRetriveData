/**
 * src/lib/openai/client.ts
 * Lazy-initialised OpenAI singleton.
 * The real SDK client is only constructed the first time a route calls it,
 * so a missing API key does NOT crash the Next.js dev server on startup.
 */
import OpenAI from "openai";
import { getOpenAIConfig } from "./config";

let _instance: OpenAI | null = null;

/** Return the shared OpenAI client, creating it on first call. */
export function getOpenAIClient(): OpenAI {
  if (_instance) return _instance;
  const { apiKey } = getOpenAIConfig();
  _instance = new OpenAI({ apiKey });
  return _instance;
}

/**
 * Drop-in replacement for `new OpenAI()`.
 * Accessed via Proxy so the underlying singleton is created lazily.
 *
 * @example
 *   import { openai } from "@/lib/openai"
 *   const res = await openai.chat.completions.create({ ... })
 */
export const openai = new Proxy({} as OpenAI, {
  get(_target, prop: string | symbol) {
    const client = getOpenAIClient();
    const value = (client as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === "function" ? value.bind(client) : value;
  },
});
