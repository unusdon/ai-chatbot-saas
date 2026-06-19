/**
 * Per-document read endpoint. Returns metadata + chunks for the preview
 * drawer + (for inline-editable types) the current text content so the edit
 * dialog can prefill.
 */
import { NextResponse } from 'next/server';

import { getDocumentChunks, getDocumentForUser } from '@/lib/server/documents';
import { requireAuth } from '@/lib/server/require-auth';
import { storage } from '@/lib/server/storage';

export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; documentId: string }> },
) {
  const user = await requireAuth();
  const { documentId } = await params;

  const doc = await getDocumentForUser(user.id, documentId);
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const chunks = await getDocumentChunks(user.id, documentId);

  // For inline-editable types, load the actual text from S3 so the edit
  // dialog can prefill. Files (PDF/DOCX/XLSX) skip this — we'd be sending
  // megabytes of binary, and the dialog can't render those anyway.
  let content: string | null = null;
  if (['text', 'markdown', 'json', 'qa'].includes(doc.source) && doc.storageKey) {
    try {
      const buf = await storage.getObjectBody(doc.storageKey);
      content = buf.toString('utf8');
    } catch {
      content = null;
    }
  }

  return NextResponse.json({
    document: {
      id: doc.id,
      title: doc.title,
      source: doc.source,
      sourceUrl: doc.sourceUrl,
      status: doc.status,
      error: doc.error,
      chunkCount: doc.chunkCount,
      bytes: doc.bytes,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    },
    chunks: chunks.map((c) => ({
      id: c.id,
      chunkIndex: c.chunkIndex,
      content: c.content,
      tokens: c.tokens,
    })),
    content,
  });
}
