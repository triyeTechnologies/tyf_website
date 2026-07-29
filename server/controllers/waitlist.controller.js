/** POST /api/v1/waitlist */
import { field } from '../utils/schema.js';
import { hashIp } from '../utils/crypto.js';
import { clientIp, userAgent, referrer } from '../utils/request.js';
import { logger } from '../utils/logger.js';
import * as waitlist from '../services/waitlist.service.js';
import * as stats from '../services/stats.service.js';

export const waitlistSchema = {
  email: field.email({ required: true }),
  source: field.string({ max: 60, fallback: 'site', label: 'Source' }),
  // Hidden input. Humans leave it empty; bots do not.
  company_website: field.honeypot(),
};

export async function join(req, res) {
  const { email, source } = req.valid;

  // Spam gets the same cheerful answer as everyone else, and no database row.
  if (req.isSpam) {
    logger.debug(`honeypot tripped on waitlist [${req.id}]`);
    res.status(202).json({ ok: true, data: { email, created: false } });
    return;
  }

  const { member, created } = await waitlist.join({
    email,
    source,
    referrer: referrer(req),
    userAgent: userAgent(req),
    ipHash: hashIp(clientIp(req)),
  });

  if (created) logger.info(`waitlist +1 — ${email} (${source})`);

  const { members } = await stats.publicStats();

  res.status(created ? 201 : 200).json({
    ok: true,
    data: {
      email: member.email,
      created,
      // Lets the page animate the live counter straight after a signup.
      members,
    },
    message: created
      ? "You're in. We'll write when access opens."
      : "You're already on the list — we'll be in touch.",
  });
}

export default { join, waitlistSchema };
