/**
 * Numbers the site and the admin console display.
 *
 * Both functions here deliberately answer in a SINGLE query. They used to fan
 * out into one query per number and run them with Promise.all, which reads
 * beautifully and is the wrong shape for this deployment: the pool holds one
 * connection per serverless instance (see config/env.js), so "parallel" queries
 * queue behind each other on that one connection and the round trips add up
 * instead of overlapping. Counting six things in one pass over the table is
 * also less work for Postgres than six passes.
 */
import { one } from '../db/index.js';
import { env } from '../config/env.js';

/**
 * Public counter for the hero. STATS_BASELINE is an optional display offset and
 * defaults to 0, so out of the box this is the true row count.
 */
export async function publicStats() {
  const row = await one(
    `SELECT
       COUNT(*)::int                                                       AS members,
       COUNT(*) FILTER (WHERE created_at >= now() - interval '7 days')::int AS joined_this_week
     FROM waitlist_members`,
  );

  return {
    members: row.members + env.STATS_BASELINE,
    joinedThisWeek: row.joined_this_week,
  };
}

/**
 * Everything the admin dashboard puts above the tables, including the 30-day
 * sparkline — which is a set of rows rather than a single value, so it is
 * aggregated into JSON inside the same statement.
 */
export async function adminStats(days = 30) {
  const row = await one(
    `WITH members AS (
       SELECT
         COUNT(*)::int                                                        AS members,
         COUNT(*) FILTER (WHERE created_at >= now() - interval '1 day')::int  AS joined_today,
         COUNT(*) FILTER (WHERE created_at >= now() - interval '7 days')::int AS joined_this_week
       FROM waitlist_members
     ),
     requests AS (
       SELECT
         COUNT(*)::int                                     AS pilots,
         COUNT(*) FILTER (WHERE status = 'new')::int       AS pilots_new
       FROM pilot_requests
     ),
     by_day AS (
       SELECT COALESCE(
                json_agg(json_build_object('day', day, 'total', total) ORDER BY day),
                '[]'::json
              ) AS daily
       FROM (
         SELECT to_char(created_at, 'YYYY-MM-DD') AS day, COUNT(*)::int AS total
         FROM waitlist_members
         WHERE created_at >= now() - make_interval(days => $1)
         GROUP BY 1
       ) AS days
     )
     SELECT members.members, members.joined_today, members.joined_this_week,
            requests.pilots, requests.pilots_new, by_day.daily
     FROM members, requests, by_day`,
    [days],
  );

  return {
    members: row.members,
    joinedToday: row.joined_today,
    joinedThisWeek: row.joined_this_week,
    pilots: row.pilots,
    pilotsNew: row.pilots_new,
    daily: row.daily,
  };
}

export default { publicStats, adminStats };
