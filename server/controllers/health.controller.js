/** GET /api/v1/health — liveness probe for uptime checks and deploys. */
import { db } from '../db/index.js';
import { env } from '../config/env.js';

const startedAt = Date.now();

export function health(req, res) {
  let database = 'up';
  try {
    db.prepare('SELECT 1 AS ok').get();
  } catch {
    database = 'down';
  }

  const ok = database === 'up';
  res.status(ok ? 200 : 503).json({
    ok,
    data: {
      status: ok ? 'healthy' : 'degraded',
      environment: env.NODE_ENV,
      uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
      database,
      time: new Date().toISOString(),
    },
  });
}

export default { health };
