/**
 * Applies any pending migrations. Safe to run repeatedly.
 *
 *   npm run db:migrate
 *
 * Run this once after provisioning the database, and as a deploy step whenever
 * a migration is added. It is deliberately not run automatically on Vercel:
 * several instances boot at once and would race each other.
 */
import process from 'node:process';
import { runMigrations } from '../server/db/migrations.js';
import { closeDatabase } from '../server/db/index.js';
import { env } from '../server/config/env.js';

if (!env.DATABASE_URL) {
  console.error('DATABASE_URL is not set.');
  console.error('  local:      npm run db:up   (then copy .env.example to .env)');
  console.error('  production: vercel env pull .env');
  process.exit(1);
}

try {
  const version = await runMigrations();
  console.log(`Database is at schema v${version}.`);
} catch (error) {
  console.error('Migration failed:', error.message);
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
