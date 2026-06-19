import Link from 'next/link';

import { LoginForm } from './login-form';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Log in',
  description: 'Sign in to your AI Chatbot SaaS account.',
  alternates: { canonical: '/login' },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center sm:text-left">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Sign in to manage your chatbots.</p>
      </div>
      <LoginForm callbackUrl={params.callbackUrl} />
      <div className="flex items-center justify-between text-sm">
        <Link
          href="/forgot-password"
          className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Forgot password?
        </Link>
        <Link
          href="/signup"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Create an account
        </Link>
      </div>
    </div>
  );
}
