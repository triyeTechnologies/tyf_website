/** POST /api/v1/pilot */
import { field } from '../utils/schema.js';
import { hashIp } from '../utils/crypto.js';
import { clientIp, userAgent } from '../utils/request.js';
import { logger } from '../utils/logger.js';
import * as pilots from '../services/pilot.service.js';

export const pilotSchema = {
  name: field.string({ required: true, min: 2, max: 120, label: 'Name' }),
  company: field.string({ required: true, min: 2, max: 160, label: 'Company' }),
  email: field.email({ required: true, label: 'Work email' }),
  phone: field.phone({ label: 'Phone' }),
  website: field.url({ label: 'Website' }),
  segment: field.oneOf(pilots.SEGMENTS, { label: 'Segment' }),
  catalogueSize: field.string({ max: 60, label: 'Catalogue size' }),
  monthlyVolume: field.string({ max: 60, label: 'Monthly volume' }),
  message: field.text({ max: 1200, label: 'Message' }),
  company_website: field.honeypot(),
};

export function request(req, res) {
  if (req.isSpam) {
    logger.debug(`honeypot tripped on pilot form [${req.id}]`);
    res.status(202).json({ ok: true, data: { received: true } });
    return;
  }

  const record = pilots.create({
    ...req.valid,
    userAgent: userAgent(req),
    ipHash: hashIp(clientIp(req)),
  });

  logger.info(`pilot request — ${record.company} <${record.email}>`);

  res.status(201).json({
    ok: true,
    data: { id: record.id, received: true },
    message: "Got it. We'll come back to you within two working days.",
  });
}

export default { request, pilotSchema };
