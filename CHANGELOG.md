# Changelog

All notable changes to this project are documented in this file. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); this project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Milestone 2A — Bot CRUD.** Create, list, edit, and delete chatbots from the
  dashboard. Each bot has a rotatable `publicKey` rendered as a copy-able embed
  snippet. Server actions enforce ownership; multi-tenant isolation is
  integration-tested against a live Postgres.
- **Milestone 2B — Document ingestion.** Per-bot Sources card with PDF upload
  (Route Handler, 20 MB limit, `%PDF-` magic-byte check) and URL ingestion
  (server action with SSRF guard that rejects loopback / RFC1918 / link-local
  hosts and non-http(s) schemes). Documents persist in Postgres with pending /
  processing / ready / failed status, original PDFs persist in S3/MinIO under
  `bots/<botId>/documents/<docId>.pdf`. Queue facade calls
  `queueIngestJob(documentId)` so M2C can drop in BullMQ without touching the
  ingest call-sites.
- **Phase 2 / Milestone 6 — Plans + usage limits.**
    - `plan` enum on `user` (free / starter / pro), `planChangedAt` timestamp;
      migration `0001_add_user_plan.sql`.
    - `lib/server/plans.ts` — declarative `PLAN_LIMITS` per tier (bots,
      documents, document bytes, messages/month) + `getPlan`, `getUsage`,
      and three boundary-check helpers (`assertCanCreateBot`,
      `assertCanIngestDocument`, `assertCanSendMessage`) that throw a
      typed `QuotaExceededError`. Usage is computed live from the DB so a
      schema migration doesn't have to backfill.
    - Server-side enforcement at every resource creation point:
      bot create action, PDF upload route, URL ingest action, dashboard
      chat endpoint, and public widget chat endpoint (billed to the bot
      owner's plan, since they're the customer).
    - `/account/usage` page with progress bars per limit + warning state
      at 80% + destructive state at 100%. New `Progress` shadcn primitive.
    - Sidebar nav: Overview ↔ Chatbots ↔ Usage.
    - +5 integration tests for the assert helpers + usage aggregations.
- **Phase 2 / Milestone 5 — Per-bot analytics.**
    - `lib/server/analytics.ts` with ownership-checked aggregations:
      `getBotStats` (messages by role, conversations, avg latency, tokens),
      `getDailyMessageCounts` with `generate_series` so days with zero
      activity still appear, `getTopQueries` (`GROUP BY content`), and
      `getContentGaps` — assistant messages with empty/null `citations`
      joined to the immediately-preceding user question via a subquery
      ordered by `(createdAt, id)` so timestamp ties don't lose ordering.
    - `app/(dashboard)/bots/[id]/analytics/page.tsx` with 4 stat cards,
      a pure-SVG bar chart (no chart-lib dependency), Top Questions list,
      and a Content Gaps card flagging the highest-ROI sources to add.
    - Bot detail page gains an Analytics CTA next to the playground link.
    - +5 integration tests covering every aggregation against real Postgres.
- **Milestone 4 — Embed widget.** Phase 1 complete.
    - `widget/` — separate Vite library build (no React; framework-free
      vanilla TS) producing `public/widget.js` (~7.4 KB / ~3.2 KB gz).
    - Shadow DOM chat panel + floating action button so host-site CSS can't
      conflict. Streaming SSE consumption mirrors the dashboard playground.
    - Configurable via script-tag `data-*` attrs: `data-bot-key` (required),
      `data-title`, `data-greeting`, `data-accent`, `data-api-base`.
    - `app/api/widget/chat/route.ts` — public POST endpoint keyed by
      `publicKey`, CORS open + OPTIONS preflight, end-user identity via
      `aichatbot_eu_<botId>` cookie, per-bot rolling conversation.
    - `lib/server/rate-limit.ts` — Redis-backed fixed-window counter (INCR +
      EXPIRE). Per-key cap of 30 req/min, per-IP cap of 20 req/min. Fails
      open on Redis errors — chat-down beats chat-unmetered during an outage.
    - Tests: +2 integration tests for the rate limiter against real Redis.
    - `npm run build` now runs `widget:build` then `next build` so the
      bundle is always fresh.
- **Milestone 3 — RAG chat.** End-to-end retrieval-augmented chat for the
  dashboard playground:
    - `lib/server/retrieval.ts` — embed query, cosine-distance search against
      `chunk.embedding` (uses the HNSW index), drops chunks below a
      configurable similarity floor.
    - `lib/server/chat.ts` — assemble system prompt + numbered context block +
      explicit "use only the context" instruction, stream completion via the
      OpenAI client (swappable via `_setChatClient` for tests).
    - `lib/server/conversations.ts` — per-(user, bot) rolling conversation,
      ownership-enforced, persists user + assistant messages with citations.
    - `app/api/bots/[id]/chat/route.ts` — SSE endpoint emitting `token`,
      `citations`, `done`, `error` events.
    - `app/(dashboard)/bots/[id]/chat/` — playground page with streamed
      bubble rendering, citation chips (linked to source URL when available),
      shift+enter for newlines, clear-conversation action.
  Integration test exercises the prompt-assembly path against real Postgres
  with stubbed embedder + chat client so we don't burn OpenAI tokens in CI.
- **Milestone 2C — Ingest worker.** Standalone `npm run worker` process
  consuming the BullMQ `ingest` queue. Pipeline: load document, mark
  `processing`, extract (PDF → pdf-parse, URL → Readability + JSDOM with a
  belt-and-braces SSRF check on redirects + content-type guard + 5 MB cap),
  recursive character chunker (~1000 chars, 150 overlap), batched OpenAI
  embeddings (cap on inputs-per-call + tokens-per-call so we stay under TPM
  limits), insert chunks transactionally, mark `ready`. Retries 5× with
  exponential backoff; failure path persists the error on the document row.
  Idempotent: prior chunks for the same document are deleted before insert
  so a retry doesn't double-write. Extractor + embeddings client are both
  swappable (`_setExtractor`, `_setEmbeddingsClient`) for tests. End-to-end
  integration test covers the full pipeline against real Postgres + real
  MinIO with stub extractor + stub embedder.
- Sidebar nav links Overview ↔ Chatbots.
- CI workflow now runs the integration suite (`RUN_INTEGRATION_TESTS=1`) against
  the pgvector service container.

### Changed
- Dashboard overview now reflects the real bot count and links to `/bots`.

## [0.1.0] — Milestone 1

### Added
- Auth.js v5 foundation (Credentials + optional Google), Drizzle adapter, JWT
  sessions, Edge-safe `auth.config.ts` split so middleware doesn't pull the
  Postgres driver into the edge bundle.
- Drizzle schema: Auth.js tables plus `bot`, `document`, `chunk` (with
  `vector(1536)` + HNSW cosine index), `conversation`, `message`. Custom
  migrate script enables pgvector before running migrations.
- Marketing landing, `/login`, `/signup`, `/forgot-password`, `/dashboard`
  shell with sign-out and route protection.
- shadcn primitives (button, input, label, card), Tailwind globals with
  light/dark CSS variables, sonner toaster, next-themes provider.
- docker-compose: pgvector + Redis + MinIO; configurable host port for
  Postgres to avoid local 5432 conflicts.
- Zod-validated env config that fails loudly at boot.
- Vitest with 8 unit tests covering env, password hashing, signup validation.
- GitHub Actions CI: typecheck, lint, migrate, test, build.
- README with badges + roadmap, CONTRIBUTING, SECURITY, CODE_OF_CONDUCT,
  MIT LICENSE, dependabot, issue + PR templates.
