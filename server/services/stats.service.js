/** Numbers the site and the admin console display. */
import { env } from '../config/env.js';
import * as waitlist from './waitlist.service.js';
import * as pilots from './pilot.service.js';

const daysAgoIso = (days) => new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 19) + 'Z';

/**
 * Public counter for the hero. STATS_BASELINE is an optional display offset and
 * defaults to 0, so out of the box this is the true row count.
 */
export function publicStats() {
  return {
    members: waitlist.countMembers() + env.STATS_BASELINE,
    joinedThisWeek: waitlist.countSince(daysAgoIso(7)),
  };
}

/** Everything the admin dashboard puts above the tables. */
export function adminStats() {
  return {
    members: waitlist.countMembers(),
    joinedToday: waitlist.countSince(daysAgoIso(1)),
    joinedThisWeek: waitlist.countSince(daysAgoIso(7)),
    pilots: pilots.countRequests(),
    pilotsNew: pilots.countNew(),
    daily: waitlist.dailySignups(daysAgoIso(30)),
  };
}

export default { publicStats, adminStats };
