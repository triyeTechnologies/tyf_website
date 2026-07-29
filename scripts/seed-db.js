/**
 * Fills the database with plausible rows so the admin console has something to
 * show while you are building. Development only.
 *
 *   npm run db:seed
 */
import process from 'node:process';
import { env } from '../server/config/env.js';
import * as waitlist from '../server/services/waitlist.service.js';
import * as pilots from '../server/services/pilot.service.js';
import { closeDatabase } from '../server/db/index.js';

if (env.IS_PROD) {
  console.error('Refusing to seed a production database.');
  process.exit(1);
}

const FIRST = ['aarav', 'diya', 'kabir', 'ananya', 'vihaan', 'isha', 'rohan', 'meera', 'arjun', 'sana'];
const LAST = ['sharma', 'nair', 'reddy', 'iyer', 'khan', 'bose', 'menon', 'gupta', 'shetty', 'rao'];
const SOURCES = ['site', 'hero', 'pricing', 'instagram', 'demo'];

let added = 0;
for (let index = 0; index < 60; index += 1) {
  const email = `${FIRST[index % FIRST.length]}.${LAST[(index * 3) % LAST.length]}${index}@example.com`;
  const { created } = await waitlist.join({
    email,
    source: SOURCES[index % SOURCES.length],
    referrer: 'https://seed.local/',
  });
  if (created) added += 1;
}

const COMPANIES = [
  ['Loom & Ledger', 'brand', '1,200 SKUs', '40k sessions'],
  ['Kanthari Retail', 'retail-store', '9 stores', '12k walk-ins'],
  ['Baazaar Online', 'marketplace', '85,000 SKUs', '900k sessions'],
];

for (const [company, segment, catalogueSize, monthlyVolume] of COMPANIES) {
  await pilots.create({
    name: 'Priya Menon',
    company,
    email: `pilots@${company.toLowerCase().replace(/[^a-z]+/g, '')}.example.com`,
    phone: '+91 98450 00000',
    website: `https://${company.toLowerCase().replace(/[^a-z]+/g, '')}.example.com`,
    segment,
    catalogueSize,
    monthlyVolume,
    message: 'Interested in the widget on product pages, plus kiosk mode in two flagship stores.',
  });
}

console.log(`Seeded ${added} waitlist members and ${COMPANIES.length} pilot requests.`);
await closeDatabase();
