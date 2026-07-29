/**
 * Database connection.
 *
 * Backed by Node's built-in `node:sqlite`, so there is nothing to compile and
 * nothing to install. Every query in the app goes through this module — to move
 * to Postgres or better-sqlite3 later, this is the only file that changes.
 */
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { runMigrations } from './migrations.js';

function open() {
  fs.mkdirSync(path.dirname(env.DATABASE_PATH), { recursive: true });

  const connection = new DatabaseSync(env.DATABASE_PATH);
  connection.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
    PRAGMA synchronous = NORMAL;
  `);

  runMigrations(connection);
  logger.debug(`db ready at ${env.DATABASE_PATH}`);
  return connection;
}

export const db = open();

/** Runs `fn` inside a transaction, rolling back if it throws. */
export function transaction(fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

/**
 * `node:sqlite` returns null-prototype rows. Copying them into ordinary objects
 * keeps everything downstream (spread, JSON.stringify, template rendering) dull
 * and predictable.
 */
export const plain = (row) => (row ? { ...row } : null);
export const plainAll = (rows) => rows.map((row) => ({ ...row }));

export function closeDatabase() {
  try {
    db.close();
    logger.debug('db connection closed');
  } catch (error) {
    logger.warn('failed to close db cleanly:', error.message);
  }
}

export default db;
