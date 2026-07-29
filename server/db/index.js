/**
 * Database connection — Supabase Postgres over the `pg` driver.
 *
 * Every query in the app goes through this module. Services call `one`,
 * `many` or `run`; nothing else imports `pg`.
 *
 * Serverless shapes two decisions here:
 *   · the pool is created lazily, so importing this file during a build (when
 *     DATABASE_URL is not set yet) cannot throw;
 *   · the pool holds a single connection per instance, because each warm
 *     Lambda keeps its own and Postgres runs out of slots long before you run
 *     out of traffic. Point DATABASE_URL at Supabase's transaction pooler.
 */
import pg from 'pg';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const { Pool, types } = pg;

// COUNT(*) is bigint, which the driver hands back as a string to protect
// precision. Every count in this app is small, so read them as numbers.
types.setTypeParser(types.builtins.INT8, (value) => Number.parseInt(value, 10));

let pool = null;

/** The connection pool, created on first use. */
export function getPool() {
  if (pool) return pool;

  if (!env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL is not set. Copy the Supabase transaction-pooler ' +
        'connection string into .env (or the Vercel project settings).',
    );
  }

  pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: env.DATABASE_POOL_MAX,
    idleTimeoutMillis: env.IS_SERVERLESS ? 10_000 : 30_000,
    connectionTimeoutMillis: 10_000,
    // Supabase terminates TLS with its own CA; verifying it needs the cert
    // bundle shipped with the project, which we do not have here.
    ssl: env.DATABASE_SSL ? { rejectUnauthorized: false } : false,
  });

  // A pooled client can die between requests (Supabase recycles them). That
  // surfaces as an error on the idle client, which would be fatal if unhandled.
  pool.on('error', (error) => {
    logger.error('idle postgres client error:', error.message);
  });

  logger.debug(`postgres pool ready (max ${env.DATABASE_POOL_MAX})`);
  return pool;
}

/**
 * Runs a query. Parameters are always bound, never interpolated.
 * @param {string} text SQL with $1, $2 … placeholders
 * @param {unknown[]} [params]
 */
export async function query(text, params = []) {
  const started = Date.now();
  try {
    const result = await getPool().query(text, params);
    const ms = Date.now() - started;
    if (ms > 400) logger.warn(`slow query (${ms}ms): ${text.replace(/\s+/g, ' ').slice(0, 90)}…`);
    return result;
  } catch (error) {
    logger.error(`query failed: ${text.replace(/\s+/g, ' ').slice(0, 90)}…`);
    throw error;
  }
}

/** First row, or null. */
export const one = async (text, params) => (await query(text, params)).rows[0] ?? null;

/** All rows. */
export const many = async (text, params) => (await query(text, params)).rows;

/** Row count affected. */
export const run = async (text, params) => (await query(text, params)).rowCount;

/**
 * Runs `fn` inside a transaction on a dedicated client, rolling back on throw.
 * `fn` receives an object with the same one/many/run helpers, bound to that
 * client — using the pool helpers inside would borrow a different connection.
 */
export async function transaction(fn) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const scoped = {
      query: (text, params) => client.query(text, params),
      one: async (text, params) => (await client.query(text, params)).rows[0] ?? null,
      many: async (text, params) => (await client.query(text, params)).rows,
      run: async (text, params) => (await client.query(text, params)).rowCount,
    };
    const result = await fn(scoped);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/** True when the database answers. Used by the health probe. */
export async function ping() {
  try {
    await query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

export async function closeDatabase() {
  if (!pool) return;
  try {
    await pool.end();
    pool = null;
    logger.debug('postgres pool closed');
  } catch (error) {
    logger.warn('failed to close the pool cleanly:', error.message);
  }
}

export default { query, one, many, run, transaction, ping, closeDatabase };
