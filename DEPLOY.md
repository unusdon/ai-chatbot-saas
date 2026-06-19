# Deploying AI Chatbot SaaS

This guide takes you from a local clone to a production deployment serving real customers. The local stack (`docker compose up`) is a swap-for-swap mirror of the production topology, so the conceptual model carries over — the difference is which provider runs each piece.

## Architecture you're deploying

```
┌──────────────────────────────────────────────────────────┐
│  Vercel  (or any Node host)                              │
│  ────────────────                                         │
│  - Next.js 15 app  (UI + dashboard chat API + widget API)│
│  - Public /widget.js (built into the bundle)             │
│  - Edge middleware (JWT session check)                   │
└──────┬────────────┬──────────────┬────────────────┬──────┘
       │            │              │                │
┌──────▼─────┐  ┌──▼───────┐  ┌───▼──────┐   ┌─────▼──────┐
│  Postgres  │  │  Redis   │  │  Object  │   │   Worker   │
│ + pgvector │  │ (BullMQ  │  │  Storage │◄──┤  process   │
│ (Neon /    │  │  + rate  │  │  (S3 /   │   │ (Railway / │
│  Supabase) │  │  limit)  │  │  R2)     │   │  Render)   │
└────────────┘  └──────────┘  └──────────┘   └────────────┘
                                              │
                                       ┌──────▼──────┐
                                       │   OpenAI    │
                                       │ embeddings  │
                                       │ + chat      │
                                       └─────────────┘
                              ┌────────────────────────────┐
                              │   Stripe (billing)         │
                              │   - Hosted Checkout        │
                              │   - Webhook → /api/stripe  │
                              └────────────────────────────┘
```

The web app and the worker are **two separate processes** that share the database, Redis, and object storage. Don't try to run the worker inside Vercel — its serverless runtime can't hold a long-lived BullMQ connection.

## Pre-flight checklist

Before you provision anything, decide:

- [ ] **Domain name** — `chat.example.com` for the app. The widget snippet you give customers will reference `https://<this-domain>/widget.js`.
- [ ] **Stripe account in live mode** (or test mode for a staging run) with the **starter** and **pro** products + prices created.
- [ ] **OpenAI account** with a billable workspace + an API key.
- [ ] **Email for `SECURITY.md`** disclosure — used in the embedded link.
- [ ] **Region** — pick one and put every piece there. Cross-region between Postgres and the app adds 50–100ms to every chat round-trip.

## 1. Postgres + pgvector

**Recommended**: [Neon](https://neon.tech) (serverless Postgres with native pgvector), [Supabase](https://supabase.com), [Railway](https://railway.app), or self-host on RDS.

### Provider-agnostic setup

1. Create a Postgres 16 database. Anything 14+ works but I've only tested on 16.
2. Enable the `vector` extension. Neon and Supabase have a one-click; on RDS / self-hosted: `CREATE EXTENSION IF NOT EXISTS vector;`. **The app's `npm run db:migrate` runs this automatically on each migration**, so as long as the role you use has `CREATE` privilege, this is handled for you.
3. Grab the connection string. It MUST include `?sslmode=require` for any managed provider — Neon's defaults already do.
4. Run the migrations from your machine pointed at production:
   ```bash
   DATABASE_URL="postgres://…?sslmode=require" npm run db:migrate
   ```
   Repeat this every time you ship a new migration. It's idempotent.

### Schema-rotation guarantees

- All three migrations (`0000_init`, `0001_add_user_plan`, `0002_add_stripe_columns`) are forward-only and additive — no destructive changes.
- The HNSW vector index built in `0000_init` is the load-bearing part of retrieval performance. Don't drop it during maintenance.

## 2. Redis

**Recommended**: [Upstash Redis](https://upstash.com) (REST + native Redis protocol, both work), [Railway Redis add-on](https://railway.app), [Render Key Value](https://render.com).

Requirements:
- Redis 7+ (we use stream-based BullMQ features).
- TLS endpoint with a password — every managed provider gives you a `rediss://` URL with both.

```env
REDIS_URL=rediss://default:<password>@<host>:6379
```

The rate limiter **fails open** when Redis is unreachable. This is intentional — taking the widget offline for every embedding site during a provider blip is worse than briefly unmetered chat. If you'd rather fail closed, edit `lib/server/rate-limit.ts` (the `catch` block is documented).

## 3. Object storage (PDFs)

**Recommended**: AWS S3 (cheapest at scale, gold-standard reliability) or [Cloudflare R2](https://developers.cloudflare.com/r2/) (zero egress fees, great if you need to redownload original PDFs often).

Bucket setup:

```bash
# AWS S3
aws s3api create-bucket --bucket your-bucket --region us-east-1

# Cloudflare R2 (via wrangler)
wrangler r2 bucket create your-bucket
```

Bucket policy considerations:
- **Private bucket** — the app generates presigned URLs for downloads. No public reads.
- **Same region as the app + the worker**. Cross-region transfer is the silent cost killer.
- **Lifecycle policy** (optional): expire orphan objects after 90 days. The dashboard delete is best-effort on the S3 side; a sweep cron is on the M9 roadmap.

Env vars:

```env
S3_ENDPOINT=https://s3.us-east-1.amazonaws.com   # leave empty for AWS S3 SDK defaults
S3_REGION=us-east-1
S3_BUCKET=your-bucket
S3_ACCESS_KEY_ID=AKIA…
S3_SECRET_ACCESS_KEY=…
S3_FORCE_PATH_STYLE=false                         # `true` for MinIO + R2, `false` for AWS S3
```

**Cloudflare R2 specifics**: set `S3_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com` and `S3_FORCE_PATH_STYLE=true`. R2 has no per-bucket region; set `S3_REGION=auto`.

## 4. OpenAI

```env
OPENAI_API_KEY=sk-…
OPENAI_CHAT_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
LLM_PROVIDER=openai
```

`text-embedding-3-small` returns 1536-dim vectors, which is exactly what the `chunk.embedding` column is sized for. If you swap to `text-embedding-3-large` (3072 dim) you must:
1. Update `EMBEDDING_DIMENSIONS` in `db/schema.ts`
2. Generate + apply a migration that ALTERs the column
3. Re-embed every existing chunk (or accept dropping retrieval until the worker catches up)

Anthropic is supported as a future swap (`LLM_PROVIDER=anthropic` + `ANTHROPIC_API_KEY` + `ANTHROPIC_CHAT_MODEL`) but the embedding path is OpenAI-only today.

## 5. Web app — Vercel

The repo includes `output: 'standalone'` in `next.config.ts`, which Vercel ignores in favor of its own build. Both work; standalone is for self-hosted Docker.

### One-time setup

1. Push the repo to GitHub (or import directly from a private mirror).
2. In Vercel: **New Project → Import → select the repo**.
3. **Override the build command**: `npm run build` (this also builds the widget bundle to `public/widget.js`).
4. **Root directory**: leave as `/`.
5. **Environment variables**: paste in every key from `.env.example` with production values. **Do not paste `.env.local`** — it'll have your dev secrets and dev URLs.

Critical env vars Vercel needs:

```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://chat.example.com
AUTH_SECRET=<openssl rand -base64 32>
AUTH_URL=https://chat.example.com
DATABASE_URL=<your prod postgres>
REDIS_URL=<your prod redis>
S3_*=<your prod S3>
OPENAI_API_KEY=…
STRIPE_SECRET_KEY=…
STRIPE_WEBHOOK_SECRET=…       # set AFTER you create the webhook in §7
STRIPE_PRICE_STARTER=…
STRIPE_PRICE_PRO=…
```

If you enable Google sign-in, also set `AUTH_GOOGLE_ID` + `AUTH_GOOGLE_SECRET` and add `https://chat.example.com/api/auth/callback/google` as an Authorized redirect URI in the Google Cloud Console.

### Custom domain

In Vercel: **Project → Settings → Domains** → add `chat.example.com`. Update your DNS per the instructions, then update `NEXT_PUBLIC_APP_URL` and `AUTH_URL` to match.

### Auth.js gotchas

- Cookies must be HTTPS-only in production. Vercel terminates TLS at the edge so this just works.
- The widget endpoint sets `SameSite=None; Secure` on its end-user cookie. **The widget will silently break on plain HTTP** — `Secure` cookies need TLS.

## 6. Worker (background process)

Vercel can't run it. Use a separate host:

- **Railway** — simplest. New Project → Empty Service → set the start command to `npm run worker`.
- **Render** — Background Worker service type. Start command: `npm run worker`.
- **Fly.io** — `fly launch` then set the `processes` group in `fly.toml` to run `npm run worker`.
- **Self-hosted** — systemd unit calling `npm run worker`. Keep a small swap of replicas if you want headroom; BullMQ coordinates ownership through Redis so duplicates are safe.

The worker needs the **same env vars** as the web app (it talks to the same DB + Redis + S3 + OpenAI). Give it its own deploy with the same `DATABASE_URL` / `REDIS_URL` / `S3_*` / `OPENAI_API_KEY`. **Do NOT give the worker `STRIPE_*` or `AUTH_*` — it doesn't use them and you shrink the blast radius if the worker host is ever compromised.**

Tune concurrency with `WORKER_CONCURRENCY` (default 4). The bottleneck is OpenAI embedding latency, so 4–8 is usually right; over 16 starts costing you TPM rate-limit hits.

## 7. Stripe

### Create the products

In the Stripe dashboard, switch to **live mode** (or stay in test mode for a staging deploy):

1. **Products → Add product** → "Starter" → monthly recurring price (e.g., $19/mo). Copy the Price ID (`price_…`).
2. Same for "Pro" (e.g., $99/mo).
3. Save the Price IDs as `STRIPE_PRICE_STARTER` and `STRIPE_PRICE_PRO`.

### Set up the webhook

1. **Developers → Webhooks → Add endpoint**.
2. URL: `https://chat.example.com/api/stripe/webhook`.
3. Events to send (the minimum we handle):
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy the signing secret (starts with `whsec_…`) into `STRIPE_WEBHOOK_SECRET`.
5. Redeploy so the new env var lands.

### Customer portal

In Stripe: **Settings → Billing → Customer portal** → enable "subscriptions can update", "cancel", and "payment methods". The `openCustomerPortalAction` returns whatever URL Stripe gives, so any portal feature you enable shows up automatically.

### Test the round-trip

```bash
# Install Stripe CLI locally
stripe login
stripe trigger customer.subscription.created
```

The webhook hits your prod endpoint → `applySubscriptionState` updates the user's `plan` → log into the dashboard → `/account/usage` reflects the new plan.

For end-to-end test:
1. Sign up a real account on prod.
2. Click "Upgrade to Starter" → use Stripe's test card `4242 4242 4242 4242`.
3. After redirect, the webhook fires within 1–2s; refresh `/account/usage` → "Current plan" badge flips to `starter`.

## 7.5. Channels (Telegram + WhatsApp)

Channels are configured per-bot from the dashboard (no env vars needed) — but they need your app to be reachable from the public internet via HTTPS, so they're set up after the web app is live.

### Telegram

End-to-end zero-config (no Meta-style approval), works on private chats and groups.

1. In Telegram, DM [`@BotFather`](https://t.me/BotFather) → `/newbot` → pick a name + username → copy the token (`123456789:ABCdefGhIJKlmnoPQRsTUVwxyZ…`).
2. In your dashboard: **Bots → pick a bot → Channels → Telegram tab** → paste the token + pick group mode → **Connect**.
3. The app validates the token via `getMe()`, calls `setWebhook` with `https://chat.example.com/api/telegram/<channelId>` and a per-channel `secret_token`. From this point on, every message to the bot lands at our webhook.
4. **Group mode** options:
   - `mention` (default) — only when `@yourbotname` is in the message
   - `reply` — only when a user replies to one of the bot's previous messages
   - `all` — every message (chatty; only use for dedicated support groups)
   - Private chats always respond regardless.
5. The webhook secret rides in the `X-Telegram-Bot-Api-Secret-Token` header — we reject any inbound that doesn't match.
6. Disconnecting the channel calls `deleteWebhook` upstream so we don't leave a dangling subscription pointing at our 404s.

### WhatsApp (Meta Business Cloud API)

Production-grade but takes longer because Meta gates business verification.

1. **One-time Meta setup** (allow a few days for approval):
   - Create a Meta Business account + app at <https://developers.facebook.com/apps/>.
   - Add the **WhatsApp** product.
   - Add a test phone number, then verify your real business phone number.
   - Generate a **system user access token** (long-lived).
   - Note your **App Secret** (App settings → Basic).
   - Note your **Phone Number ID** (WhatsApp → API Setup).
2. In your dashboard: **Bots → pick a bot → Channels → WhatsApp tab** → paste Phone Number ID + access token + App Secret → **Save**.
3. The app mints a verify token and shows you the **webhook URL** (`https://chat.example.com/api/whatsapp/<channelId>`) on the channel card.
4. **Back in the Meta dashboard**: WhatsApp → Configuration → Webhook → paste the URL + the verify token → subscribe to the `messages` event.
5. Meta calls `GET /api/whatsapp/<channelId>?hub.challenge=…` to verify. We echo the challenge if the verify token matches → Meta marks the endpoint valid.
6. From then on, every WhatsApp message POSTs to `/api/whatsapp/<channelId>` with `X-Hub-Signature-256: sha256=<HMAC(appSecret, body)>`. We verify in constant time, walk the nested message structure, and route through the same chat pipeline.

**Limitation:** WhatsApp Cloud API does **not** support bots in groups. For groups, use Telegram. (Workarounds like `whatsapp-web.js` violate Meta's ToS and break constantly — not supported.)

### Channel deploy gotchas

- The webhook URLs must be **publicly reachable HTTPS**. `localhost` won't work for Telegram or WhatsApp (use [ngrok](https://ngrok.com/) for local testing).
- Telegram caches the webhook URL — if you change `NEXT_PUBLIC_APP_URL`, the channel won't auto-update. Delete and re-create the channel.
- WhatsApp signature verification reads the raw body, NOT JSON-parsed. Don't put body-parsing middleware in front of the route.
- All channel messages count against the bot owner's monthly message cap — same plan limits as web widget messages.
- Conversations from each channel use `endUserId` prefixes (`tg:…`, `wa:…`) so the conversation admin shows which channel a chat came from.

## 8. DNS + final URL wiring

Once the app is live at `chat.example.com`:

1. Update `NEXT_PUBLIC_APP_URL` and `AUTH_URL` to the final URL (if you set them to a Vercel preview URL earlier, fix them now).
2. If you serve the widget from a CDN domain (`cdn.example.com/widget.js`), the embed snippet you give customers should point there. The widget defaults `data-api-base` to the script's origin, so customers can also override it with `data-api-base="https://chat.example.com"`.
3. The widget already sends `SameSite=None; Secure` cookies so it works from any embedding site, but **the embedding site must be HTTPS** for those cookies to stick.

## 9. Verification checklist

Run through these on your live deploy before sending customers:

```bash
# 1. Health: app boots
curl -I https://chat.example.com/                                # → 200
curl -I https://chat.example.com/widget.js                       # → 200 + content-type: application/javascript

# 2. Auth: signup + login + dashboard redirect
curl -I https://chat.example.com/dashboard                       # → 307 → /login

# 3. Widget API: shape checks
curl -s https://chat.example.com/api/widget/chat                 # → 405 (no GET)
curl -sX OPTIONS https://chat.example.com/api/widget/chat        # → 204 + access-control-allow-origin: *

# 4. Webhook is callable (and rejects unsigned requests):
curl -X POST https://chat.example.com/api/stripe/webhook -d '{}' # → 400 "Missing signature"
```

Then end-to-end manually:
- [ ] Sign up a fresh account
- [ ] Create a chatbot
- [ ] Upload a real PDF → wait for status → `ready`
- [ ] Hit `/bots/[id]/chat` → ask a question → answer streams with citations
- [ ] Embed the snippet on a separate HTML page → FAB renders → chat works
- [ ] **Telegram**: connect a `@BotFather` bot → DM it → reply lands. Add it to a test group → `@mention` it → group reply works
- [ ] **WhatsApp**: connect via Meta Business → verify webhook → send a message from a test WhatsApp → reply lands
- [ ] Open `/bots/[id]/conversations` → confirm all three channels (web, Telegram, WhatsApp) show up with correct end-user prefixes
- [ ] **Add to training**: open a conversation → click "Add to training" on a good Q&A → check `/bots/[id]/sources` → new Q&A document appears + status flips to `ready`
- [ ] Click "Upgrade to Starter" → Stripe checkout → pay → plan flips on `/account/usage`
- [ ] Click "Manage billing" → Stripe portal opens → cancel → plan flips back to `free`

## 10. Common gotchas

- **"Stream isn't writeable"** on rate-limit calls → you're using a `lazyConnect:false + enableOfflineQueue:false` ioredis config. The default in `lib/server/rate-limit.ts` is already correct; if you fork, leave the offline queue on.
- **"Cannot find module for page"** during `next build` → stale `.next/cache`. `rm -rf .next` and rebuild.
- **Widget renders but chat returns 500** → check that `OPENAI_API_KEY` is set on the **app deploy** (not just the worker). Both paths use it.
- **Webhook returns 400 "signature failed"** → you either pasted the wrong `STRIPE_WEBHOOK_SECRET`, or you have body parsing middleware mangling the raw body. Next.js Route Handlers leave `req.text()` raw, but if you add a custom proxy in front of Vercel, make sure it preserves the body.
- **`SameSite=None; Secure` cookies dropped** → the embedding site is on plain HTTP or you're testing the widget against `http://localhost`. Browsers reject `Secure` cookies on non-HTTPS contexts.
- **HNSW index never used** by retrieval → check `EXPLAIN ANALYZE` on the query; if it sequential-scans, the query embedding has a different dimension than the column. Re-check `EMBEDDING_DIMENSIONS` in `db/schema.ts` matches the model.
- **Worker queue grows forever** → Redis is reachable but the worker process died. `npm run worker` exits silently if `REDIS_URL` is unset; check logs.

## 11. Operational baselines

- **Monitor**: `messagesPerMonth` per top tenants (Postgres query), worker queue depth (BullMQ `getJobCounts`), OpenAI spend (in your dashboard).
- **Alerts**: webhook 5xx, worker process down, queue depth > 1000.
- **Backups**: managed Postgres providers handle daily snapshots; verify yours is enabled. The S3 bucket holds original PDFs — if you can re-ingest from source-of-truth, you don't strictly need S3 backups, but it's $0.10/GB/mo to enable versioning, so just do it.
- **Cost ceiling**: free plan = 200 messages/month. At `gpt-4o-mini` pricing (~$0.15 per 1M input tokens, ~$0.60 per 1M output), 200 messages ≈ $0.10/free user/month including embeddings. The starter and pro caps are sized to break even at our defaults; tune `PLAN_LIMITS` in `lib/server/plans.ts` if your model choice changes the math.

---

If something in this guide is wrong or missing, open a PR. See [CONTRIBUTING.md](./CONTRIBUTING.md).
