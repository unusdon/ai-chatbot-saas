/**
 * File upload endpoint. Multi-format: PDF / DOCX / XLSX / Markdown / TXT / JSON.
 *
 * Why a Route Handler instead of a Server Action: Server Actions cap request
 * bodies at ~1 MB by default, which is too small for real PDFs. Route Handlers
 * have no such limit; we enforce our own per-kind cap inline.
 *
 * The route accepts a single file per request. The dashboard's drag-drop UI
 * dispatches N parallel requests to this endpoint so each shows independent
 * progress and one failure doesn't take down the batch.
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
import { requireAuth } from '@/lib/server/require-auth';
import { FILE_KINDS, detectFileKind, storageExtFor } from '@/lib/server/source-types';
import { documentStorageKey, storage } from '@/lib/server/storage';

export const runtime = 'nodejs';

const PDF_MAGIC = Buffer.from('%PDF-');
// DOCX + XLSX are zip-based — both start with PK\x03\x04.
const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

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
  if (file.size === 0) {
    return NextResponse.json({ error: 'File is empty' }, { status: 400 });
  }

  const kind = detectFileKind(file.name);
  if (!kind) {
    return NextResponse.json(
      { error: `Unsupported file type. Accepted: ${Object.values(FILE_KINDS).flatMap((k) => k.exts).join(', ')}` },
      { status: 400 },
    );
  }

  const def = FILE_KINDS[kind];
  if (file.size > def.maxBytes) {
    return NextResponse.json(
      { error: `${def.label} files must be ≤ ${(def.maxBytes / (1024 * 1024)).toFixed(0)} MB` },
      { status: 413 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Magic-byte checks — defense against renamed extensions.
  if (kind === 'pdf' && !buffer.subarray(0, PDF_MAGIC.length).equals(PDF_MAGIC)) {
    return NextResponse.json({ error: 'File is not a valid PDF' }, { status: 400 });
  }
  if ((kind === 'docx' || kind === 'xlsx') && !buffer.subarray(0, ZIP_MAGIC.length).equals(ZIP_MAGIC)) {
    return NextResponse.json({ error: `File does not look like a ${def.label}` }, { status: 400 });
  }
  if (kind === 'json') {
    try {
      JSON.parse(buffer.toString('utf8'));
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
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

  const doc = await createPendingDocument({
    botId: bot.id,
    source: kind,
    title: file.name,
    bytes: buffer.byteLength,
  });
  const key = documentStorageKey(bot.id, doc.id, storageExtFor(kind));

  try {
    await storage.putObject(key, buffer, file.type || 'application/octet-stream');
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

  return NextResponse.json({ id: doc.id, title: doc.title, source: kind, status: doc.status });
}
