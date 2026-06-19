'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { getBotForUser } from '@/lib/server/bots';
import { createPendingDocument, deleteDocumentForUser } from '@/lib/server/documents';
import {
  QuotaExceededError,
  assertCanIngestDocument,
  getPlan,
  limitsFor,
} from '@/lib/server/plans';
import { queueIngestJob } from '@/lib/server/queue';
import { requireAuth } from '@/lib/server/require-auth';
import { storage } from '@/lib/server/storage';

const UrlInput = z.object({
  botId: z.string().uuid(),
  url: z
    .string()
    .trim()
    .url('Enter a valid http:// or https:// URL')
    .refine(
      (u) => {
        try {
          const parsed = new URL(u);
          if (!['http:', 'https:'].includes(parsed.protocol)) return false;
          // Reject localhost / link-local / private targets from server-fetch
          // to prevent SSRF — the worker will fetch this URL from inside our
          // network.
          const host = parsed.hostname.toLowerCase();
          if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') return false;
          if (host.endsWith('.localhost') || host.endsWith('.local')) return false;
          if (host.startsWith('10.') || host.startsWith('192.168.')) return false;
          if (/^169\.254\./.test(host)) return false;
          if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return false;
          return true;
        } catch {
          return false;
        }
      },
      { message: 'URL host is not allowed' },
    ),
  title: z.string().trim().max(255).optional(),
});

const DeleteInput = z.object({ documentId: z.string().uuid() });

export type DocumentActionState =
  | { status: 'idle' }
  | { status: 'error'; message: string; field?: 'url' | 'title' }
  | { status: 'ok'; message: string };

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
    return { status: 'error', message: first.message, field: first.path[0] as 'url' | 'title' };
  }
  const bot = await getBotForUser(user.id, parsed.data.botId);
  if (!bot) return { status: 'error', message: 'Bot not found' };

  try {
    // URL ingestion size isn't known until fetch — count the URL as 0 bytes
    // here. The worker decrements the bytes budget after extraction; if a
    // URL turns out to be huge, ingestion fails gracefully at that step.
    await assertCanIngestDocument(user.id, 0);
  } catch (error) {
    if (error instanceof QuotaExceededError) {
      const plan = await getPlan(user.id);
      return {
        status: 'error',
        message: `Document count limit reached (${limitsFor(plan).documents} on the ${plan} plan).`,
      };
    }
    throw error;
  }

  const doc = await createPendingDocument({
    botId: bot.id,
    source: 'url',
    title: parsed.data.title?.length ? parsed.data.title : parsed.data.url,
    sourceUrl: parsed.data.url,
  });
  await queueIngestJob({ documentId: doc.id });

  revalidatePath(`/bots/${bot.id}`);
  return { status: 'ok', message: 'URL queued for ingestion' };
}

export async function deleteDocumentAction(formData: FormData): Promise<void> {
  const user = await requireAuth();
  const parsed = DeleteInput.safeParse({ documentId: formData.get('documentId') });
  if (!parsed.success) return;

  const removed = await deleteDocumentForUser(user.id, parsed.data.documentId);
  if (removed?.storageKey) {
    try {
      await storage.deleteObject(removed.storageKey);
    } catch {
      // Best-effort: the DB row is already gone. A nightly sweeper handles
      // orphaned objects in M5; for now we tolerate the leak.
    }
  }
  if (removed) revalidatePath(`/bots/${removed.botId}`);
}
