'use server';

import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { db } from '@/db';
import { users } from '@/db/schema';
import { signOut } from '@/lib/auth';
import { auth } from '@/lib/auth';
import {
  recordSecurityEvent,
  revokeAllSessionsExcept,
} from '@/lib/server/sessions';
import { requireAuth } from '@/lib/server/require-auth';

export type ActionState =
  | { status: 'idle' }
  | { status: 'error'; message: string; field?: string }
  | { status: 'ok'; message: string };

// --- Profile (name) --------------------------------------------------------

const ProfileInput = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
});

export async function updateProfileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireAuth();
  const parsed = ProfileInput.safeParse({ name: formData.get('name') });
  if (!parsed.success) {
    return { status: 'error', message: parsed.error.errors[0].message, field: 'name' };
  }
  await db.update(users).set({ name: parsed.data.name }).where(eq(users.id, user.id));
  await recordSecurityEvent(user.id, 'profile_changed', await ctx(), { fields: ['name'] });
  revalidatePath('/account/profile');
  return { status: 'ok', message: 'Profile saved' };
}

// --- Email change ----------------------------------------------------------

const EmailInput = z.object({
  email: z.string().trim().toLowerCase().email(),
  currentPassword: z.string().min(1, 'Current password is required'),
});

export async function updateEmailAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireAuth();
  const parsed = EmailInput.safeParse({
    email: formData.get('email'),
    currentPassword: formData.get('currentPassword'),
  });
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    return { status: 'error', message: first.message, field: first.path[0] as string };
  }

  const row = await db.query.users.findFirst({ where: eq(users.id, user.id) });
  if (!row?.hashedPassword) {
    return { status: 'error', message: 'Set a password before changing your email.' };
  }
  if (!(await bcrypt.compare(parsed.data.currentPassword, row.hashedPassword))) {
    return { status: 'error', message: 'Current password is incorrect.', field: 'currentPassword' };
  }
  if (parsed.data.email === row.email) {
    return { status: 'error', message: 'New email is the same as the current one.', field: 'email' };
  }

  const existing = await db.query.users.findFirst({ where: eq(users.email, parsed.data.email) });
  if (existing && existing.id !== user.id) {
    return { status: 'error', message: 'An account with that email already exists.', field: 'email' };
  }

  await db.update(users).set({ email: parsed.data.email }).where(eq(users.id, user.id));
  await recordSecurityEvent(user.id, 'email_changed', await ctx(), {
    previous: row.email,
    next: parsed.data.email,
  });
  revalidatePath('/account/profile');
  return { status: 'ok', message: 'Email updated' };
}

// --- Password change -------------------------------------------------------

const PasswordInput = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters').max(128),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'New passwords do not match',
    path: ['confirmPassword'],
  });

export async function changePasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireAuth();
  const session = await auth();
  const parsed = PasswordInput.safeParse({
    currentPassword: formData.get('currentPassword'),
    newPassword: formData.get('newPassword'),
    confirmPassword: formData.get('confirmPassword'),
  });
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    return { status: 'error', message: first.message, field: first.path[0] as string };
  }

  const row = await db.query.users.findFirst({ where: eq(users.id, user.id) });
  if (!row?.hashedPassword) {
    return { status: 'error', message: 'No password is set — sign in with Google instead.' };
  }
  if (!(await bcrypt.compare(parsed.data.currentPassword, row.hashedPassword))) {
    return { status: 'error', message: 'Current password is incorrect.', field: 'currentPassword' };
  }
  if (parsed.data.newPassword === parsed.data.currentPassword) {
    return { status: 'error', message: 'New password must differ from the current one.', field: 'newPassword' };
  }

  const hashed = await bcrypt.hash(parsed.data.newPassword, 12);
  await db.update(users).set({ hashedPassword: hashed }).where(eq(users.id, user.id));

  const context = await ctx();
  await recordSecurityEvent(user.id, 'password_changed', context);

  // Sign every OTHER session out — keep this one alive so the user
  // doesn't lose their tab.
  await revokeAllSessionsExcept(user.id, session?.sid ?? null, context);

  revalidatePath('/account/profile');
  revalidatePath('/account/sessions');
  return { status: 'ok', message: 'Password changed. Other sessions signed out.' };
}

// --- Account deletion ------------------------------------------------------

const DeleteInput = z.object({
  confirm: z.literal('delete my account'),
  currentPassword: z.string().min(1).optional(),
});

export async function deleteAccountAction(formData: FormData): Promise<ActionState | void> {
  const user = await requireAuth();
  const parsed = DeleteInput.safeParse({
    confirm: formData.get('confirm'),
    currentPassword: formData.get('currentPassword') ?? undefined,
  });
  if (!parsed.success) {
    return { status: 'error', message: 'Type the confirmation phrase exactly to delete.' };
  }
  const row = await db.query.users.findFirst({ where: eq(users.id, user.id) });
  if (row?.hashedPassword) {
    if (!parsed.data.currentPassword) {
      return { status: 'error', message: 'Enter your current password.', field: 'currentPassword' };
    }
    if (!(await bcrypt.compare(parsed.data.currentPassword, row.hashedPassword))) {
      return { status: 'error', message: 'Password is incorrect.', field: 'currentPassword' };
    }
  }

  await recordSecurityEvent(user.id, 'account_deleted', await ctx(), { email: row?.email });
  await db.delete(users).where(eq(users.id, user.id));
  await signOut({ redirect: false });
  redirect('/');
}

// --- helpers ---------------------------------------------------------------

async function ctx() {
  const h = await headers();
  return {
    ipAddress:
      (h.get('x-forwarded-for')?.split(',')[0].trim() ?? h.get('x-real-ip') ?? null) || null,
    userAgent: h.get('user-agent') ?? null,
  };
}
