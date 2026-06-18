// Fill in safe defaults so `lib/env.ts` validates during unit tests without
// requiring a real .env. Set BEFORE the env module is loaded by anything.
const e = process.env as Record<string, string | undefined>;
e.NODE_ENV = 'test';
e.AUTH_SECRET = 'unit-test-secret-not-used-in-prod';
e.AUTH_URL = 'http://localhost:3000';
e.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
e.DATABASE_URL = 'postgres://test:test@localhost:5432/test';
