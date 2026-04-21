/**
 * src/lib/openai.ts  ← legacy shim
 * Re-exports everything from the new modular package so any existing imports
 * from "@/lib/openai" continue to work without changes.
 */
export * from "./openai/index";
