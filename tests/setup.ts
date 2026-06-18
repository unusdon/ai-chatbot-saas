// Fill in safe defaults so `lib/env.ts` validates during tests without
// requiring a real .env. Set BEFORE the env module is loaded by anything.
//
// Integration tests override DATABASE_URL via REAL_DATABASE_URL — those defaults
// keep unit tests boot-able even with no DB / no docker.
const e = process.env as Record<string, string | undefined>;
e.NODE_ENV = 'test';
e.AUTH_SECRET = 'unit-test-secret-not-used-in-prod';
e.AUTH_URL = 'http://localhost:3000';
e.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
e.DATABASE_URL = e.DATABASE_URL ?? 'postgres://test:test@localhost:5432/test';

// S3 / MinIO defaults match docker-compose so the storage layer can talk to
// the local stack when running RUN_INTEGRATION_TESTS=1.
e.S3_ENDPOINT = e.S3_ENDPOINT ?? 'http://localhost:9000';
e.S3_REGION = e.S3_REGION ?? 'us-east-1';
e.S3_BUCKET = e.S3_BUCKET ?? 'chatbot-documents';
e.S3_ACCESS_KEY_ID = e.S3_ACCESS_KEY_ID ?? 'minioadmin';
e.S3_SECRET_ACCESS_KEY = e.S3_SECRET_ACCESS_KEY ?? 'minioadmin';
e.S3_FORCE_PATH_STYLE = e.S3_FORCE_PATH_STYLE ?? 'true';

// Redis is only required by integration tests that hit the rate limiter +
// BullMQ worker pickup. Default to docker compose's redis.
e.REDIS_URL = e.REDIS_URL ?? 'redis://localhost:6379';
