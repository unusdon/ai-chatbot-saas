'use client';

import { Bot as BotIcon, ExternalLink, MessageSquare, Send, Sparkles, Trash2, User } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
            prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + event.token } : m)),
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
      textareaRef.current?.focus();
    }
  }

  return (
    <div className="flex h-[calc(100vh-220px)] min-h-[480px] flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        {messages.length === 0 ? (
          <EmptyState onPrompt={(p) => { setInput(p); textareaRef.current?.focus(); }} />
        ) : (
          <div className="space-y-5">
            {messages.map((m) => (
              <Bubble key={m.id} message={m} />
            ))}
          </div>
        )}
      </div>
      <div className="border-t bg-card">
        <form onSubmit={send} className="flex items-end gap-2 p-3 sm:p-4">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            placeholder="Ask anything about this bot's sources…  (Enter to send · Shift+Enter for newline)"
            rows={1}
            className="min-h-[44px] resize-none"
            disabled={pending}
          />
          <Button type="submit" size="icon" disabled={pending || !input.trim()} aria-label="Send">
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
              className="text-muted-foreground hover:text-destructive"
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
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser ? (
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
          <BotIcon className="h-4 w-4" />
        </span>
      ) : null}
      <div className={`max-w-[85%] sm:max-w-2xl`}>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? 'rounded-br-sm bg-primary text-primary-foreground'
              : 'rounded-bl-sm border bg-card'
          }`}
        >
          <p className="whitespace-pre-wrap">
            {message.content || (message.streaming ? <ThinkingDots /> : '')}
          </p>
        </div>
        {message.citations && message.citations.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {message.citations.map((c, i) => (
              <CitationChip key={c.chunkId} index={i + 1} citation={c} />
            ))}
          </div>
        ) : null}
      </div>
      {isUser ? (
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
          <User className="h-4 w-4" />
        </span>
      ) : null}
    </div>
  );
}

function CitationChip({ index, citation }: { index: number; citation: Citation }) {
  const label = `${index}. ${citation.documentTitle ?? 'source'}`;
  const inner = (
    <span
      className="inline-flex items-center gap-1 rounded-full border bg-card px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      title={`Similarity ${(citation.score * 100).toFixed(0)}%`}
    >
      {label}
      {citation.sourceUrl ? <ExternalLink className="h-2.5 w-2.5" /> : null}
    </span>
  );
  return citation.sourceUrl ? (
    <a href={citation.sourceUrl} target="_blank" rel="noreferrer">
      {inner}
    </a>
  ) : (
    inner
  );
}

function ThinkingDots() {
  return (
    <span className="inline-flex gap-1">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground" style={{ animationDelay: '0ms' }} />
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground" style={{ animationDelay: '150ms' }} />
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground" style={{ animationDelay: '300ms' }} />
    </span>
  );
}

function EmptyState({ onPrompt }: { onPrompt: (p: string) => void }) {
  const prompts = [
    'What does this bot know about?',
    'Summarize the most recent uploaded document.',
    'What can\'t you answer yet?',
  ];
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full border bg-card text-muted-foreground shadow-soft">
        <MessageSquare className="h-5 w-5" />
      </span>
      <h3 className="mt-4 text-base font-semibold">Ask your first question</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
        Try one of these to sanity-check your sources before embedding the widget.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {prompts.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPrompt(p)}
            className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs text-muted-foreground shadow-soft transition-colors hover:bg-accent hover:text-foreground"
          >
            <Sparkles className="h-3 w-3" /> {p}
          </button>
        ))}
      </div>
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
        /* ignore malformed chunk */
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
