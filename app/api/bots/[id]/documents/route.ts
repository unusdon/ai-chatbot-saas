/**
 * PDF upload endpoint.
 *
 * Why a Route Handler instead of a Server Action: Server Actions cap request
 * bodies at ~1 MB by default, which is too small for real PDFs. Route Handlers
 * have no such limit; we enforce our own (`MAX_PDF_BYTES`) inline.
 */
import { NextResponse } from 'next/server';

import { getBotForUser } from '@/lib/server/bots';
import { createPendingDocument } from '@/lib/server/documents';
import {
  QuotaExceededError,
  assertCanIngestDocument,
  getPlan,
  limitsFor,
} from '@/lib/server/plans';
import { queueIngestJob } from '@/lib/server/queue';
import { documentStorageKey, storage } from '@/lib/server/storage';
import { requireAuth } from '@/lib/server/require-auth';

export const runtime = 'nodejs';

const MAX_PDF_BYTES = 20 * 1024 * 1024; // 20 MB
const PDF_MAGIC = Buffer.from('%PDF-');

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  const { id: botId } = await params;

  const bot = await getBotForUser(user.id, botId);
  if (!bot) {
    return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
  }

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }
  if (!file.name.toLowerCase().endsWith('.pdf') || file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'Only PDF files are accepted' }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: 'File is empty' }, { status: 400 });
  }
  if (file.size > MAX_PDF_BYTES) {
    return NextResponse.json(
      { error: `File exceeds ${MAX_PDF_BYTES / (1024 * 1024)} MB limit` },
      { status: 413 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!buffer.subarray(0, PDF_MAGIC.length).equals(PDF_MAGIC)) {
    return NextResponse.json({ error: 'File is not a valid PDF (missing %PDF- header)' }, { status: 400 });
  }

  try {
    await assertCanIngestDocument(user.id, buffer.byteLength);
  } catch (error) {
    if (error instanceof QuotaExceededError) {
      const plan = await getPlan(user.id);
      const limits = limitsFor(plan);
      const msg =
        error.limit === 'documents'
          ? `Document count limit reached (${limits.documents} on the ${plan} plan).`
          : `Storage cap reached (${(limits.documentBytes / (1024 * 1024)).toFixed(0)} MB on the ${plan} plan).`;
      return NextResponse.json({ error: msg }, { status: 402 });
    }
    throw error;
  }

  // Insert pending row first so we have an ID to use in the storage key.
  // If the upload fails, we mark it failed below.
  const doc = await createPendingDocument({
    botId: bot.id,
    source: 'pdf',
    title: file.name,
    bytes: buffer.byteLength,
  });
  const key = documentStorageKey(bot.id, doc.id, '.pdf');

  try {
    await storage.putObject(key, buffer, 'application/pdf');
    // Persist the storageKey now that the upload succeeded.
    // (We can't get it before inserting, since the key contains the document id.)
    const { db } = await import('@/db');
    const { documents } = await import('@/db/schema');
    const { eq } = await import('drizzle-orm');
    await db.update(documents).set({ storageKey: key, updatedAt: new Date() }).where(eq(documents.id, doc.id));

    await queueIngestJob({ documentId: doc.id });
  } catch (error) {
    const { markDocumentStatus } = await import('@/lib/server/documents');
    await markDocumentStatus(doc.id, 'failed', {
      error: error instanceof Error ? error.message : 'Storage failed',
    });
    return NextResponse.json({ error: 'Upload failed — see document status for details' }, { status: 500 });
  }

  return NextResponse.json({ id: doc.id, title: doc.title, status: doc.status });
}
