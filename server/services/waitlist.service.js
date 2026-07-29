/** Everything the app knows how to do with a waitlist member. */
import { one, many } from '../db/index.js';

/**
 * Adds a member. Signing up twice succeeds and reports `created: false` —
 * answering "that address is already registered" would tell any stranger who
 * is on the list.
 *
 * `ON CONFLICT DO NOTHING` makes this one atomic statement, so two concurrent
 * signups with the same address cannot race each other.
 *
 * @returns {Promise<{ member: object, created: boolean }>}
 */
export async function join({
  email,
  source = 'site',
  referrer = null,
  userAgent = null,
  ipHash = null,
}) {
  const inserted = await one(
    `INSERT INTO waitlist_members (email, source, referrer, user_agent, ip_hash)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (email) DO NOTHING
     RETURNING *`,
    [email, source, referrer, userAgent, ipHash],
  );

  if (inserted) return { member: inserted, created: true };

  // Conflict: the address was already there.
  const existing = await one('SELECT * FROM waitlist_members WHERE email = $1', [email]);
  return { member: existing, created: false };
}

export async function countMembers() {
  const row = await one('SELECT COUNT(*)::int AS total FROM waitlist_members');
  return row.total;
}

/** How many joined within the last `days` days. */
export async function countSince(days) {
  const row = await one(
    `SELECT COUNT(*)::int AS total
     FROM waitlist_members
     WHERE created_at >= now() - make_interval(days => $1)`,
    [days],
  );
  return row.total;
}

/** Paged list for the admin console. */
export async function list({ search = '', limit = 50, offset = 0 } = {}) {
  const like = `%${search}%`;

  const rows = await many(
    `SELECT id, email, source, referrer, created_at
     FROM waitlist_members
     WHERE $1 = '' OR email ILIKE $2 OR source ILIKE $2
     ORDER BY created_at DESC, id DESC
     LIMIT $3 OFFSET $4`,
    [search, like, limit, offset],
  );

  const total = await one(
    `SELECT COUNT(*)::int AS total
     FROM waitlist_members
     WHERE $1 = '' OR email ILIKE $2 OR source ILIKE $2`,
    [search, like],
  );

  return { rows, total: total.total };
}

export const listAllForExport = () =>
  many(`SELECT id, email, source, referrer, created_at
        FROM waitlist_members
        ORDER BY created_at DESC, id DESC`);

/** Signups per day for the admin sparkline. */
export const dailySignups = (days) =>
  many(
    `SELECT to_char(created_at, 'YYYY-MM-DD') AS day, COUNT(*)::int AS total
     FROM waitlist_members
     WHERE created_at >= now() - make_interval(days => $1)
     GROUP BY day
     ORDER BY day ASC`,
    [days],
  );

export default { join, countMembers, countSince, list, listAllForExport, dailySignups };
