/**
 * Environment configuration — the single source of truth for every tunable.
 *
 * Nothing else in the codebase reads `process.env` directly. Import `env`
 * instead, so the whole surface of configuration is visible in one file.
 */
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

/** Absolute path to the repository root. */
export const ROOT_DIR = path.resolve(HERE, '..', '..');

// Node >= 20.12 reads .env files natively, so we need no dotenv dependency.
try {
  process.loadEnvFile(path.join(ROOT_DIR, '.env'));
} catch {
  /* .env is optional — defaults below cover local development. */
}

/* ── typed readers ─────────────────────────────────────────────────────── */

const str = (key, fallback = '') => {
  const raw = process.env[key];
  return raw === undefined || raw.trim() === '' ? fallback : raw.trim();
};

const int = (key, fallback) => {
  const parsed = Number.parseInt(process.env[key] ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const bool = (key, fallback = false) => {
  const raw = str(key).toLowerCase();
  if (raw === '') return fallback;
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
};

const list = (key, fallback = []) => {
  const raw = str(key);
  if (!raw) return fallback;
  return raw.split(',').map((part) => part.trim()).filter(Boolean);
};

/* ── derived values ────────────────────────────────────────────────────── */

const NODE_ENV = str('NODE_ENV', 'development');
const IS_PROD = NODE_ENV === 'production';

// Vercel sets this on every deployment. It tells us we are short-lived and
// horizontally scaled: keep connection pools tiny, never migrate on boot.
const IS_SERVERLESS = str('VERCEL') !== '' || str('AWS_LAMBDA_FUNCTION_NAME') !== '';

// An unset admin token in development gets a fresh random one each boot; in
// production we refuse to guess, and index.js turns this into a hard warning.
const configuredToken = str('ADMIN_TOKEN');
const ADMIN_TOKEN = configuredToken || crypto.randomBytes(24).toString('base64url');

// Used to hash IPs before storage — we keep abuse signal without keeping PII.
const IP_SALT = str('IP_SALT', crypto.createHash('sha256').update(ADMIN_TOKEN).digest('hex'));

const DATABASE_URL = str('DATABASE_URL') || str('POSTGRES_URL');

// A managed Postgres always speaks TLS; the one in docker-compose.yml never
// does. Deciding from the host means neither .env needs a DATABASE_SSL line —
// and a local database can no longer fail with a confusing TLS error.
// `postgres` is the compose service name, for when the app itself runs in Docker.
const LOCAL_DB_HOSTS = new Set(['localhost', '127.0.0.1', '::1', 'host.docker.internal', 'postgres']);

function databaseHostname(url) {
  try {
    // URL wraps IPv6 literals in brackets; strip them to match the set above.
    return new URL(url).hostname.replace(/^\[|\]$/g, '');
  } catch {
    return '';
  }
}

const DATABASE_IS_LOCAL = LOCAL_DB_HOSTS.has(databaseHostname(DATABASE_URL));

export const env = Object.freeze({
  NODE_ENV,
  IS_PROD,
  IS_DEV: !IS_PROD,
  IS_SERVERLESS,

  /* server */
  HOST: str('HOST', '0.0.0.0'),
  PORT: int('PORT', 3000),
  // Vercel always sits behind its own proxy, so trust one hop there.
  TRUST_PROXY: str('TRUST_PROXY', IS_SERVERLESS || IS_PROD ? '1' : 'loopback'),

  /* paths */
  ROOT_DIR,
  PUBLIC_DIR: path.join(ROOT_DIR, 'public'),

  /* database — Supabase Postgres in production, docker-compose locally.
     Use the *transaction pooler* connection string (port 6543), not the
     direct one: serverless instances open and drop connections constantly,
     and the direct port runs out of them fast. */
  DATABASE_URL,
  DATABASE_IS_LOCAL,
  DATABASE_POOL_MAX: int('DATABASE_POOL_MAX', IS_SERVERLESS ? 1 : 10),
  DATABASE_SSL: bool('DATABASE_SSL', !DATABASE_IS_LOCAL),

  /* distributed rate limiting — optional.
     Without these the limiter falls back to per-instance memory, which is
     fine locally and weak on serverless. */
  UPSTASH_REDIS_REST_URL: str('UPSTASH_REDIS_REST_URL') || str('KV_REST_API_URL'),
  UPSTASH_REDIS_REST_TOKEN: str('UPSTASH_REDIS_REST_TOKEN') || str('KV_REST_API_TOKEN'),

  /* security */
  ADMIN_TOKEN,
  ADMIN_TOKEN_IS_GENERATED: configuredToken === '',
  ADMIN_SESSION_HOURS: int('ADMIN_SESSION_HOURS', 12),
  IP_SALT,
  ALLOWED_ORIGINS: list('ALLOWED_ORIGINS'), // empty = same-origin only
  ENABLE_CSP: bool('ENABLE_CSP', true),

  /* rate limiting */
  RATE_LIMIT: Object.freeze({
    WINDOW_MS: int('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000),
    READ_MAX: int('RATE_LIMIT_READ_MAX', 240),
    WRITE_MAX: int('RATE_LIMIT_WRITE_MAX', 8),
    LOGIN_MAX: int('RATE_LIMIT_LOGIN_MAX', 10),
  }),

  /* product */
  // Optional display offset for the public counter. Defaults to 0 so the
  // number on the site is the real number of rows in the table.
  STATS_BASELINE: int('STATS_BASELINE', 0),
  CONTACT_EMAIL: str('CONTACT_EMAIL', 'hello@triyetech.com'),

  /* logging */
  LOG_LEVEL: str('LOG_LEVEL', IS_PROD ? 'info' : 'debug'),

  /* error reporting — optional.
     Unset, nothing is sent anywhere and no account is needed, which is what
     local development wants. */
  SENTRY_DSN: str('SENTRY_DSN'),
  // Vercel sets the commit hash on every deployment; it lets a reported error
  // name the exact code that produced it.
  RELEASE: str('VERCEL_GIT_COMMIT_SHA').slice(0, 7),
});

export default env;
