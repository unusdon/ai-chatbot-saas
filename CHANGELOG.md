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
