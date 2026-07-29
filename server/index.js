/**
 * Entry point: boot the app, print a banner, shut down cleanly.
 */
import process from 'node:process';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { closeDatabase } from './db/index.js';
import { runMigrations } from './db/migrations.js';
import { logger, paint } from './utils/logger.js';

/** Host and database name only — never print the password in the banner. */
function describeDatabase() {
  if (!env.DATABASE_URL) return 'not configured — set DATABASE_URL';
  try {
    const url = new URL(env.DATABASE_URL);
    return `${url.hostname}${url.pathname}`;
  } catch {
    return 'configured';
  }
}

const app = createApp();

// Convenience for local work only. In production several instances start at
// once and would race each other, so migrations are a deploy step there:
//   npm run db:migrate
if (env.IS_DEV) {
  try {
    await runMigrations();
  } catch (error) {
    logger.error('could not migrate the database:', error.message);
    logger.error('Is DATABASE_URL set in .env?');
    process.exit(1);
  }
}

const server = app.listen(env.PORT, env.HOST, () => {
  const shown = env.HOST === '0.0.0.0' ? 'localhost' : env.HOST;
  const base = `http://${shown}:${env.PORT}`;

  // ASCII only — box-drawing characters garble in the legacy Windows console.
  console.log('');
  console.log(paint.bold('  TyF  ') + paint.dim('- try your fit'));
  console.log(paint.dim('  ---------------------------------------------'));
  console.log(`  site    ${paint.lime(base)}`);
  console.log(`  admin   ${paint.violet(`${base}/admin`)}`);
  console.log(`  api     ${paint.dim(`${base}/api/v1/health`)}`);
  console.log(`  env     ${paint.dim(env.NODE_ENV)}`);
  console.log(`  db      ${paint.dim(describeDatabase())}`);
  console.log('');

  if (env.ADMIN_TOKEN_IS_GENERATED) {
    if (env.IS_PROD) {
      logger.error('ADMIN_TOKEN is not set. A random one was generated and will change on restart.');
      logger.error('Set ADMIN_TOKEN in .env before serving production traffic.');
    } else {
      logger.warn(`No ADMIN_TOKEN set — using this one for now: ${env.ADMIN_TOKEN}`);
      logger.warn('Copy it into .env to keep the same token across restarts.');
    }
    console.log('');
  }
});

/**
 * A listen failure must be loud and must exit non-zero — otherwise a process
 * manager sees a clean exit and reports the deploy as successful while nothing
 * is actually serving.
 */
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    logger.error(`Port ${env.PORT} is already in use — something else is serving on it.`);
    logger.error(`Stop that process, or start this one with a different PORT.`);
  } else if (error.code === 'EACCES') {
    logger.error(`Not allowed to bind port ${env.PORT}. Ports below 1024 need elevated rights.`);
  } else {
    logger.error('server failed to start:', error);
  }
  process.exit(1);
});

/* ── graceful shutdown ─────────────────────────────────────────────────── */

let shuttingDown = false;

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`${signal} received — shutting down`);

  const forced = setTimeout(() => {
    logger.warn('shutdown timed out, exiting anyway');
    process.exit(1);
  }, 8000);
  forced.unref();

  server.close(() => {
    closeDatabase();
    logger.info('bye');
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  logger.error('unhandled promise rejection:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('uncaught exception:', error);
  shutdown('uncaughtException');
});

export default server;
