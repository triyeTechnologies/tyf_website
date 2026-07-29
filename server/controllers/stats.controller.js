/** GET /api/v1/stats — the live numbers the landing page renders. */
import * as stats from '../services/stats.service.js';

export function publicStats(req, res) {
  // Cheap to compute, fine to cache at the edge for a minute.
  res.setHeader('Cache-Control', 'public, max-age=60');
  res.json({ ok: true, data: stats.publicStats() });
}

export default { publicStats };
