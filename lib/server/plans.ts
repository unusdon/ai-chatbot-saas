/**
 * Per-plan quotas + usage queries + enforcement helpers.
 *
 * Plan limits are declarative so they're easy to tweak when pricing changes.
 * Each limit is checked at the boundary that creates the resource:
 *   - `assertCanCreateBot()` before inserting a bot
 *   - `assertCanIngestDocument()` before queueing a document
 *   - `assertCanSendMessage()` before the chat endpoint hits OpenAI
 */
import { and, count, eq, gte, sql } from 'drizzle-orm';

import { db } from '@/db';
import { bots, conversations, documents, messages, users } from '@/db/schema';

export type Plan = 'free' | 'starter' | 'pro';

export type PlanLimits = {
  /** Hard cap on simultaneous chatbots. */
  bots: number;
  /** Hard cap on documents *per user* across all bots. */
  documents: number;
  /** Hard cap on cumulative document bytes ingested per user. */
  documentBytes: number;
  /** Soft cap on messages per calendar month (UTC). */
  messagesPerMonth: number;
};

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    bots: 3,
    documents: 25,
    documentBytes: 50 * 1024 * 1024, // 50 MB
    messagesPerMonth: 200,
  },
  starter: {
    bots: 20,
    documents: 500,
    documentBytes: 1 * 1024 * 1024 * 1024, // 1 GB
    messagesPerMonth: 5_000,
  },
  pro: {
    bots: 200,
    documents: 5_000,
    documentBytes: 10 * 1024 * 1024 * 1024, // 10 GB
    messagesPerMonth: 50_000,
  },
};

export type Usage = {
  bots: number;
  documents: number;
  documentBytes: number;
  messagesThisMonth: number;
};

export class QuotaExceededError extends Error {
  constructor(public readonly limit: keyof PlanLimits, public readonly cap: number) {
    super(`Quota exceeded for ${limit}: cap is ${cap}`);
    this.name = 'QuotaExceededError';
  }
}

export async function getPlan(userId: string): Promise<Plan> {
  const row = await db.query.users.findFirst({ where: eq(users.id, userId) });
  return (row?.plan ?? 'free') as Plan;
}

export function limitsFor(plan: Plan): PlanLimits {
  return PLAN_LIMITS[plan];
}

export async function getUsage(userId: string): Promise<Usage> {
  // Bot count
  const [botRow] = await db.select({ c: count() }).from(bots).where(eq(bots.userId, userId));

  // Document count + bytes (join through bots → user)
  const [docRow] = await db
    .select({
      c: count(documents.id),
      b: sql<number>`COALESCE(SUM(${documents.bytes}), 0)`,
    })
    .from(documents)
    .innerJoin(bots, eq(documents.botId, bots.id))
    .where(eq(bots.userId, userId));

  // Messages this month (UTC) — user role only (assistant replies are
  // generated, not user-driven; we meter what the user asked for).
  const startOfMonth = monthStartUtc();
  const [msgRow] = await db
    .select({ c: count(messages.id) })
    .from(messages)
    .innerJoin(conversations, eq(messages.conversationId, conversations.id))
    .innerJoin(bots, eq(conversations.botId, bots.id))
    .where(
      and(
        eq(bots.userId, userId),
        eq(messages.role, 'user'),
        gte(messages.createdAt, startOfMonth),
      ),
    );

  return {
    bots: Number(botRow.c),
    documents: Number(docRow.c),
    documentBytes: Number(docRow.b),
    messagesThisMonth: Number(msgRow.c),
  };
}

export async function assertCanCreateBot(userId: string): Promise<void> {
  const [plan, usage] = await Promise.all([getPlan(userId), getUsage(userId)]);
  const limits = PLAN_LIMITS[plan];
  if (usage.bots >= limits.bots) throw new QuotaExceededError('bots', limits.bots);
}

export async function assertCanIngestDocument(userId: string, addedBytes: number): Promise<void> {
  const [plan, usage] = await Promise.all([getPlan(userId), getUsage(userId)]);
  const limits = PLAN_LIMITS[plan];
  if (usage.documents >= limits.documents) {
    throw new QuotaExceededError('documents', limits.documents);
  }
  if (usage.documentBytes + addedBytes > limits.documentBytes) {
    throw new QuotaExceededError('documentBytes', limits.documentBytes);
  }
}

export async function assertCanSendMessage(userId: string): Promise<void> {
  const [plan, usage] = await Promise.all([getPlan(userId), getUsage(userId)]);
  const limits = PLAN_LIMITS[plan];
  if (usage.messagesThisMonth >= limits.messagesPerMonth) {
    throw new QuotaExceededError('messagesPerMonth', limits.messagesPerMonth);
  }
}

function monthStartUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}
