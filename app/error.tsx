'use client';

import { AlertTriangle, ArrowLeft, RotateCw } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[global error]', error);
  }, [error]);

  return (
    <main className="relative isolate flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-6 text-center">
      <div aria-hidden className="bg-grid absolute inset-0 -z-10 opacity-60" />
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border bg-card shadow-soft">
        <AlertTriangle className="h-5 w-5 text-amber-500" />
      </span>
      <h1 className="mt-6 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
        Something went wrong.
      </h1>
      <p className="mt-4 max-w-md text-pretty text-muted-foreground">
        {error.message || 'An unexpected error broke this page. Try again — it may have been a hiccup.'}
      </p>
      {error.digest ? (
        <p className="mt-2 font-mono text-xs text-muted-foreground">digest: {error.digest}</p>
      ) : null}
      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Button onClick={reset} size="lg">
          <RotateCw className="h-4 w-4" /> Try again
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" /> Back home
          </Link>
        </Button>
      </div>
    </main>
  );
}
