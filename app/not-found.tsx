import { ArrowLeft, MessageSquare } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

export const metadata = { title: 'Page not found' };

export default function NotFound() {
  return (
    <main className="relative isolate flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-6 text-center">
      <div aria-hidden className="bg-grid absolute inset-0 -z-10 opacity-60" />
      <div aria-hidden className="bg-spotlight absolute inset-0 -z-10" />
      <p className="font-mono text-sm font-medium text-brand">404</p>
      <h1 className="mt-4 text-balance text-3xl font-bold tracking-tight sm:text-5xl">
        We couldn&apos;t find that page.
      </h1>
      <p className="mt-4 max-w-md text-pretty text-muted-foreground">
        The route doesn&apos;t exist (or your bot deleted it — we&apos;ll never know).
      </p>
      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" /> Back home
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/dashboard">
            <MessageSquare className="h-4 w-4" /> Go to dashboard
          </Link>
        </Button>
      </div>
    </main>
  );
}
