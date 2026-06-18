/**
 * Run Drizzle migrations from the command line.
 *
 * Why a custom script (instead of `drizzle-kit migrate`)?
 *   - We need `CREATE EXTENSION IF NOT EXISTS vector;` to run BEFORE any
 *     migration that defines a `vector` column.
 *   - `drizzle-kit` doesn't have a pre-migration hook, so we own the connection
 *     here.
 *
 * Invocation: `npm run db:migrate`
 */
import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

config({ path: '.env.local' });
config({ path: '.env' });

const url = process.env.DATABASE_URL;
if (!url) {
  // eslint-disable-next-line no-console
  console.error('DATABASE_URL is not set — copy .env.example to .env.local and fill it in.');
  process.exit(1);
}

async function main() {
  const sql = postgres(url!, { max: 1 });
  try {
    await sql`CREATE EXTENSION IF NOT EXISTS vector`;
    const db = drizzle(sql);
    await migrate(db, { migrationsFolder: './db/migrations' });
    // eslint-disable-next-line no-console
    console.log('✓ Migrations applied');
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Migration failed:', error);
  process.exit(1);
});
