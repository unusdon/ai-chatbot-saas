/**
 * Ingest-job producer.
 *
 * Wraps a single BullMQ Queue so server actions can enqueue without knowing
 * about Redis. When REDIS_URL is unset (e.g., local dev without docker, or
 * vitest unit suites), we fall back to a no-op + log so the rest of the app
 * keeps working.
 *
 * The BullMQ Worker that consumes this queue lives in `worker/index.ts` and
 * must be started as a separate process: `npm run worker`.
 */
import { Queue, type JobsOptions } from 'bullmq';

import { env } from '@/lib/env';

export const INGEST_QUEUE = 'ingest';

export type IngestJob = { documentId: string };

let queue: Queue<IngestJob> | null = null;

function getQueue(): Queue<IngestJob> | null {
  if (!env.REDIS_URL) return null;
  if (queue) return queue;
  // Hand BullMQ the URL; it owns the Redis connection lifecycle so we don't
  // end up with two competing ioredis versions (next-auth and BullMQ each
  // bundle one).
  queue = new Queue<IngestJob>(INGEST_QUEUE, {
    connection: redisOptionsFromUrl(env.REDIS_URL),
  });
  return queue;
}

const DEFAULT_JOB_OPTS: JobsOptions = {
  attempts: 5,
  backoff: { type: 'exponential', delay: 5_000 },
  removeOnComplete: { age: 24 * 60 * 60, count: 1_000 },
  removeOnFail: { age: 7 * 24 * 60 * 60 },
};

export async function queueIngestJob(job: IngestJob): Promise<void> {
  const q = getQueue();
  if (!q) {
    // eslint-disable-next-line no-console
    console.log(`[queue] no REDIS_URL — would enqueue ingest for ${job.documentId}`);
    return;
  }
  await q.add('ingest', job, DEFAULT_JOB_OPTS);
}

export async function closeQueue(): Promise<void> {
  if (queue) {
    await queue.close();
    queue = null;
  }
}

export function redisOptionsFromUrl(url: string) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: u.port ? Number(u.port) : 6379,
    password: u.password || undefined,
    db: u.pathname && u.pathname !== '/' ? Number(u.pathname.slice(1)) : undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };
}
