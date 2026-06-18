/**
 * Bot data access layer. All functions take a `userId` and enforce
 * ownership in the WHERE clause — there is no "as admin" mode in M2A.
 *
 * Multi-tenant isolation lives here. Server actions and pages MUST call
 * these helpers rather than reaching into Drizzle directly.
 */
import { and, desc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { bots, type Bot } from '@/db/schema';
import { generatePublicKey } from '@/lib/keys';

export async function listBotsForUser(userId: string): Promise<Bot[]> {
  return db.select().from(bots).where(eq(bots.userId, userId)).orderBy(desc(bots.createdAt));
}

export async function getBotForUser(userId: string, botId: string): Promise<Bot | null> {
  const rows = await db
    .select()
    .from(bots)
    .where(and(eq(bots.id, botId), eq(bots.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export type CreateBotInput = {
  userId: string;
  name: string;
  systemPrompt?: string;
};

export async function createBot(input: CreateBotInput): Promise<Bot> {
  const [row] = await db
    .insert(bots)
    .values({
      userId: input.userId,
      name: input.name,
      systemPrompt: input.systemPrompt && input.systemPrompt.trim().length > 0
        ? input.systemPrompt.trim()
        : undefined,
      publicKey: generatePublicKey(),
    })
    .returning();
  return row;
}

export type UpdateBotInput = {
  userId: string;
  botId: string;
  name?: string;
  systemPrompt?: string;
  isActive?: boolean;
};

export async function updateBot(input: UpdateBotInput): Promise<Bot | null> {
  const patch: Partial<typeof bots.$inferInsert> = { updatedAt: new Date() };
  if (input.name !== undefined) patch.name = input.name;
  if (input.systemPrompt !== undefined) patch.systemPrompt = input.systemPrompt;
  if (input.isActive !== undefined) patch.isActive = input.isActive;

  const [row] = await db
    .update(bots)
    .set(patch)
    .where(and(eq(bots.id, input.botId), eq(bots.userId, input.userId)))
    .returning();
  return row ?? null;
}

export async function deleteBot(userId: string, botId: string): Promise<boolean> {
  const [row] = await db
    .delete(bots)
    .where(and(eq(bots.id, botId), eq(bots.userId, userId)))
    .returning({ id: bots.id });
  return Boolean(row);
}

export async function regeneratePublicKey(userId: string, botId: string): Promise<Bot | null> {
  const [row] = await db
    .update(bots)
    .set({ publicKey: generatePublicKey(), updatedAt: new Date() })
    .where(and(eq(bots.id, botId), eq(bots.userId, userId)))
    .returning();
  return row ?? null;
}
