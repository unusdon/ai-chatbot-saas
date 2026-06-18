'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { createBot, deleteBot, regeneratePublicKey, updateBot } from '@/lib/server/bots';
import { requireAuth } from '@/lib/server/require-auth';

const BotInput = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120, 'Name is too long'),
  systemPrompt: z
    .string()
    .trim()
    .max(8000, 'System prompt is too long (max 8000 characters)')
    .optional()
    .or(z.literal('')),
});

export type BotActionState =
  | { status: 'idle' }
  | { status: 'error'; message: string; field?: 'name' | 'systemPrompt' }
  | { status: 'ok'; message: string };

const ID = z.string().uuid('Invalid bot id');

export async function createBotAction(_prev: BotActionState, formData: FormData): Promise<BotActionState> {
  const user = await requireAuth();
  const parsed = BotInput.safeParse({
    name: formData.get('name'),
    systemPrompt: formData.get('systemPrompt') ?? '',
  });
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    return { status: 'error', message: first.message, field: first.path[0] as 'name' | 'systemPrompt' };
  }
  const bot = await createBot({
    userId: user.id,
    name: parsed.data.name,
    systemPrompt: parsed.data.systemPrompt || undefined,
  });
  revalidatePath('/bots');
  redirect(`/bots/${bot.id}`);
}

export async function updateBotAction(_prev: BotActionState, formData: FormData): Promise<BotActionState> {
  const user = await requireAuth();
  const idResult = ID.safeParse(formData.get('id'));
  if (!idResult.success) return { status: 'error', message: 'Invalid bot id' };

  const parsed = BotInput.safeParse({
    name: formData.get('name'),
    systemPrompt: formData.get('systemPrompt') ?? '',
  });
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    return { status: 'error', message: first.message, field: first.path[0] as 'name' | 'systemPrompt' };
  }

  const updated = await updateBot({
    userId: user.id,
    botId: idResult.data,
    name: parsed.data.name,
    systemPrompt: parsed.data.systemPrompt || undefined,
  });
  if (!updated) return { status: 'error', message: 'Bot not found' };

  revalidatePath('/bots');
  revalidatePath(`/bots/${updated.id}`);
  return { status: 'ok', message: 'Saved' };
}

export async function deleteBotAction(formData: FormData): Promise<void> {
  const user = await requireAuth();
  const idResult = ID.safeParse(formData.get('id'));
  if (!idResult.success) return;
  await deleteBot(user.id, idResult.data);
  revalidatePath('/bots');
  redirect('/bots');
}

export async function regeneratePublicKeyAction(formData: FormData): Promise<void> {
  const user = await requireAuth();
  const idResult = ID.safeParse(formData.get('id'));
  if (!idResult.success) return;
  const bot = await regeneratePublicKey(user.id, idResult.data);
  if (bot) revalidatePath(`/bots/${bot.id}`);
}
