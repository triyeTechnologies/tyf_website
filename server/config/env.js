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

const databasePath = str('DATABASE_PATH', 'data/tyf.db');

// An unset admin token in development gets a fresh random one each boot; in
// production we refuse to guess, and index.js turns this into a hard warning.
const configuredToken = str('ADMIN_TOKEN');
const ADMIN_TOKEN = configuredToken || crypto.randomBytes(24).toString('base64url');

// Used to hash IPs before storage — we keep abuse signal without keeping PII.
const IP_SALT = str('IP_SALT', crypto.createHash('sha256').update(ADMIN_TOKEN).digest('hex'));

export const env = Object.freeze({
  NODE_ENV,
  IS_PROD,
  IS_DEV: !IS_PROD,

  /* server */
  HOST: str('HOST', '0.0.0.0'),
  PORT: int('PORT', 3000),
  TRUST_PROXY: str('TRUST_PROXY', IS_PROD ? '1' : 'loopback'),

  /* paths */
  ROOT_DIR,
  PUBLIC_DIR: path.join(ROOT_DIR, 'public'),
  DATABASE_PATH: path.isAbsolute(databasePath)
    ? databasePath
    : path.join(ROOT_DIR, databasePath),

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
});

export default env;
