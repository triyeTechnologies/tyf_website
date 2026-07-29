/**
 * Express application assembly.
 *
 * Order matters and is the whole point of this file: context → security →
 * parsing → routes → static site → 404 → error handler.
 */
import path from 'node:path';
import express from 'express';
import { env } from './config/env.js';
import { requestContext } from './middleware/request-context.js';
import { requestLogger } from './middleware/request-logger.js';
import { securityHeaders } from './middleware/security-headers.js';
import { cors } from './middleware/cors.js';
import { cookieParser } from './middleware/cookies.js';
import { notFoundHandler } from './middleware/not-found.js';
import { errorHandler } from './middleware/error-handler.js';
import { apiRouter } from './routes/index.js';
import { adminRouter } from './routes/admin.routes.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY);
  app.set('etag', 'strong');

  /* ── context & policy ── */
  app.use(requestContext);
  app.use(securityHeaders);
  app.use(cors);
  app.use(requestLogger);

  /* ── body parsing (small limits: these are forms, not uploads) ── */
  app.use(express.json({ limit: '32kb' }));
  app.use(express.urlencoded({ extended: false, limit: '32kb' }));
  app.use(cookieParser);

  /* ── application routes ── */
  app.use('/api/v1', apiRouter);
  app.use('/admin', adminRouter);

  /* ── the site itself ── */
  app.use(
    express.static(env.PUBLIC_DIR, {
      index: 'index.html',
      extensions: ['html'],
      maxAge: env.IS_PROD ? '7d' : 0,
      setHeaders(res, filePath) {
        // The page is one file that changes on every deploy — always revalidate
        // it, while fingerprint-free assets around it may sit in cache.
        if (path.extname(filePath) === '.html') {
          res.setHeader('Cache-Control', 'no-cache');
        }
      },
    }),
  );

  /* ── tail ── */
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createApp;
