/** Numbers the site and the admin console display. */
import { env } from '../config/env.js';
import * as waitlist from './waitlist.service.js';
import * as pilots from './pilot.service.js';

/**
 * Public counter for the hero. STATS_BASELINE is an optional display offset and
 * defaults to 0, so out of the box this is the true row count.
 */
export async function publicStats() {
  const [members, joinedThisWeek] = await Promise.all([
    waitlist.countMembers(),
    waitlist.countSince(7),
  ]);

  return { members: members + env.STATS_BASELINE, joinedThisWeek };
}

/** Everything the admin dashboard puts above the tables. */
export async function adminStats() {
  // Six round trips run as one, which matters when the database is a network
  // hop away rather than a file on the same disk.
  const [members, joinedToday, joinedThisWeek, pilotCount, pilotsNew, daily] = await Promise.all([
    waitlist.countMembers(),
    waitlist.countSince(1),
    waitlist.countSince(7),
    pilots.countRequests(),
    pilots.countNew(),
    waitlist.dailySignups(30),
  ]);

  return { members, joinedToday, joinedThisWeek, pilots: pilotCount, pilotsNew, daily };
}

export default { publicStats, adminStats };
