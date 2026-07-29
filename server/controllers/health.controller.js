/** GET /api/v1/health — liveness probe for uptime checks and deploys. */
import { ping } from '../db/index.js';
import { env } from '../config/env.js';

const startedAt = Date.now();

export async function health(req, res) {
  const reachable = await ping();

  res.status(reachable ? 200 : 503).json({
    ok: reachable,
    data: {
      status: reachable ? 'healthy' : 'degraded',
      environment: env.NODE_ENV,
      runtime: env.IS_SERVERLESS ? 'serverless' : 'server',
      // Meaningless on serverless, where every instance is minutes old.
      uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
      database: reachable ? 'up' : 'down',
      time: new Date().toISOString(),
    },
  });
}

export default { health };
