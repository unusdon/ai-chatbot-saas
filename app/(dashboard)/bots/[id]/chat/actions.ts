'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { clearConversation } from '@/lib/server/conversations';
import { requireAuth } from '@/lib/server/require-auth';

const Input = z.object({ botId: z.string().uuid() });

export async function clearConversationAction(formData: FormData): Promise<void> {
  const user = await requireAuth();
  const parsed = Input.safeParse({ botId: formData.get('botId') });
  if (!parsed.success) return;
  await clearConversation(user.id, parsed.data.botId);
  revalidatePath(`/bots/${parsed.data.botId}/chat`);
}
