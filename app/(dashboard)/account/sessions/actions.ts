'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';

import { auth, signOut } from '@/lib/auth';
import {
  revokeAllSessionsExcept,
  revokeSession,
} from '@/lib/server/sessions';
import { requireAuth } from '@/lib/server/require-auth';

export async function revokeSessionAction(formData: FormData): Promise<void> {
  const user = await requireAuth();
  const session = await auth();
  const id = z.string().uuid().safeParse(formData.get('sessionId'));
  if (!id.success) return;

  // If they revoke their own current session, log them out properly so the
  // cookie also clears.
  if (session?.sid === id.data) {
    await signOut({ redirectTo: '/login' });
    return;
  }

  await revokeSession(user.id, id.data, await ctx());
  revalidatePath('/account/sessions');
}

export async function revokeAllOtherSessionsAction(): Promise<void> {
  const user = await requireAuth();
  const session = await auth();
  const except = session?.sid ?? null;
  await revokeAllSessionsExcept(user.id, except, await ctx());
  revalidatePath('/account/sessions');
}

async function ctx() {
  const h = await headers();
  return {
    ipAddress: (h.get('x-forwarded-for')?.split(',')[0].trim() ?? h.get('x-real-ip') ?? null) || null,
    userAgent: h.get('user-agent') ?? null,
  };
}
