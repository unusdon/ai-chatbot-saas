/**
 * Drizzle ORM client wired to Postgres.
 *
 * Uses `postgres-js` driver (not `node-postgres`) because Drizzle's recommended
 * path for App Router + serverless is the JS driver with prepared-statement
 * caching disabled.
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { env } from '@/lib/env';
import * as schema from './schema';

// `prepare: false` is required when running on serverless platforms that may
// reuse connections across requests with different schemas. Safe to leave on
// for self-hosted too.
const client = postgres(env.DATABASE_URL, { prepare: false, max: 10 });

export const db = drizzle(client, { schema });
export type DB = typeof db;
