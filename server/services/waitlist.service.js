/** Everything the app knows how to do with a waitlist member. */
import { db, plain, plainAll } from '../db/index.js';

const INSERT = db.prepare(`
  INSERT INTO waitlist_members (email, source, referrer, user_agent, ip_hash)
  VALUES (?, ?, ?, ?, ?)
`);

const FIND_BY_EMAIL = db.prepare('SELECT * FROM waitlist_members WHERE email = ? COLLATE NOCASE');
const COUNT = db.prepare('SELECT COUNT(*) AS total FROM waitlist_members');
const COUNT_SINCE = db.prepare('SELECT COUNT(*) AS total FROM waitlist_members WHERE created_at >= ?');
const COUNT_SEARCH = db.prepare(`
  SELECT COUNT(*) AS total FROM waitlist_members
  WHERE (? = '' OR email LIKE ? COLLATE NOCASE OR source LIKE ? COLLATE NOCASE)
`);
const PAGE = db.prepare(`
  SELECT id, email, source, referrer, created_at
  FROM waitlist_members
  WHERE (? = '' OR email LIKE ? COLLATE NOCASE OR source LIKE ? COLLATE NOCASE)
  ORDER BY created_at DESC, id DESC
  LIMIT ? OFFSET ?
`);
const ALL_FOR_EXPORT = db.prepare(`
  SELECT id, email, source, referrer, created_at
  FROM waitlist_members
  ORDER BY created_at DESC, id DESC
`);
const DAILY = db.prepare(`
  SELECT substr(created_at, 1, 10) AS day, COUNT(*) AS total
  FROM waitlist_members
  WHERE created_at >= ?
  GROUP BY day
  ORDER BY day ASC
`);

/**
 * Adds a member. Signing up twice is a no-op that still reports success —
 * telling a stranger "that address is already on the list" leaks membership.
 *
 * @returns {{ member: object, created: boolean }}
 */
export function join({ email, source = 'site', referrer = null, userAgent = null, ipHash = null }) {
  const existing = plain(FIND_BY_EMAIL.get(email));
  if (existing) return { member: existing, created: false };

  try {
    INSERT.run(email, source, referrer, userAgent, ipHash);
  } catch (error) {
    // A race between the check and the insert still lands on the UNIQUE index.
    if (!/UNIQUE/i.test(error.message)) throw error;
    return { member: plain(FIND_BY_EMAIL.get(email)), created: false };
  }

  return { member: plain(FIND_BY_EMAIL.get(email)), created: true };
}

export const countMembers = () => COUNT.get().total;

export const countSince = (isoDate) => COUNT_SINCE.get(isoDate).total;

/** Paged list for the admin console. */
export function list({ search = '', limit = 50, offset = 0 } = {}) {
  const like = `%${search}%`;
  return {
    rows: plainAll(PAGE.all(search, like, like, limit, offset)),
    total: COUNT_SEARCH.get(search, like, like).total,
  };
}

export const listAllForExport = () => plainAll(ALL_FOR_EXPORT.all());

export const dailySignups = (sinceIso) => plainAll(DAILY.all(sinceIso));

export default { join, countMembers, countSince, list, listAllForExport, dailySignups };
