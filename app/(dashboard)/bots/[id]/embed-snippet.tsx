'use client';

import { Copy, RefreshCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { regeneratePublicKeyAction } from '../actions';

export function EmbedSnippet({ botId, publicKey }: { botId: string; publicKey: string }) {
  const [origin, setOrigin] = useState('');
  useEffect(() => {
    if (typeof window !== 'undefined') setOrigin(window.location.origin);
  }, []);

  const snippet = `<script src="${origin || 'https://your-app.com'}/widget.js" data-bot-key="${publicKey}" defer></script>`;
  const ref = useRef<HTMLPreElement>(null);

  function copy() {
    navigator.clipboard.writeText(snippet).then(
      () => toast.success('Snippet copied'),
      () => toast.error('Copy failed — select the text and copy manually'),
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Embed snippet</CardTitle>
        <CardDescription>
          Paste this into the {'<'}head{'>'} of any site to render the chat widget. The widget ships in
          Milestone 4 — your public key is reserved now so links you paste today keep working.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <pre
          ref={ref}
          className="overflow-x-auto rounded-md border bg-muted px-4 py-3 text-xs leading-relaxed"
        >
          <code>{snippet}</code>
        </pre>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={copy}>
            <Copy className="mr-2 h-4 w-4" /> Copy snippet
          </Button>
          <form action={regeneratePublicKeyAction}>
            <input type="hidden" name="id" value={botId} />
            <Button type="submit" variant="ghost" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" /> Regenerate key
            </Button>
          </form>
        </div>
        <p className="text-xs text-muted-foreground">
          Regenerating the key immediately invalidates the old snippet on every site it&apos;s embedded
          in.
        </p>
      </CardContent>
    </Card>
  );
}
