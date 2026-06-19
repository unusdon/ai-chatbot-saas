/**
 * AI Chatbot SaaS embed widget.
 *
 * Loaded with: `<script src="…/widget.js" data-bot-key="bot_..." defer></script>`
 *
 * Everything renders inside a Shadow DOM so the host site's CSS can't bleed
 * in and our CSS can't escape. The bundle is intentionally framework-free —
 * adding React for a chat panel would 10x the file size and we want this to
 * load fast.
 */
import { styles } from './styles';

type Citation = {
  chunkId: string;
  score: number;
  documentTitle?: string;
  sourceUrl?: string | null;
};

type Message = {
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
};

type SSEEvent =
  | { type: 'token'; token: string }
  | { type: 'citations'; citations: Citation[] }
  | { type: 'done'; latencyMs: number }
  | { type: 'error'; message: string };

function getScriptTag(): HTMLScriptElement | null {
  const all = document.querySelectorAll<HTMLScriptElement>('script[data-bot-key]');
  return all[all.length - 1] ?? null;
}

function init() {
  const script = getScriptTag();
  if (!script) {
    console.warn('[ai-chatbot] could not find the loader <script data-bot-key="…">');
    return;
  }
  const botKey = script.dataset.botKey || '';
  if (!/^bot_[A-Za-z0-9_-]{32}$/.test(botKey)) {
    console.warn('[ai-chatbot] data-bot-key is missing or malformed');
    return;
  }

  const apiBase = script.dataset.apiBase || new URL(script.src).origin;
  const title = script.dataset.title || 'Ask the bot';
  const greeting = script.dataset.greeting || "Hi! Ask me anything about this site's content.";
  const accent = script.dataset.accent || '#111827';

  const host = document.createElement('div');
  host.setAttribute('data-aichatbot-widget', '');
  host.style.cssText = 'all: initial; position: fixed; bottom: 0; right: 0; z-index: 2147483647;';
  const shadow = host.attachShadow({ mode: 'closed' });

  const styleEl = document.createElement('style');
  styleEl.textContent = styles(accent);
  shadow.appendChild(styleEl);

  const root = document.createElement('div');
  root.className = 'ai-root';
  shadow.appendChild(root);
  document.body.appendChild(host);

  let open = false;
  const messages: Message[] = [];
  let streamingAssistant: Message | null = null;

  root.innerHTML = `
    <button class="ai-fab" aria-label="Open chat">
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
    </button>
    <section class="ai-panel" role="dialog" aria-label="${escapeHtml(title)}">
      <header class="ai-header">
        <strong>${escapeHtml(title)}</strong>
        <button class="ai-close" aria-label="Close">×</button>
      </header>
      <div class="ai-log" role="log" aria-live="polite"></div>
      <form class="ai-input">
        <input type="text" placeholder="Type a question…" autocomplete="off" required maxlength="2000" />
        <button type="submit" aria-label="Send">→</button>
      </form>
      <footer class="ai-footer">
        Powered by <a href="https://github.com/unusdon/ai-chatbot-saas" target="_blank" rel="noreferrer">AI Chatbot SaaS</a>
      </footer>
    </section>
  `;

  const fab = root.querySelector<HTMLButtonElement>('.ai-fab')!;
  const panel = root.querySelector<HTMLElement>('.ai-panel')!;
  const closeBtn = root.querySelector<HTMLButtonElement>('.ai-close')!;
  const log = root.querySelector<HTMLDivElement>('.ai-log')!;
  const form = root.querySelector<HTMLFormElement>('.ai-input')!;
  const input = form.querySelector<HTMLInputElement>('input')!;

  function render() {
    log.innerHTML = '';
    const renderList = streamingAssistant ? [...messages, streamingAssistant] : messages;
    if (renderList.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'ai-empty';
      empty.textContent = greeting;
      log.appendChild(empty);
    }
    for (const m of renderList) {
      const bubble = document.createElement('div');
      bubble.className = `ai-msg ai-msg-${m.role}`;
      const text = document.createElement('p');
      text.textContent = m.content || '…';
      bubble.appendChild(text);
      if (m.citations && m.citations.length) {
        const chips = document.createElement('div');
        chips.className = 'ai-chips';
        for (let i = 0; i < m.citations.length; i++) {
          const c = m.citations[i];
          const chip = c.sourceUrl ? document.createElement('a') : document.createElement('span');
          if (chip instanceof HTMLAnchorElement && c.sourceUrl) {
            chip.href = c.sourceUrl;
            chip.target = '_blank';
            chip.rel = 'noreferrer';
          }
          chip.className = 'ai-chip';
          chip.textContent = `[${i + 1}] ${c.documentTitle ?? 'source'}`;
          chips.appendChild(chip);
        }
        bubble.appendChild(chips);
      }
      log.appendChild(bubble);
    }
    log.scrollTop = log.scrollHeight;
  }

  function toggle(next: boolean) {
    open = next;
    panel.classList.toggle('ai-panel--open', open);
    fab.classList.toggle('ai-fab--hidden', open);
    if (open) {
      render();
      input.focus();
    }
  }

  fab.addEventListener('click', () => toggle(true));
  closeBtn.addEventListener('click', () => toggle(false));

  let pending = false;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || pending) return;
    input.value = '';
    pending = true;
    messages.push({ role: 'user', content: text });
    streamingAssistant = { role: 'assistant', content: '', citations: [] };
    render();

    try {
      const res = await fetch(`${apiBase}/api/widget/chat`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ bot_key: botKey, message: text }),
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error ?? `HTTP ${res.status}`);
      }
      await consumeSSE(res.body, (event) => {
        if (!streamingAssistant) return;
        if (event.type === 'token') {
          streamingAssistant.content += event.token;
          render();
        } else if (event.type === 'citations') {
          streamingAssistant.citations = event.citations;
          render();
        } else if (event.type === 'error') {
          throw new Error(event.message);
        }
      });
      if (streamingAssistant) messages.push(streamingAssistant);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Chat failed';
      messages.push({ role: 'assistant', content: `⚠️ ${message}` });
    } finally {
      streamingAssistant = null;
      pending = false;
      render();
    }
  });
}

async function consumeSSE(body: ReadableStream<Uint8Array>, onEvent: (event: SSEEvent) => void) {
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

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
