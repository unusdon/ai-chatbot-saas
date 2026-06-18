/**
 * BullMQ worker that processes ingest jobs.
 *
 * Run with `npm run worker` (one-shot) or `npm run worker:dev` (reload on
 * source changes). Multiple replicas of this process are safe — BullMQ
 * coordinates job ownership through Redis.
 *
 * Job lifecycle:
 *   1. `ingest` job arrives with `{ documentId }`
 *   2. `runIngest()` updates the document status, extracts, chunks, embeds,
 *      and writes chunk rows
 *   3. On success the job resolves; on failure BullMQ retries per the
 *      producer's exponential-backoff config (5 attempts).
 *
 * The pipeline lives in `lib/server/ingest.ts` so it's exercisable without
 * Redis (used by integration tests and a future CLI replay command).
 */
import 'dotenv/config';
import { Worker } from 'bullmq';

import { env } from '@/lib/env';
import { INGEST_QUEUE, redisOptionsFromUrl, type IngestJob } from '@/lib/server/queue';
import { runIngest } from '@/lib/server/ingest';

if (!env.REDIS_URL) {
  // eslint-disable-next-line no-console
  console.error('REDIS_URL is required to run the ingest worker. Add it to .env.local.');
  process.exit(1);
}

const worker = new Worker<IngestJob>(
  INGEST_QUEUE,
  async (job) => {
    const start = Date.now();
    // eslint-disable-next-line no-console
    console.log(`[worker] ${job.id} processing document ${job.data.documentId}`);
    const result = await runIngest(job.data.documentId);
    // eslint-disable-next-line no-console
    console.log(
      `[worker] ${job.id} done — ${result.chunkCount} chunks in ${Date.now() - start}ms`,
    );
    return result;
  },
  {
    connection: redisOptionsFromUrl(env.REDIS_URL),
    concurrency: Number(process.env.WORKER_CONCURRENCY ?? 4),
  },
);

worker.on('completed', (job) => {
  // eslint-disable-next-line no-console
  console.log(`[worker] ✓ ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  // eslint-disable-next-line no-console
  console.error(`[worker] ✗ ${job?.id} failed:`, err.message);
});

async function shutdown(signal: string) {
  // eslint-disable-next-line no-console
  console.log(`[worker] received ${signal}, draining…`);
  await worker.close();
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

// eslint-disable-next-line no-console
console.log('[worker] ingest worker listening');
