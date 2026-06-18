# Contributing

PRs and issues welcome.

## Getting set up

You need: Node 22+, Docker (or OrbStack), and an OpenAI API key.

```bash
git clone https://github.com/cyberunite/ai-chatbot-saas.git
cd ai-chatbot-saas

cp .env.example .env
# Generate AUTH_SECRET:  openssl rand -base64 32
# Paste your OPENAI_API_KEY

docker compose up -d            # postgres + redis + minio
npm install
npm run db:migrate              # apply migrations
npm run dev                     # http://localhost:3000
```

## Before submitting a PR

1. `npm run typecheck` passes
2. `npm run lint` passes
3. `npm run test` passes
4. `npm run build` succeeds
5. New env vars added to `.env.example` AND documented in `README.md`
6. New routes / behavior covered by a test
7. Updated `CHANGELOG.md` under `## [Unreleased]`
8. PR scoped to one logical change

## Commit messages

We follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
loosely so the changelog stays scannable:

- `feat:` — new user-visible feature
- `fix:` — bug fix
- `refactor:` — internal change with no behavior change
- `docs:` — documentation only
- `test:` — tests only
- `chore:` — build, deps, CI

Be respectful in discussions. See `CODE_OF_CONDUCT.md`.
