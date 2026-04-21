/**
 * Document Parsing Utility
 * Handles PDF (via pdf-parse) and DOCX (via mammoth).
 * Use this ONLY on the server.
 */

// pdf-parse helper
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse") as (
  dataBuffer: Buffer
) => Promise<{ text: string; numpages: number; info: unknown }>;

// mammoth helper
import mammoth from "mammoth";

export interface ParsedDocument {
  text: string;
  numPages: number;
  metadata: Record<string, unknown>;
}

/**
 * Parse a PDF from a Buffer.
 */
export async function parsePdf(buffer: Buffer): Promise<ParsedDocument> {
  const data = await pdfParse(buffer);
  return {
    text: data.text,
    numPages: data.numpages,
    metadata: data.info as Record<string, unknown>,
  };
}

/**
 * Parse a DOCX from a Buffer.
 */
export async function parseDocx(buffer: Buffer): Promise<ParsedDocument> {
  const result = await mammoth.extractRawText({ buffer });
  // DOCX doesn't have a strict concept of "pages" in raw text extraction easily,
  // we'll estimate or just set to 1 if not easily available.
  return {
    text: result.value,
    numPages: 1, // Mammoth doesn't provide page counts easily
    metadata: { messages: result.messages },
  };
}

/**
 * Universal parser based on file extension or mime type.
 */
export async function parseDocument(
  buffer: Buffer,
  fileName: string
): Promise<ParsedDocument> {
  const ext = fileName.toLowerCase().split(".").pop();

  if (ext === "pdf") {
    return parsePdf(buffer);
  } else if (ext === "docx") {
    return parseDocx(buffer);
  } else {
    throw new Error(`Unsupported file type: .${ext}`);
  }
}

/**
 * Split text into overlapping chunks for embedding.
 * Defaulting to 500 characters with 50 character overlap for optimal RAG performance.
 */
export function chunkText(
  text: string,
  chunkSize = 500,
  overlap = 50
): string[] {
  const chunks: string[] = [];
  
  // Clean up whitespace: replace multiple spaces/newlines with a single space
  const cleanText = text.replace(/\s+/g, " ").trim();

  if (cleanText.length === 0) return [];

  let start = 0;
  while (start < cleanText.length) {
    // Current window end
    const end = Math.min(start + chunkSize, cleanText.length);
    
    // Extract chunk
    const chunk = cleanText.slice(start, end).trim();
    
    if (chunk.length > 0) {
      chunks.push(chunk);
    }
    
    // Move start pointer: chunkSize - overlap
    start += (chunkSize - overlap);

    // Safety break: if we aren't moving forward, or reach the end
    if (start >= cleanText.length || chunkSize <= overlap) break;
  }

  return chunks;
}
