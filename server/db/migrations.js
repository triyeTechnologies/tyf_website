/**
 * Schema migrations, applied in order and tracked in a `schema_migrations`
 * table (Postgres has no `user_version` pragma to lean on).
 *
 * Never edit a migration that has shipped — append a new one instead.
 *
 * These are NOT run on boot in production: several serverless instances can
 * start at once and would race each other. Run `npm run db:migrate` as a
 * deploy step instead. Local development migrates on start for convenience.
 */
import { transaction, one, query } from './index.js';
import { logger } from '../utils/logger.js';

export const migrations = [
  {
    id: 1,
    name: 'waitlist + pilot requests',
    async up(db) {
      await db.query(`
        CREATE TABLE waitlist_members (
          id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          -- normalised to lowercase before it ever reaches here, so a plain
          -- unique constraint is genuinely case-insensitive in practice
          email       text        NOT NULL UNIQUE,
          source      text        NOT NULL DEFAULT 'site',
          referrer    text,
          user_agent  text,
          ip_hash     text,
          created_at  timestamptz NOT NULL DEFAULT now()
        )
      `);
      await db.query('CREATE INDEX idx_waitlist_created_at ON waitlist_members (created_at DESC)');

      await db.query(`
        CREATE TABLE pilot_requests (
          id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          name            text        NOT NULL,
          company         text        NOT NULL,
          email           text        NOT NULL,
          phone           text,
          website         text,
          segment         text,
          catalogue_size  text,
          monthly_volume  text,
          message         text,
          status          text        NOT NULL DEFAULT 'new',
          user_agent      text,
          ip_hash         text,
          created_at      timestamptz NOT NULL DEFAULT now()
        )
      `);
      await db.query('CREATE INDEX idx_pilot_created_at ON pilot_requests (created_at DESC)');
      await db.query('CREATE INDEX idx_pilot_status ON pilot_requests (status)');
    },
  },
];

async function ensureMigrationsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id          integer     PRIMARY KEY,
      name        text        NOT NULL,
      applied_at  timestamptz NOT NULL DEFAULT now()
    )
  `);
}

/** Applies every migration that has not run yet. Safe to call repeatedly. */
export async function runMigrations() {
  await ensureMigrationsTable();

  const row = await one('SELECT COALESCE(MAX(id), 0) AS version FROM schema_migrations');
  const current = row?.version ?? 0;
  const pending = migrations.filter((migration) => migration.id > current);

  if (pending.length === 0) {
    logger.debug(`db schema up to date (v${current})`);
    return current;
  }

  let version = current;
  for (const migration of pending) {
    // Postgres runs DDL transactionally, so a failed migration leaves nothing
    // half-applied.
    await transaction(async (db) => {
      await migration.up(db);
      await db.run('INSERT INTO schema_migrations (id, name) VALUES ($1, $2)', [
        migration.id,
        migration.name,
      ]);
    });
    version = migration.id;
    logger.info(`db migrated to v${migration.id} — ${migration.name}`);
  }

  return version;
}

export default runMigrations;
