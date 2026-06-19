import { ArrowLeft, Mail } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Forgot password',
  description: 'Recover access to your AI Chatbot SaaS account.',
  alternates: { canonical: '/forgot-password' },
};

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center sm:text-left">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Forgot your password?</h1>
        <p className="text-sm text-muted-foreground">
          Self-serve password reset ships in M2. For now, email support and we&apos;ll help.
        </p>
      </div>
      <div className="rounded-lg border bg-card p-6 shadow-soft">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <Mail className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-medium">Email recovery</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Send a note from your account email to{' '}
              <a href="mailto:support@cyberunite.com" className="font-medium text-foreground underline-offset-4 hover:underline">
                support@cyberunite.com
              </a>{' '}
              and we&apos;ll reset your password within one business day.
            </p>
          </div>
        </div>
      </div>
      <Button asChild variant="ghost" className="w-full sm:w-auto">
        <Link href="/login">
          <ArrowLeft className="h-4 w-4" /> Back to log in
        </Link>
      </Button>
    </div>
  );
}
