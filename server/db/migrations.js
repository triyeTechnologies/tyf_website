/**
 * Schema migrations, applied in order and tracked with SQLite's `user_version`.
 *
 * Never edit a migration that has shipped — append a new one instead.
 */
import { logger } from '../utils/logger.js';

export const migrations = [
  {
    id: 1,
    name: 'waitlist + pilot requests',
    up(db) {
      db.exec(`
        CREATE TABLE waitlist_members (
          id          INTEGER PRIMARY KEY AUTOINCREMENT,
          email       TEXT    NOT NULL UNIQUE COLLATE NOCASE,
          source      TEXT    NOT NULL DEFAULT 'site',
          referrer    TEXT,
          user_agent  TEXT,
          ip_hash     TEXT,
          created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
        );

        CREATE INDEX idx_waitlist_created_at ON waitlist_members (created_at DESC);

        CREATE TABLE pilot_requests (
          id              INTEGER PRIMARY KEY AUTOINCREMENT,
          name            TEXT    NOT NULL,
          company         TEXT    NOT NULL,
          email           TEXT    NOT NULL,
          phone           TEXT,
          website         TEXT,
          segment         TEXT,
          catalogue_size  TEXT,
          monthly_volume  TEXT,
          message         TEXT,
          status          TEXT    NOT NULL DEFAULT 'new',
          user_agent      TEXT,
          ip_hash         TEXT,
          created_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
        );

        CREATE INDEX idx_pilot_created_at ON pilot_requests (created_at DESC);
        CREATE INDEX idx_pilot_status     ON pilot_requests (status);
      `);
    },
  },
];

/** Runs every migration newer than the database's current `user_version`. */
export function runMigrations(db) {
  const { user_version: current } = db.prepare('PRAGMA user_version').get();
  const pending = migrations.filter((migration) => migration.id > current);

  if (pending.length === 0) {
    logger.debug(`db schema up to date (v${current})`);
    return current;
  }

  let version = current;
  for (const migration of pending) {
    db.exec('BEGIN');
    try {
      migration.up(db);
      // PRAGMA statements cannot be parameterised; the id is a literal in code.
      db.exec(`PRAGMA user_version = ${Number(migration.id)}`);
      db.exec('COMMIT');
      version = migration.id;
      logger.info(`db migrated to v${migration.id} — ${migration.name}`);
    } catch (error) {
      db.exec('ROLLBACK');
      throw new Error(`Migration ${migration.id} (${migration.name}) failed: ${error.message}`);
    }
  }
  return version;
}

export default runMigrations;
