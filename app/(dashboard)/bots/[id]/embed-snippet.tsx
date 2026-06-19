'use client';

import { Code2, Copy, RefreshCw } from 'lucide-react';
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
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(snippet);
        toast.success('Snippet copied');
        return;
      }
    } catch {
      /* fall through */
    }
    if (selectInto(ref.current) && document.execCommand('copy')) {
      toast.success('Snippet copied');
    } else {
      toast.error('Copy not allowed — the snippet is selected; press ⌘C / Ctrl+C.');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Embed snippet</CardTitle>
        <CardDescription>
          Paste this into the <code className="font-mono text-xs">&lt;head&gt;</code> of any site. The
          widget injects a Shadow-DOM chat panel so it can&apos;t conflict with your CSS.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative overflow-hidden rounded-lg border bg-surface-2">
          <div className="flex items-center justify-between border-b bg-card/50 px-4 py-2">
            <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Code2 className="h-3.5 w-3.5" /> HTML
            </span>
            <Button type="button" variant="ghost" size="sm" onClick={copy} className="h-7 px-2 text-xs">
              <Copy className="h-3.5 w-3.5" /> Copy
            </Button>
          </div>
          <pre ref={ref} className="overflow-x-auto p-4 font-mono text-xs leading-relaxed">
            <code>{snippet}</code>
          </pre>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Regenerating the key immediately invalidates the snippet on every site it&apos;s embedded
            in.
          </p>
          <form action={regeneratePublicKeyAction}>
            <input type="hidden" name="id" value={botId} />
            <Button type="submit" variant="outline" size="sm">
              <RefreshCw className="h-4 w-4" /> Regenerate key
            </Button>
          </form>
        </div>
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
