/** GET /api/v1/stats — the live numbers the landing page renders. */
import * as stats from '../services/stats.service.js';

export async function publicStats(req, res) {
  // Cheap to compute, fine to cache at the edge for a minute. On Vercel this
  // also keeps the function from being woken for every visitor.
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60');
  res.json({ ok: true, data: await stats.publicStats() });
}

export default { publicStats };
