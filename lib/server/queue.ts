/**
 * Ingest-job queue facade.
 *
 * Today this just logs — the real BullMQ wiring ships in M2C. The point of the
 * facade now is so that M2B server actions can call `queueIngestJob(documentId)`
 * without later changes touching them. When the worker lands, this file gets
 * a Redis-backed implementation and nothing else moves.
 */
import { env } from '@/lib/env';

export type IngestJob = { documentId: string };

export async function queueIngestJob(job: IngestJob): Promise<void> {
  if (!env.REDIS_URL) {
    // eslint-disable-next-line no-console
    console.log(`[queue] ingest job for document ${job.documentId} (no REDIS_URL — stub mode)`);
    return;
  }
  // eslint-disable-next-line no-console
  console.log(`[queue] ingest job queued for document ${job.documentId} (BullMQ wiring ships in M2C)`);
}
