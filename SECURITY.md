# Security Policy

## Supported versions

The latest minor release on the `main` branch receives security fixes. Older
versions do not.

## Reporting a vulnerability

**Do not** open a public GitHub issue for security reports. Instead, email
**security@cyberunite.com** with:

- A description of the vulnerability and its impact
- Reproduction steps or proof-of-concept
- Your name and (optionally) a contact channel for follow-up

You will receive an acknowledgement within **3 business days** and a status
update within **10 business days**. We aim to ship a fix within 30 days of
verified reports; high-severity issues are prioritized.

## Security expectations of this project

- **Secrets never enter the codebase or container images** — only env vars
  injected at runtime.
- **Multi-tenant isolation** — every query against the database is scoped by
  the authenticated user's tenant ID. We do not rely on application-level
  filtering alone for sensitive data.
- **Embedded chat widget** — the public widget API accepts only a per-bot API
  key (rotatable) and enforces per-bot rate limits.
- **Document ingestion** — uploaded files are scanned for size and MIME-type
  constraints before extraction. URLs are crawled with a strict allowlist of
  schemes (http/https only) and a timeout.

## Known limitations

- The default `docker-compose.yml` is for **local development only** — its
  credentials and ports are not suitable for public exposure. See `DEPLOY.md`
  for production guidance.
- The embeddable widget runs on third-party sites and is therefore exposed to
  XSS by the embedding page. We isolate styles via Shadow DOM, but the
  embedding page can read messages typed by the visitor. Communicate this in
  your privacy policy.
