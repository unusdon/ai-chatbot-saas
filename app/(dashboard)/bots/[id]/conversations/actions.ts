'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import {
  bulkDeleteConversationsForUser,
  deleteConversationForUser,
  setConversationArchivedForUser,
  setConversationFlagForUser,
} from '@/lib/server/conversations';
import { requireAuth } from '@/lib/server/require-auth';

const IdInput = z.object({ conversationId: z.string().uuid() });

export async function deleteConversationAction(formData: FormData): Promise<void> {
  const user = await requireAuth();
  const botId = String(formData.get('botId') ?? '');
  const parsed = IdInput.safeParse({ conversationId: formData.get('conversationId') });
  if (!parsed.success) return;
  await deleteConversationForUser(user.id, parsed.data.conversationId);
  revalidatePath(`/bots/${botId}/conversations`);
  redirect(`/bots/${botId}/conversations`);
}

const BulkInput = z.object({
  botId: z.string().uuid(),
  conversationIds: z.array(z.string().uuid()).min(1).max(200),
});

export async function bulkDeleteConversationsAction(input: {
  botId: string;
  conversationIds: string[];
}): Promise<{ deleted: number }> {
  const user = await requireAuth();
  const parsed = BulkInput.safeParse(input);
  if (!parsed.success) return { deleted: 0 };
  const deleted = await bulkDeleteConversationsForUser(user.id, parsed.data.conversationIds);
  revalidatePath(`/bots/${parsed.data.botId}/conversations`);
  return { deleted };
}

const FlagInput = z.object({
  conversationId: z.string().uuid(),
  flag: z.enum(['review', 'abuse', 'star', 'spam']).nullable(),
});

export async function setConversationFlagAction(input: {
  conversationId: string;
  flag: 'review' | 'abuse' | 'star' | 'spam' | null;
  botId: string;
}): Promise<void> {
  const user = await requireAuth();
  const parsed = FlagInput.safeParse({
    conversationId: input.conversationId,
    flag: input.flag,
  });
  if (!parsed.success) return;
  await setConversationFlagForUser(user.id, parsed.data.conversationId, parsed.data.flag);
  revalidatePath(`/bots/${input.botId}/conversations`);
  revalidatePath(`/bots/${input.botId}/conversations/${input.conversationId}`);
}

const ArchiveInput = z.object({
  conversationId: z.string().uuid(),
  archived: z.boolean(),
});

export async function setConversationArchivedAction(input: {
  conversationId: string;
  archived: boolean;
  botId: string;
}): Promise<void> {
  const user = await requireAuth();
  const parsed = ArchiveInput.safeParse({
    conversationId: input.conversationId,
    archived: input.archived,
  });
  if (!parsed.success) return;
  await setConversationArchivedForUser(user.id, parsed.data.conversationId, parsed.data.archived);
  revalidatePath(`/bots/${input.botId}/conversations`);
}
