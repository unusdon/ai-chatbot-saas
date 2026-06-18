'use server';

import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/db';
import { users } from '@/db/schema';
import { signIn } from '@/lib/auth';

const SignupInput = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long'),
});

export type SignupState =
  | { status: 'idle' }
  | { status: 'error'; message: string; field?: 'name' | 'email' | 'password' };

export async function signupAction(_prev: SignupState, formData: FormData): Promise<SignupState> {
  const parsed = SignupInput.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    const first = parsed.error.errors[0];
    return {
      status: 'error',
      message: first.message,
      field: first.path[0] as 'name' | 'email' | 'password',
    };
  }

  const { name, email, password } = parsed.data;

  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) {
    return { status: 'error', message: 'An account with this email already exists.', field: 'email' };
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  await db.insert(users).values({ name, email, hashedPassword });

  await signIn('credentials', { email, password, redirectTo: '/dashboard' });
  return { status: 'idle' };
}
