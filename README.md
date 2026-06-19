<div align="center">

# 🤖 AI Chatbot SaaS

### Open-source multi-tenant RAG chatbot platform — train AI on your content, deploy across web + Telegram + WhatsApp

[![CI](https://img.shields.io/github/actions/workflow/status/unusdon/ai-chatbot-saas/ci.yml?branch=main&label=CI&logo=github&style=flat-square)](https://github.com/unusdon/ai-chatbot-saas/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg?style=flat-square)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/unusdon/ai-chatbot-saas?style=flat-square&logo=github&color=yellow)](https://github.com/unusdon/ai-chatbot-saas/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/unusdon/ai-chatbot-saas?style=flat-square&logo=github&color=blue)](https://github.com/unusdon/ai-chatbot-saas/network/members)
[![GitHub issues](https://img.shields.io/github/issues/unusdon/ai-chatbot-saas?style=flat-square&logo=github&color=red)](https://github.com/unusdon/ai-chatbot-saas/issues)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](CONTRIBUTING.md)
[![Made with TypeScript](https://img.shields.io/badge/Made%20with-TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

<br/>

<p>
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js">
  <img alt="React" src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=white">
  <img alt="Postgres" src="https://img.shields.io/badge/Postgres-16-4169E1?style=flat-square&logo=postgresql&logoColor=white">
  <img alt="pgvector" src="https://img.shields.io/badge/pgvector-HNSW-336791?style=flat-square">
  <img alt="Auth.js" src="https://img.shields.io/badge/Auth.js-v5-4F46E5?style=flat-square">
  <img alt="Drizzle" src="https://img.shields.io/badge/Drizzle-ORM-C5F74F?style=flat-square">
  <img alt="Tailwind" src="https://img.shields.io/badge/Tailwind-CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white">
  <img alt="shadcn/ui" src="https://img.shields.io/badge/shadcn%2Fui-black?style=flat-square">
  <img alt="BullMQ" src="https://img.shields.io/badge/BullMQ-Redis-DC382D?style=flat-square&logo=redis&logoColor=white">
  <img alt="Stripe" src="https://img.shields.io/badge/Stripe-billing-635BFF?style=flat-square&logo=stripe&logoColor=white">
</p>

<p>
  <strong>LLM providers:</strong><br/>
  <img alt="OpenAI" src="https://img.shields.io/badge/OpenAI-supported-412991?style=flat-square&logo=openai">
  <img alt="Anthropic Claude" src="https://img.shields.io/badge/Claude-supported-D97757?style=flat-square">
  <img alt="Google Gemini" src="https://img.shields.io/badge/Gemini-supported-4285F4?style=flat-square&logo=google">
  <img alt="Deepseek" src="https://img.shields.io/badge/Deepseek-supported-0F172A?style=flat-square">
  <img alt="Ollama" src="https://img.shields.io/badge/Ollama-local%20%26%20free-FF5722?style=flat-square">
</p>

<p>
  <strong>Channels:</strong><br/>
  <img alt="Web widget" src="https://img.shields.io/badge/Web%20widget-3.2%20KB%20gzipped-0EA5E9?style=flat-square">
  <img alt="Telegram" src="https://img.shields.io/badge/Telegram-private%20%2B%20groups-26A5E4?style=flat-square&logo=telegram&logoColor=white">
  <img alt="WhatsApp" src="https://img.shields.io/badge/WhatsApp-Cloud%20API-25D366?style=flat-square&logo=whatsapp&logoColor=white">
</p>

<br/>

[**Live demo**](https://chat.cyberunite.com) · [**Documentation**](DEPLOY.md) · [**Report a bug**](https://github.com/unusdon/ai-chatbot-saas/issues/new?template=bug_report.yml) · [**Request a feature**](https://github.com/unusdon/ai-chatbot-saas/issues/new?template=feature_request.yml) · [**Discussions**](https://github.com/unusdon/ai-chatbot-saas/discussions)

</div>

<br/>

> **The shortest path from "we have docs" to "we have an AI support bot on every channel."**
> Sign up → upload PDFs/URLs → embed the widget on your site OR add a Telegram/WhatsApp bot → done.

<div align="center">
  <br/>
  <em>📸 Demo screenshots — drop in your own once deployed</em>
  <br/><br/>
  <table>
    <tr>
      <td align="center" width="33%">
        <strong>Marketing landing</strong><br/>
        <sub>SEO-tuned, JSON-LD, OG image, light/dark, mobile-first</sub>
      </td>
      <td align="center" width="33%">
        <strong>Dashboard</strong><br/>
        <sub>Sidebar nav, bot list, sources, analytics, conversations, channels</sub>
      </td>
      <td align="center" width="33%">
        <strong>Embed widget</strong><br/>
        <sub>Shadow DOM, streaming SSE, citation chips, 3.2 KB gzipped</sub>
      </td>
    </tr>
  </table>
  <br/>
</div>

---

## 📑 Table of contents

- [✨ Highlights](#-highlights)
- [🧠 What ships today](#-what-ships-today)
- [🛠 Tech stack](#-tech-stack)
- [🚀 Quick start (5 minutes)](#-quick-start-5-minutes)
- [📨 Channels — Web, Telegram, WhatsApp](#-channels--web-telegram-whatsapp)
- [🗄 Database schema](#-database-schema)
- [⚙️ Configuration](#️-configuration)
- [🔒 Security](#-security)
- [📦 Deploy to production](#-deploy-to-production)
- [🤝 Contributing](#-contributing)
- [💛 Sponsors](#-sponsors)
- [📜 License](#-license)

---

## ✨ Highlights

> Everything below is **shipped, tested, deployable today** — not a roadmap.

| | Feature |
|--|--|
| 🧠 | **5 LLM providers** — OpenAI · Claude · Gemini · Deepseek · Ollama (set with one env var) |
| 📚 | **9 source types** — PDF · DOCX · XLSX · JSON · Markdown · TXT · URLs · sitemap.xml crawl · Q&A pairs |
| 🌐 | **3 channels** — Embed widget (3.2 KB Shadow-DOM) · Telegram (private + groups) · WhatsApp Cloud API |
| 💬 | **Conversation admin** — search, filter, flag, bulk delete, JSON export across every channel |
| 🎓 | **Promote-to-training** — one click turns any good customer Q&A into a permanent training source |
| 🔐 | **Multi-tenant isolation** — server-side enforced, adversarially tested |
| 🪪 | **Admin session security** — per-device login list, revoke, audit log, password-change cascade |
| 📊 | **Per-bot analytics** — top questions + content gaps + 14-day chart |
| 💳 | **Stripe billing** — plans, hosted checkout, customer portal, webhook-synced |
| 🎨 | **Vercel-grade UI** — Tailwind + shadcn, light/dark, mobile-first, JSON-LD SEO |

---

## 🧠 What ships today

### Train
- **9 source types**: PDF · DOCX · XLSX · JSON · Markdown · Plain text · URLs · sitemap.xml crawl (up to 200 URLs per import) · Q&A pairs
- **Drag-and-drop** multi-file upload with **per-file progress**
- **Preview drawer** — see every chunk + token count + extracted text
- **Inline editing** for text / Markdown / JSON / Q&A → auto re-ingestion
- **Search, filter, bulk delete, retry-on-failed**
- **Promote-to-training** from any customer conversation

### Pick your LLM
- **Chat**: `CHAT_PROVIDER` = `openai` | `anthropic` | `google` | `deepseek` | `ollama`
- **Embeddings**: `EMBEDDING_PROVIDER` = `openai` | `google` | `ollama`
- Mix providers (e.g., **Ollama chat + OpenAI embeddings**)
- **Fully local** with Ollama — no API key, $0 OpenAI bill

### Deploy across channels
- **Web widget** — one `<script>` tag → Shadow DOM, 3.2 KB gzipped, streaming SSE, citation chips, per-bot end-user cookie, CORS open, Redis rate limits
- **Telegram** — paste a `@BotFather` token, we register the webhook. Private + groups. Group mode: `all` / `mention` / `reply`. Long answers split at sentence boundaries.
- **WhatsApp Cloud API** — Meta Business setup, signature-verified webhook (`X-Hub-Signature-256`), 1-to-1 conversations (Meta doesn't allow bots in WhatsApp groups)
- All channels share the **same** RAG pipeline, conversation admin, plan caps.

### Manage customer conversations
- Every chat across **every channel** is admin-manageable
- Full transcript with IP, device, referrer, duration, citation counts, latency
- Search by message content, filter by date range + flag, bulk delete, archive, **JSON export**
- Live stats: active 24h, active 7d, unique end-users, avg messages per session
- Flag: `review` / `star` / `abuse` / `spam`
- **Add to training** on any assistant message → editable, idempotent, reversible

### Admin security
- Per-device login list (`/account/sessions`) with revoke + **"Sign out everywhere else"**
- Password changes auto-revoke other sessions
- Full security audit log (sign-in, sign-out, password / email / profile / session events)
- bcrypt + JWT sessions, edge-safe middleware

### Run the business
- Plans + usage caps (bots, documents, storage, messages/month) — **server-side enforced**
- Stripe-backed Hosted Checkout + customer portal + webhook-synced plan state
- Per-bot analytics: top questions + **content gaps** (questions with zero citations)

---

## 🛠 Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 15** (App Router) | RSC, server actions, edge middleware, single deploy unit |
| Language | **TypeScript** (strict) | Types catch bugs before runtime |
| DB | **Postgres 16 + pgvector** | One database for OLTP + vectors; HNSW indexes fast at SaaS scale |
| ORM | **Drizzle** | Type-safe, no codegen runtime, supports `vector` columns natively |
| Auth | **Auth.js v5** | Credentials + Google + custom session tracking |
| Queue | **BullMQ + Redis** | Reliable background ingestion + rate limiting |
| Storage | **MinIO (dev) / S3 (prod)** | Original documents live outside the DB |
| LLM | **5 providers**, swappable | OpenAI / Claude / Gemini / Deepseek / Ollama |
| UI | **Tailwind + shadcn/ui** | Vercel-grade aesthetic, mobile-first |
| Widget | **Vite + Shadow DOM** | Framework-free, 3.2 KB gzipped |
| Billing | **Stripe** | Hosted Checkout + customer portal + webhook |
| Tests | **Vitest** | Fast unit + integration tests against real Postgres/Redis/MinIO |

---

## 🚀 Quick start (5 minutes)

### Prerequisites

- **Node.js 22+** and **npm 10+**
- **Docker** with Compose v2 (or [OrbStack](https://orbstack.dev/) on macOS)
- An **OpenAI / Claude / Gemini / Deepseek key**, or **Ollama** running locally

### Steps

```bash
# 1. Clone + install
git clone https://github.com/unusdon/ai-chatbot-saas.git
cd ai-chatbot-saas
npm install

# 2. Configure environment
cp .env.example .env.local
# Generate AUTH_SECRET:
openssl rand -base64 32
# Paste the output into AUTH_SECRET in .env.local

# 3. Start Postgres (+ pgvector), Redis, MinIO
docker compose up -d

# 4. Run database migrations (auto-enables pgvector extension)
npm run db:migrate

# 5. Start the dev server
npm run dev

# 6. In a second terminal: start the ingest worker
npm run worker
```

Open <http://localhost:3000>, click **Get started**, create an account, and you're in.

### Verify

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # next lint
npm run test        # vitest (64 tests)
```

### Run with Ollama (zero API cost)

```bash
ollama serve
ollama pull llama3.2 nomic-embed-text
```

In `.env.local`:

```env
CHAT_PROVIDER=ollama
EMBEDDING_PROVIDER=ollama
```

Restart `npm run dev` + `npm run worker`. You're now running fully local.

---

## 📨 Channels — Web, Telegram, WhatsApp

Open the dashboard → pick a bot → **Channels** tab. Each channel is independent; the same bot can serve all three.

### 🌐 Web embed widget

```html
<script
  src="https://your-app.com/widget.js"
  data-bot-key="bot_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  data-title="Ask Acme"
  data-accent="#7c3aed"
  defer
></script>
```

3.2 KB gzipped · Shadow DOM (CSS-isolated) · streaming · stable end-user cookie · CORS open · Redis-backed rate limits per key + per IP.

### 💬 Telegram

1. DM [`@BotFather`](https://t.me/BotFather) → `/newbot` → copy token
2. Dashboard → Channels → Telegram → paste token + pick group mode → **Connect**
3. Bot lives on Telegram in seconds. Group mode: `all` / `mention` / `reply` (default `mention`)

### 📞 WhatsApp (Meta Business Cloud API)

1. Set up a Meta Business app → add WhatsApp product → get Phone Number ID + access token + app secret
2. Dashboard → Channels → WhatsApp → paste credentials → **Save**
3. Paste the webhook URL + verify token into Meta dashboard → subscribe to `messages`

> ⚠️ **WhatsApp Groups + bots** is not supported by Meta. Use Telegram for groups.

---

## 🗄 Database schema

Built incrementally across 6 migrations. Single source of truth: `db/schema.ts`.

| Table | Purpose |
|---|---|
| `user` · `account` · `session` · `verificationToken` | Auth.js v5 tables |
| `user_session` · `security_event` | Admin device sessions + audit log |
| `bot` | One row per chatbot (with `publicKey` for widget) |
| `bot_channel` | Telegram / WhatsApp connections per bot |
| `document` | Uploaded sources, status tracking |
| `chunk` | Embedded chunks (`vector(1536)`, HNSW cosine index) |
| `conversation` | Per-end-user thread, with IP / UA / referrer / flag / archive |
| `message` | Chat history with citations, tokens, latency, promoted-to-training pointer |

---

## ⚙️ Configuration

All env vars validated at boot by `lib/env.ts` (Zod). Missing values crash with a list of fields. See [`.env.example`](.env.example) for the complete list.

| Variable | Purpose |
|---|---|
| `AUTH_SECRET` | JWT signing key. Generate with `openssl rand -base64 32`. |
| `DATABASE_URL` | Postgres connection string. |
| `REDIS_URL` | BullMQ queue backend. |
| `S3_*` | Object storage credentials. |
| `CHAT_PROVIDER` | `openai` / `anthropic` / `google` / `deepseek` / `ollama` |
| `EMBEDDING_PROVIDER` | `openai` / `google` / `ollama` |
| `OPENAI_API_KEY` etc. | Per-provider credentials |
| `STRIPE_*` | Billing (optional — UI explains how to configure) |
| `AUTH_GOOGLE_*` | Google OAuth (optional) |

---

## 🔒 Security

- 🔐 Passwords stored as **bcrypt** hashes (cost factor 12)
- 🍪 Session strategy is **JWT** — middleware verifies at the edge without a DB round-trip
- 🛡 **Multi-tenant isolation** enforced in the data layer, not the application layer — every read/write joins through `bot.userId`. Adversarial integration tests verify a second user cannot read, update, or delete the first user's resources.
- ✅ **SSRF guards** on every URL/sitemap fetcher (rejects loopback, RFC1918, link-local, non-http(s))
- 🔍 **Magic-byte checks** on every file upload
- 🌍 **Signature verification** on Stripe + WhatsApp webhooks
- 🔑 **Auto-rotated `publicKey`** on widget channels (admin can regenerate to invalidate every embed)
- 🚦 **Redis-backed rate limits** (per key + per IP) on the public widget endpoint
- 📋 **Security audit log** for every sign-in, password change, session revoke
- 🐛 Report a vulnerability via [SECURITY.md](SECURITY.md) — **do not** open a public issue

---

## 📦 Deploy to production

See [**DEPLOY.md**](DEPLOY.md) for the complete production guide:
- Managed Postgres (Neon · Supabase · RDS) with pgvector
- Upstash Redis · AWS S3 or Cloudflare R2
- LLM provider setup
- Vercel for the web app + separate worker host (Railway / Render / Fly.io)
- Stripe configuration
- **Channel setup** (Telegram + WhatsApp Cloud API with Meta Business onboarding)
- DNS wiring + 11-point verification checklist
- 7 common gotchas + operational baselines

---

## 🤝 Contributing

PRs welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, coding standards, and the PR checklist.

### Looking for a place to start?

- Browse [good first issues](https://github.com/unusdon/ai-chatbot-saas/labels/good%20first%20issue)
- Suggest an idea in [Discussions](https://github.com/unusdon/ai-chatbot-saas/discussions)
- Improve the [docs](DEPLOY.md) — typos welcome

### Roadmap candidates

- 📱 React Native widget for iOS / Android
- 🦊 Slack / Discord channels (same pipeline pattern as Telegram)
- 🎙 Voice answers (TTS provider abstraction)
- 📈 Per-conversation feedback (👍/👎 on each message)
- 🔬 A/B test prompts per bot

---

## 💛 Sponsors

If this saved you weeks of work, [sponsor the project](https://github.com/sponsors/cyberunite) so we can keep shipping.

<br/>

<div align="center">
  <strong>Star history</strong><br/>
  <a href="https://www.star-history.com/#unusdon/ai-chatbot-saas&Date">
    <img src="https://api.star-history.com/svg?repos=unusdon/ai-chatbot-saas&type=Date" alt="Star history" width="700" />
  </a>
</div>

<br/>

<div align="center">
  <strong>Contributors</strong><br/>
  <a href="https://github.com/unusdon/ai-chatbot-saas/graphs/contributors">
    <img src="https://contrib.rocks/image?repo=unusdon/ai-chatbot-saas" alt="Contributors" />
  </a>
</div>

---

## 📜 License

[MIT](LICENSE) © [Cyberunite](https://cyberunite.com)

<br/>

<div align="center">
  <sub>Built with ❤️ on <strong>Next.js 15</strong>, <strong>Postgres 16 + pgvector</strong>, <strong>BullMQ</strong>, <strong>Drizzle</strong>, <strong>Tailwind</strong>, and <strong>shadcn/ui</strong>.</sub>
  <br/>
  <sub>If you ship this, <a href="https://twitter.com/cyberunite">tell us @cyberunite</a> — we'd love to see it.</sub>
</div>
