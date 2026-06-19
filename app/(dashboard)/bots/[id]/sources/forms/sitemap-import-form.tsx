'use client';

import { Loader2, MapPinned } from 'lucide-react';
import { useActionState, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { importSitemapAction, type DocumentActionState } from '../../documents/actions';

const INITIAL: DocumentActionState = { status: 'idle' };

export function SitemapImportForm({ botId }: { botId: string }) {
  const [state, formAction] = useActionState(importSitemapAction, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === 'ok') {
      toast.success(state.message);
      formRef.current?.reset();
    }
    if (state.status === 'error' && !state.field) toast.error(state.message);
  }, [state]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MapPinned className="h-4 w-4" /> Sitemap crawl
        </CardTitle>
        <CardDescription>
          Paste a <code className="font-mono text-xs">sitemap.xml</code> URL and we&apos;ll enqueue every
          page in it. Capped at 200 URLs per import to keep things sane.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={formAction} className="space-y-4">
          <input type="hidden" name="botId" value={botId} />
          <div className="space-y-1.5">
            <Label htmlFor="sitemapUrl">Sitemap URL</Label>
            <Input
              id="sitemapUrl"
              name="sitemapUrl"
              type="url"
              placeholder="https://docs.example.com/sitemap.xml"
              required
              aria-invalid={state.status === 'error' && state.field === 'sitemapUrl'}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="maxUrls">Max URLs to import</Label>
            <Input
              id="maxUrls"
              name="maxUrls"
              type="number"
              min={1}
              max={200}
              defaultValue={50}
              className="max-w-[200px]"
            />
            <p className="text-xs text-muted-foreground">
              Each URL becomes its own source and is queued for the worker.
            </p>
          </div>
          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPinned className="h-4 w-4" />}
      {pending ? 'Importing…' : 'Import sitemap'}
    </Button>
  );
}
