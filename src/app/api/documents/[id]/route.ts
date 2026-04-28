import { NextRequest, NextResponse } from "next/server";
import { getDocumentByChunkId, deleteDocumentByFilename } from "@/lib/supabase";

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

    // Resolve filename from this chunk ID
    const chunk = await getDocumentByChunkId(parseInt(id));
    if (!chunk) {
      return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }

    const filename = chunk.metadata.filename;
    await deleteDocumentByFilename(filename);
    
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/documents/[id]]", err);
    const message = err instanceof Error ? err.message : "Failed to delete document.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
