'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { getBotForUser } from '@/lib/server/bots';
import {
  createPendingDocument,
  deleteDocumentForUser,
  deleteDocumentsForUser,
  resetDocumentForReingest,
  updateDocumentForUser,
} from '@/lib/server/documents';
import { fetchSitemapUrls } from '@/lib/server/extract';
import {
  QuotaExceededError,
  assertCanIngestDocument,
  getPlan,
  limitsFor,
} from '@/lib/server/plans';
import { queueIngestJob } from '@/lib/server/queue';
import { requireAuth } from '@/lib/server/require-auth';
import { storageExtFor } from '@/lib/server/source-types';
import { documentStorageKey, storage } from '@/lib/server/storage';

export type DocumentActionState =
  | { status: 'idle' }
  | { status: 'error'; message: string; field?: string }
  | { status: 'ok'; message: string };

const IDLE: DocumentActionState = { status: 'idle' };

// --- URL ingestion ----------------------------------------------------------

const UrlInput = z.object({
  botId: z.string().uuid(),
  url: z
    .string()
    .trim()
    .url('Enter a valid http:// or https:// URL')
    .refine((u) => isSafeUrl(u), { message: 'URL host is not allowed' }),
  title: z.string().trim().max(255).optional(),
});

export async function ingestUrlAction(
  _prev: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  const user = await requireAuth();
  const parsed = UrlInput.safeParse({
    botId: formData.get('botId'),
    url: formData.get('url'),
    title: formData.get('title') ?? undefined,
  });
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    return { status: 'error', message: first.message, field: first.path[0] as string };
  }
  const bot = await getBotForUser(user.id, parsed.data.botId);
  if (!bot) return { status: 'error', message: 'Bot not found' };

  const quota = await failedQuotaCheck(user.id, 0);
  if (quota) return quota;

  const doc = await createPendingDocument({
    botId: bot.id,
    source: 'url',
    title: parsed.data.title?.length ? parsed.data.title : parsed.data.url,
    sourceUrl: parsed.data.url,
  });
  await queueIngestJob({ documentId: doc.id });
  revalidatePath(`/bots/${bot.id}`);
  revalidatePath(`/bots/${bot.id}/sources`);
  return { status: 'ok', message: 'URL queued for ingestion' };
}

// --- Plain-text source ------------------------------------------------------

const TextInput = z.object({
  botId: z.string().uuid(),
  title: z.string().trim().min(1, 'Title is required').max(200),
  content: z.string().trim().min(1, 'Content is required').max(500_000),
  kind: z.enum(['text', 'markdown']).default('text'),
});

export async function createTextSourceAction(
  _prev: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  const user = await requireAuth();
  const parsed = TextInput.safeParse({
    botId: formData.get('botId'),
    title: formData.get('title'),
    content: formData.get('content'),
    kind: formData.get('kind') ?? 'text',
  });
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    return { status: 'error', message: first.message, field: first.path[0] as string };
  }
  const bot = await getBotForUser(user.id, parsed.data.botId);
  if (!bot) return { status: 'error', message: 'Bot not found' };

  const bytes = Buffer.byteLength(parsed.data.content, 'utf8');
  const quota = await failedQuotaCheck(user.id, bytes);
  if (quota) return quota;

  const doc = await createPendingDocument({
    botId: bot.id,
    source: parsed.data.kind,
    title: parsed.data.title,
    bytes,
  });
  const key = documentStorageKey(bot.id, doc.id, storageExtFor(parsed.data.kind));
  await storage.putObject(key, Buffer.from(parsed.data.content, 'utf8'), 'text/plain');
  await updateStorageKey(doc.id, key);
  await queueIngestJob({ documentId: doc.id });

  revalidatePath(`/bots/${bot.id}`);
  revalidatePath(`/bots/${bot.id}/sources`);
  return { status: 'ok', message: 'Text source saved' };
}

// --- JSON source ------------------------------------------------------------

const JsonInput = z.object({
  botId: z.string().uuid(),
  title: z.string().trim().min(1, 'Title is required').max(200),
  content: z.string().trim().min(2, 'JSON is required').max(2_000_000),
});

export async function createJsonSourceAction(
  _prev: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  const user = await requireAuth();
  const parsed = JsonInput.safeParse({
    botId: formData.get('botId'),
    title: formData.get('title'),
    content: formData.get('content'),
  });
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    return { status: 'error', message: first.message, field: first.path[0] as string };
  }
  try {
    JSON.parse(parsed.data.content);
  } catch {
    return { status: 'error', message: 'Invalid JSON', field: 'content' };
  }
  const bot = await getBotForUser(user.id, parsed.data.botId);
  if (!bot) return { status: 'error', message: 'Bot not found' };

  const bytes = Buffer.byteLength(parsed.data.content, 'utf8');
  const quota = await failedQuotaCheck(user.id, bytes);
  if (quota) return quota;

  const doc = await createPendingDocument({
    botId: bot.id,
    source: 'json',
    title: parsed.data.title,
    bytes,
  });
  const key = documentStorageKey(bot.id, doc.id, storageExtFor('json'));
  await storage.putObject(key, Buffer.from(parsed.data.content, 'utf8'), 'application/json');
  await updateStorageKey(doc.id, key);
  await queueIngestJob({ documentId: doc.id });

  revalidatePath(`/bots/${bot.id}`);
  revalidatePath(`/bots/${bot.id}/sources`);
  return { status: 'ok', message: 'JSON source saved' };
}

// --- Q&A pair --------------------------------------------------------------

const QaInput = z.object({
  botId: z.string().uuid(),
  question: z.string().trim().min(1, 'Question is required').max(500),
  answer: z.string().trim().min(1, 'Answer is required').max(8_000),
});

export async function createQaPairAction(
  _prev: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  const user = await requireAuth();
  const parsed = QaInput.safeParse({
    botId: formData.get('botId'),
    question: formData.get('question'),
    answer: formData.get('answer'),
  });
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    return { status: 'error', message: first.message, field: first.path[0] as string };
  }
  const bot = await getBotForUser(user.id, parsed.data.botId);
  if (!bot) return { status: 'error', message: 'Bot not found' };

  const bytes = Buffer.byteLength(parsed.data.answer, 'utf8');
  const quota = await failedQuotaCheck(user.id, bytes);
  if (quota) return quota;

  const doc = await createPendingDocument({
    botId: bot.id,
    source: 'qa',
    title: parsed.data.question,
    bytes,
  });
  const key = documentStorageKey(bot.id, doc.id, storageExtFor('qa'));
  await storage.putObject(key, Buffer.from(parsed.data.answer, 'utf8'), 'text/plain');
  await updateStorageKey(doc.id, key);
  await queueIngestJob({ documentId: doc.id });

  revalidatePath(`/bots/${bot.id}`);
  revalidatePath(`/bots/${bot.id}/sources`);
  return { status: 'ok', message: 'Q&A pair saved' };
}

// --- Sitemap crawl ----------------------------------------------------------

const SitemapInput = z.object({
  botId: z.string().uuid(),
  sitemapUrl: z
    .string()
    .trim()
    .url('Enter a valid sitemap URL')
    .refine((u) => isSafeUrl(u), { message: 'URL host is not allowed' }),
  maxUrls: z.coerce.number().int().min(1).max(200).default(50),
});

export async function importSitemapAction(
  _prev: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  const user = await requireAuth();
  const parsed = SitemapInput.safeParse({
    botId: formData.get('botId'),
    sitemapUrl: formData.get('sitemapUrl'),
    maxUrls: formData.get('maxUrls') ?? 50,
  });
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    return { status: 'error', message: first.message, field: first.path[0] as string };
  }
  const bot = await getBotForUser(user.id, parsed.data.botId);
  if (!bot) return { status: 'error', message: 'Bot not found' };

  let urls: string[];
  try {
    urls = await fetchSitemapUrls(parsed.data.sitemapUrl, { maxUrls: parsed.data.maxUrls });
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Sitemap fetch failed' };
  }
  if (urls.length === 0) {
    return { status: 'error', message: 'No usable URLs found in the sitemap' };
  }

  const quota = await failedQuotaCheck(user.id, 0, urls.length);
  if (quota) return quota;

  for (const url of urls) {
    const doc = await createPendingDocument({
      botId: bot.id,
      source: 'url',
      title: url,
      sourceUrl: url,
    });
    await queueIngestJob({ documentId: doc.id });
  }

  revalidatePath(`/bots/${bot.id}`);
  revalidatePath(`/bots/${bot.id}/sources`);
  return { status: 'ok', message: `Queued ${urls.length} URL${urls.length === 1 ? '' : 's'} from the sitemap` };
}

// --- CRUD operations -------------------------------------------------------

const RenameInput = z.object({
  documentId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
});

export async function renameDocumentAction(
  _prev: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  const user = await requireAuth();
  const parsed = RenameInput.safeParse({
    documentId: formData.get('documentId'),
    title: formData.get('title'),
  });
  if (!parsed.success) {
    return { status: 'error', message: parsed.error.errors[0].message };
  }
  const updated = await updateDocumentForUser(user.id, parsed.data.documentId, { title: parsed.data.title });
  if (!updated) return { status: 'error', message: 'Document not found' };
  revalidatePath(`/bots/${updated.botId}/sources`);
  return { status: 'ok', message: 'Renamed' };
}

const EditContentInput = z.object({
  documentId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  content: z.string().min(1).max(2_000_000),
});

export async function editDocumentContentAction(
  _prev: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  const user = await requireAuth();
  const parsed = EditContentInput.safeParse({
    documentId: formData.get('documentId'),
    title: formData.get('title'),
    content: formData.get('content'),
  });
  if (!parsed.success) {
    return { status: 'error', message: parsed.error.errors[0].message };
  }

  const { getDocumentForUser } = await import('@/lib/server/documents');
  const existing = await getDocumentForUser(user.id, parsed.data.documentId);
  if (!existing) return { status: 'error', message: 'Document not found' };

  // Only text-based source types are inline-editable.
  if (!['text', 'markdown', 'json', 'qa'].includes(existing.source)) {
    return { status: 'error', message: `${existing.source} sources cannot be edited inline.` };
  }
  if (existing.source === 'json') {
    try {
      JSON.parse(parsed.data.content);
    } catch {
      return { status: 'error', message: 'Invalid JSON' };
    }
  }
  if (!existing.storageKey) {
    return { status: 'error', message: 'Document storage key missing' };
  }

  await storage.putObject(existing.storageKey, Buffer.from(parsed.data.content, 'utf8'), 'text/plain');
  const bytes = Buffer.byteLength(parsed.data.content, 'utf8');
  const patched = await updateDocumentForUser(user.id, parsed.data.documentId, {
    title: parsed.data.title,
    bytes,
  });
  if (!patched) return { status: 'error', message: 'Document not found' };

  await resetDocumentForReingest(user.id, parsed.data.documentId);
  await queueIngestJob({ documentId: parsed.data.documentId });
  revalidatePath(`/bots/${patched.botId}/sources`);
  return { status: 'ok', message: 'Updated and queued for re-ingestion' };
}

const ReingestInput = z.object({ documentId: z.string().uuid() });

export async function reingestDocumentAction(formData: FormData): Promise<void> {
  const user = await requireAuth();
  const parsed = ReingestInput.safeParse({ documentId: formData.get('documentId') });
  if (!parsed.success) return;
  const reset = await resetDocumentForReingest(user.id, parsed.data.documentId);
  if (reset) {
    await queueIngestJob({ documentId: reset.id });
    revalidatePath(`/bots/${reset.botId}/sources`);
  }
}

const DeleteInput = z.object({ documentId: z.string().uuid() });

export async function deleteDocumentAction(formData: FormData): Promise<void> {
  const user = await requireAuth();
  const parsed = DeleteInput.safeParse({ documentId: formData.get('documentId') });
  if (!parsed.success) return;

  const removed = await deleteDocumentForUser(user.id, parsed.data.documentId);
  if (removed?.storageKey) {
    try {
      await storage.deleteObject(removed.storageKey);
    } catch {
      // Best-effort.
    }
  }
  if (removed) {
    revalidatePath(`/bots/${removed.botId}`);
    revalidatePath(`/bots/${removed.botId}/sources`);
  }
}

const BulkDeleteInput = z.object({
  documentIds: z.array(z.string().uuid()).min(1).max(200),
});

export async function bulkDeleteDocumentsAction(input: { documentIds: string[] }): Promise<{ deleted: number }> {
  const user = await requireAuth();
  const parsed = BulkDeleteInput.safeParse(input);
  if (!parsed.success) return { deleted: 0 };
  const removed = await deleteDocumentsForUser(user.id, parsed.data.documentIds);
  await Promise.all(
    removed
      .filter((d) => d.storageKey)
      .map((d) =>
        storage.deleteObject(d.storageKey!).catch(() => {
          /* best-effort */
        }),
      ),
  );
  if (removed[0]) {
    revalidatePath(`/bots/${removed[0].botId}`);
    revalidatePath(`/bots/${removed[0].botId}/sources`);
  }
  return { deleted: removed.length };
}

// --- helpers ---------------------------------------------------------------

function isSafeUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (!['http:', 'https:'].includes(u.protocol)) return false;
    const host = u.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') return false;
    if (host.endsWith('.localhost') || host.endsWith('.local')) return false;
    if (host.startsWith('10.') || host.startsWith('192.168.')) return false;
    if (/^169\.254\./.test(host)) return false;
    if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return false;
    return true;
  } catch {
    return false;
  }
}

async function failedQuotaCheck(
  userId: string,
  addedBytes: number,
  addedDocs = 1,
): Promise<DocumentActionState | null> {
  try {
    for (let i = 0; i < addedDocs; i++) {
      await assertCanIngestDocument(userId, i === 0 ? addedBytes : 0);
    }
  } catch (error) {
    if (error instanceof QuotaExceededError) {
      const plan = await getPlan(userId);
      const limits = limitsFor(plan);
      const msg =
        error.limit === 'documents'
          ? `Document count limit reached (${limits.documents} on the ${plan} plan).`
          : `Storage cap reached (${(limits.documentBytes / (1024 * 1024)).toFixed(0)} MB on the ${plan} plan).`;
      return { status: 'error', message: msg };
    }
    throw error;
  }
  return null;
}

async function updateStorageKey(documentId: string, key: string): Promise<void> {
  const { db } = await import('@/db');
  const { documents } = await import('@/db/schema');
  const { eq } = await import('drizzle-orm');
  await db.update(documents).set({ storageKey: key, updatedAt: new Date() }).where(eq(documents.id, documentId));
}

export { IDLE as IDLE_STATE };
