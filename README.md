# AI Chatbot SaaS

<p align="center">
  <strong>Multi-tenant RAG chatbot platform — upload PDFs and URLs, get an embeddable AI support widget grounded in your content, with citations.</strong>
</p>

<p align="center">
  <a href="https://github.com/cyberunite/ai-chatbot-saas/actions/workflows/ci.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/cyberunite/ai-chatbot-saas/ci.yml?branch=main&label=CI&logo=github"></a>
  <img alt="License" src="https://img.shields.io/badge/license-MIT-green.svg">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-15-black?logo=next.js">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white">
  <img alt="Postgres" src="https://img.shields.io/badge/Postgres-16-4169E1?logo=postgresql&logoColor=white">
  <img alt="pgvector" src="https://img.shields.io/badge/pgvector-HNSW-336791">
  <img alt="Auth.js" src="https://img.shields.io/badge/Auth.js-v5-4F46E5">
  <img alt="Drizzle ORM" src="https://img.shields.io/badge/Drizzle-ORM-C5F74F">
  <img alt="OpenAI" src="https://img.shields.io/badge/OpenAI-RAG-412991?logo=openai">
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind-CSS-06B6D4?logo=tailwindcss&logoColor=white">
  <img alt="shadcn/ui" src="https://img.shields.io/badge/shadcn%2Fui-black">
  <img alt="BullMQ" src="https://img.shields.io/badge/BullMQ-Redis-DC382D?logo=redis&logoColor=white">
  <img alt="Docker" src="https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white">
</p>

---

## What this is

A production-grade SaaS template you can run yourself or sell as a service. Each customer signs up, creates a chatbot, uploads source material (PDFs / URLs / markdown), and gets a JavaScript snippet to embed a chat widget on their site. The widget answers questions using only their content — with inline citations — so it doesn't hallucinate brand voice or facts.

Built to ground rule #1 of this org: real-world projects, enterprise-grade, plug-and-play, no half-finished features.

## Roadmap (transparent — what works today vs. what's coming)

| Milestone | Status | Scope |
|---|---|---|
| **M1 — Foundation** | ✅ shipped | Auth.js v5 (Credentials + Google), Drizzle schema, pgvector, Docker stack, marketing landing, dashboard shell, CI |
| **M2A — Bot CRUD** | ✅ shipped | Create / list / edit / delete chatbots; per-bot embed snippet with rotatable `publicKey`; multi-tenant ownership boundary enforced + integration-tested |
| **M2B — Document ingestion** | ✅ shipped | PDF upload to S3/MinIO (20 MB limit, magic-byte check), URL ingestion with SSRF guard (rejects loopback / RFC1918 / link-local / non-http(s) schemes), per-bot source list with live status |
| **M2C — Worker** | ✅ shipped | BullMQ worker: PDF → text (pdf-parse), URL → article text (Readability), recursive chunker with overlap, batched OpenAI embeddings, idempotent retries, exponential backoff. Pipeline is end-to-end integration-tested with a stub extractor + embedder. |
| **M3 — RAG chat** | ✅ shipped | Streaming SSE chat endpoint, pgvector HNSW retrieval (top-K + min-similarity filter), prompt assembly with numbered citations, conversation persistence (per-user rolling history per bot), playground UI with citation chips |
| **M4 — Embed widget** | ✅ shipped | Vite-built `widget.js` (7.4 KB / 3.2 KB gz), Shadow-DOM chat panel + FAB, public `POST /api/widget/chat` keyed by `publicKey`, CORS open + OPTIONS preflight, Redis-backed per-key + per-IP rate limits (fail-open on Redis outage), stable end-user cookie |

**Phase 1 status: complete.** Self-hosting customers can sign up → create a bot → upload docs → embed the widget snippet on any external site → end-users chat with answers grounded in the customer's sources.

### Phase 2 — admin features (in progress)

| Milestone | Status | Scope |
|---|---|---|
| **P5 — Per-bot analytics** | ✅ shipped | Stats (messages, conversations, avg latency, tokens), 14-day SVG bar chart, top questions, content-gap surface (questions with zero citations → highest-ROI sources to add next) |
| **P6 — Plans + usage limits** | ✅ shipped | `plan` enum on users (free / starter / pro), declarative `PLAN_LIMITS` (bots, documents, document bytes, messages/month), `assertCan*` helpers enforced server-side at bot creation, PDF + URL ingest, and chat (both dashboard + widget). `/account/usage` shows live progress bars per limit. |
| **P7 — Stripe billing** | planned | Hosted checkout, webhook handler, customer portal |

This README documents M1. The roadmap items above link to GitHub issues as work begins.

## Architecture

```
                  ┌──────────────────────────────┐
                  │     Next.js 15 App Router    │
                  │  (marketing + dashboard +    │
                  │   API + widget bundle)       │
                  └──────────────┬───────────────┘
                                 │
       ┌─────────────────────────┼─────────────────────────┐
       │                         │                         │
┌──────▼──────┐         ┌────────▼────────┐       ┌────────▼────────┐
│  Postgres   │         │     Redis       │       │     MinIO       │
│ + pgvector  │         │  (BullMQ queue) │       │  (S3-compatible │
│             │         │                 │       │   blob storage) │
└─────────────┘         └────────┬────────┘       └─────────────────┘
                                 │
                        ┌────────▼────────┐
                        │  Worker process │
                        │ chunk → embed → │
                        │     persist     │
                        └─────────────────┘
```

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 15 (App Router) | RSC, server actions, edge middleware, single deploy unit |
| Language | TypeScript (strict) | Types catch bugs before runtime |
| DB | Postgres 16 + pgvector | One database for OLTP + vectors; HNSW index is fast enough at SaaS scale |
| ORM | Drizzle | Type-safe, no codegen runtime, supports `vector` columns natively |
| Auth | Auth.js v5 (NextAuth beta) | Credentials + Google out of the box, JWT sessions for edge middleware |
| Queue | BullMQ + Redis | Reliable background ingestion (chunking + embeddings are slow) |
| Storage | MinIO (dev) / S3 (prod) | Original document binaries live outside the DB |
| LLM | OpenAI (`gpt-4o-mini`, `text-embedding-3-small`) | Cheap, fast, swappable for Anthropic via `LLM_PROVIDER` |
| UI | Tailwind + shadcn/ui + Radix | Accessible primitives, full control over styling |
| Tests | Vitest | Fast unit tests; Playwright is added in M3 for e2e |

## Quick start (local development)

### Prerequisites

- **Node.js 22+** and npm 10+
- **Docker** with Compose v2 (or [OrbStack](https://orbstack.dev/) on macOS)
- An **OpenAI API key** (only needed once you start M2 features — auth works without it)

### Steps

```bash
# 1. Clone + install
git clone https://github.com/cyberunite/ai-chatbot-saas.git
cd ai-chatbot-saas
npm install

# 2. Configure environment
cp .env.example .env.local
# Generate AUTH_SECRET:
openssl rand -base64 32
# Paste the output into AUTH_SECRET in .env.local

# 3. Start Postgres (+ pgvector), Redis, MinIO
docker compose up -d

# 4. Run database migrations
npm run db:migrate

# 5. Start the dev server
npm run dev

# 6. In a second terminal: start the ingest worker
#    (consumes BullMQ jobs queued by the dashboard's upload + URL flows)
npm run worker
```

Open <http://localhost:3000>, click **Get started**, create an account, and you're in the dashboard.

### Verify the stack

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # next lint
npm run test        # vitest
```

## Embedding the widget on any site

Once a chatbot is `ready` (sources ingested) and your app is deployed, copy
the snippet shown on the bot detail page and drop it into the `<head>` of any
website:

```html
<script
  src="https://your-app.com/widget.js"
  data-bot-key="bot_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  data-title="Ask Acme"
  data-accent="#7c3aed"
  defer
></script>
```

The widget renders a floating chat button in the bottom-right of the host
page. Everything is scoped inside a Shadow DOM so the host site's CSS can't
bleed in, and our CSS can't escape. Total bundle size: **~3.2 KB gzipped**.

Optional `data-*` attributes:

| Attribute | Default | Purpose |
|---|---|---|
| `data-title` | "Ask the bot" | Header text inside the chat panel. |
| `data-greeting` | "Hi! Ask me anything…" | First-message placeholder. |
| `data-accent` | `#111827` | Primary color (header bg, FAB bg, user bubble). |
| `data-api-base` | script's origin | Override if you're serving the widget from a CDN but hitting a different API host. |

End-users get a per-bot cookie (`aichatbot_eu_<botId>`) so their conversation
persists across page loads. The endpoint is rate-limited to **30 messages /
minute / publicKey** and **20 messages / minute / IP**, backed by Redis. When
Redis is unreachable the limiter fails open — preferring a brief metered
window of unlimited chat to taking the widget offline for every embedding
site.

## Configuration

All environment variables are validated at boot by `lib/env.ts` (Zod). Missing or invalid values crash the process loudly with a list of fields — there are no silent defaults for production secrets.

| Variable | Required | Purpose |
|---|---|---|
| `AUTH_SECRET` | yes | JWT signing key. Generate with `openssl rand -base64 32`. |
| `AUTH_URL` | yes (prod) | Canonical URL of your deployment. |
| `NEXT_PUBLIC_APP_URL` | yes | Public base URL used in OG tags + email links. |
| `DATABASE_URL` | yes | Postgres connection string. |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | optional | Enables Google sign-in if both are set. |
| `REDIS_URL` | M2+ | BullMQ queue backend. |
| `S3_*` | M2+ | Object storage credentials for uploaded documents. |
| `OPENAI_API_KEY` | M2+ | Embeddings + chat completions. |
| `LLM_PROVIDER` | optional | `openai` (default) or `anthropic`. |

See [`.env.example`](./.env.example) for the full list with safe defaults.

## Security

- Passwords are stored as bcrypt hashes (cost factor 12).
- Email is normalized to lowercase before lookup to prevent case-sensitivity bypass.
- Session strategy is JWT — middleware checks happen at the edge without a DB round-trip.
- The signup server action enforces the same Zod schema as the API; client-side validation is purely UX.
- `pgvector` requires `CREATE EXTENSION vector;` — handled automatically by `npm run db:migrate`.
- Reporting a vulnerability: see [SECURITY.md](./SECURITY.md) — please **do not** open public issues for security bugs.

## Project structure

```
ai-chatbot-saas/
├── app/                          # Next.js 15 App Router
│   ├── (auth)/                   # Public auth pages (login/signup/forgot)
│   ├── (dashboard)/              # Authenticated routes
│   ├── api/auth/[...nextauth]/   # Auth.js v5 handlers
│   ├── layout.tsx                # Root layout + theme provider
│   ├── globals.css               # Tailwind + shadcn CSS variables
│   └── page.tsx                  # Marketing landing
├── components/
│   ├── ui/                       # shadcn primitives (button, input, card…)
│   ├── dashboard-nav.tsx
│   └── theme-provider.tsx
├── db/
│   ├── schema.ts                 # Drizzle schema (users + RAG tables)
│   ├── index.ts                  # Drizzle client
│   ├── migrate.ts                # CLI: enables pgvector then runs migrations
│   └── migrations/               # Generated SQL
├── lib/
│   ├── auth.ts                   # Auth.js v5 config
│   ├── auth-actions.ts           # Server actions (sign out)
│   ├── env.ts                    # Zod-validated env config
│   └── utils.ts                  # cn()
├── tests/                        # Vitest unit tests
├── middleware.ts                 # Edge: route protection
├── docker-compose.yml            # Postgres + Redis + MinIO
├── drizzle.config.ts
├── vitest.config.ts
└── next.config.ts
```

## Database schema (M1)

Auth.js tables (`user`, `account`, `session`, `verificationToken`) plus the application tables that future milestones build on:

- `bot` — one row per chatbot, owned by a `user`. Has a `publicKey` used by the embed widget.
- `document` — uploaded source material. Status field tracks the ingestion pipeline (`pending` → `processing` → `ready` / `failed`).
- `chunk` — split + embedded document fragments. The `embedding` column is `vector(1536)` for `text-embedding-3-small`, indexed with `HNSW + vector_cosine_ops`.
- `conversation` + `message` — chat history, with `citations` (chunk IDs + scores) on each assistant message.

## Deployment

Production deployment guides ship in M5. The short version:

- **Vercel** for the Next.js app (App Router + standalone output already configured).
- **Neon / Supabase / Railway** for managed Postgres with pgvector. Run `CREATE EXTENSION vector;` once.
- **Upstash** for managed Redis (BullMQ-compatible).
- **AWS S3** or **Cloudflare R2** instead of MinIO. Set `S3_FORCE_PATH_STYLE=false` for S3.

## Contributing

Pull requests welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup, coding standards, and the PR checklist. Discussion happens in [GitHub Discussions](https://github.com/cyberunite/ai-chatbot-saas/discussions).

## License

[MIT](./LICENSE) © [Cyberunite](https://cyberunite.com)
