'use server';

import { AuthError } from 'next-auth';
import { z } from 'zod';

import { signIn } from '@/lib/auth';

const LoginInput = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
  callbackUrl: z.string().optional(),
});

export type LoginState = { status: 'idle' } | { status: 'error'; message: string };

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = LoginInput.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    callbackUrl: formData.get('callbackUrl') ?? undefined,
  });
  if (!parsed.success) {
    return { status: 'error', message: 'Enter a valid email and password.' };
  }

  try {
    await signIn('credentials', {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: parsed.data.callbackUrl || '/dashboard',
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { status: 'error', message: 'Invalid email or password.' };
    }
    throw error;
  }
  return { status: 'idle' };
}
