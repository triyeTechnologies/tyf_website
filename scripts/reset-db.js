/**
 * Drops every table and re-applies the migrations from scratch.
 * Requires --force, because this throws away real signups.
 *
 *   npm run db:reset -- --force
 */
import process from 'node:process';
import { query, closeDatabase } from '../server/db/index.js';
import { runMigrations } from '../server/db/migrations.js';
import { env } from '../server/config/env.js';

const force = process.argv.includes('--force');

if (!env.DATABASE_URL) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

if (!force) {
  console.error('Refusing to drop the tables without --force.');
  console.error(`  target: ${new URL(env.DATABASE_URL).hostname}`);
  console.error('  run:    npm run db:reset -- --force');
  process.exit(1);
}

if (env.IS_PROD) {
  console.error('Refusing to reset a production database.');
  console.error('If you really mean it, do it from the Supabase SQL editor.');
  process.exit(1);
}

try {
  await query('DROP TABLE IF EXISTS waitlist_members, pilot_requests, schema_migrations CASCADE');
  console.log('Tables dropped.');

  const version = await runMigrations();
  console.log(`Recreated at schema v${version}.`);
} catch (error) {
  console.error('Reset failed:', error.message);
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
