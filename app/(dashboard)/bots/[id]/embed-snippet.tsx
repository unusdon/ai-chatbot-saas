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

  async function copy() {
    // navigator.clipboard is only available in secure contexts (HTTPS or
    // localhost). When accessed via LAN IP / plain HTTP it's undefined —
    // fall through to selecting the text and using the legacy execCommand
    // so the snippet is still copyable for self-hosters on internal networks.
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(snippet);
        toast.success('Snippet copied');
        return;
      }
    } catch {
      // fall through to legacy path
    }
    if (selectInto(ref.current) && document.execCommand('copy')) {
      toast.success('Snippet copied');
    } else {
      toast.error('Copy not allowed by browser — the snippet is selected; press ⌘C / Ctrl+C.');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Embed snippet</CardTitle>
        <CardDescription>
          Paste this into the {'<'}head{'>'} of any site. The widget injects a Shadow-DOM chat panel
          so it can&apos;t conflict with your CSS. End-users get a stable identity via cookie so their
          conversation persists across visits.
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

function selectInto(el: HTMLElement | null): boolean {
  if (!el) return false;
  const selection = window.getSelection();
  if (!selection) return false;
  const range = document.createRange();
  range.selectNodeContents(el);
  selection.removeAllRanges();
  selection.addRange(range);
  return true;
}
