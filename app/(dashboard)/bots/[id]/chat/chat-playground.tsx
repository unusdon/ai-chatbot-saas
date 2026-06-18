'use client';

import { Send, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

import { clearConversationAction } from './actions';

type Citation = { chunkId: string; score: number; documentTitle?: string; sourceUrl?: string | null };

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  streaming?: boolean;
};

type InitialMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations: Array<{ chunkId: string; score: number }>;
};

export function ChatPlayground({
  botId,
  initialMessages,
}: {
  botId: string;
  initialMessages: InitialMessage[];
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || pending) return;
    setInput('');
    setPending(true);

    const userMsg: Message = { id: tmpId(), role: 'user', content: text };
    const assistantId = tmpId();
    setMessages((prev) => [...prev, userMsg, { id: assistantId, role: 'assistant', content: '', streaming: true }]);

    try {
      const res = await fetch(`/api/bots/${botId}/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error ?? `HTTP ${res.status}`);
      }
      await consumeSSE(res.body, (event) => {
        if (event.type === 'token') {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: m.content + event.token } : m,
            ),
          );
        } else if (event.type === 'citations') {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, citations: event.citations } : m)),
          );
        } else if (event.type === 'error') {
          throw new Error(event.message);
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Chat failed';
      toast.error(message);
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, content: `⚠️ ${message}` } : m)),
      );
    } finally {
      setMessages((prev) => prev.map((m) => (m.streaming ? { ...m, streaming: false } : m)));
      setPending(false);
    }
  }

  return (
    <div className="flex h-[600px] flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6">
        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((m) => (
              <Bubble key={m.id} message={m} />
            ))}
          </div>
        )}
      </div>
      <div className="border-t p-4">
        <form onSubmit={send} className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            placeholder="Ask anything about this bot's sources…"
            rows={1}
            className="min-h-[44px] resize-none"
            disabled={pending}
          />
          <Button type="submit" disabled={pending || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
          <form action={clearConversationAction}>
            <input type="hidden" name="botId" value={botId} />
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              title="Clear conversation"
              aria-label="Clear conversation"
              onClick={() => setMessages([])}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </form>
        </form>
      </div>
    </div>
  );
}

function Bubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-2xl rounded-lg px-4 py-3 text-sm ${
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
        }`}
      >
        <p className="whitespace-pre-wrap leading-relaxed">
          {message.content || (message.streaming ? '…' : '')}
        </p>
        {message.citations && message.citations.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {message.citations.map((c, i) => (
              <CitationChip key={c.chunkId} index={i + 1} citation={c} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function CitationChip({ index, citation }: { index: number; citation: Citation }) {
  const label = `[${index}] ${citation.documentTitle ?? 'source'}`;
  const inner = (
    <Badge variant="outline" className="cursor-pointer text-[10px]" title={`Similarity ${(citation.score * 100).toFixed(0)}%`}>
      {label}
    </Badge>
  );
  return citation.sourceUrl ? (
    <a href={citation.sourceUrl} target="_blank" rel="noreferrer">
      {inner}
    </a>
  ) : (
    inner
  );
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center text-sm text-muted-foreground">
      <p className="max-w-md">
        Ask a question your bot should be able to answer from the sources you uploaded. Use this
        playground to sanity-check responses before embedding the widget.
      </p>
    </div>
  );
}

async function consumeSSE(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: SSEEvent) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf('\n\n')) >= 0) {
      const chunk = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const line = chunk.startsWith('data: ') ? chunk.slice(6) : chunk;
      if (!line.trim()) continue;
      try {
        onEvent(JSON.parse(line) as SSEEvent);
      } catch {
        // ignore malformed chunk
      }
    }
  }
}

type SSEEvent =
  | { type: 'token'; token: string }
  | { type: 'citations'; citations: Citation[] }
  | { type: 'done'; latencyMs: number }
  | { type: 'error'; message: string };

function tmpId(): string {
  return Math.random().toString(36).slice(2);
}
