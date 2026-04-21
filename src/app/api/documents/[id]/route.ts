/**
 * DELETE /api/documents/[id]
 * Removes the document and all its chunks (FK cascade).
 */
import { NextRequest, NextResponse } from "next/server";
import { deleteDocument, getDocument } from "@/lib/supabase";

export const runtime = "nodejs";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Document ID is required." }, { status: 400 });
    }

    // Verify document exists before attempting delete
    const existing = await getDocument(id);
    if (!existing) {
      return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }

    await deleteDocument(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/documents/[id]]", err);
    const message = err instanceof Error ? err.message : "Failed to delete document.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
