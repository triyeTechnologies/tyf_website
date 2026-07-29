/**
 * Writes both tables to CSV without going through the admin console.
 *
 *   npm run export                  -> ./exports/*.csv
 *   npm run export -- ./somewhere   -> custom directory
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { env } from '../server/config/env.js';
import { toCsv } from '../server/utils/csv.js';
import { closeDatabase } from '../server/db/index.js';
import * as waitlist from '../server/services/waitlist.service.js';
import * as pilots from '../server/services/pilot.service.js';

const outDir = path.resolve(process.argv[2] || path.join(env.ROOT_DIR, 'exports'));
fs.mkdirSync(outDir, { recursive: true });

const stamp = new Date().toISOString().slice(0, 10);

const datasets = [
  {
    file: `tyf-waitlist-${stamp}.csv`,
    rows: await waitlist.listAllForExport(),
    columns: [
      { key: 'id', header: 'ID' },
      { key: 'email', header: 'Email' },
      { key: 'source', header: 'Source' },
      { key: 'referrer', header: 'Referrer' },
      { key: 'created_at', header: 'Joined at (UTC)' },
    ],
  },
  {
    file: `tyf-pilots-${stamp}.csv`,
    rows: await pilots.listAllForExport(),
    columns: [
      { key: 'id', header: 'ID' },
      { key: 'company', header: 'Company' },
      { key: 'name', header: 'Contact' },
      { key: 'email', header: 'Email' },
      { key: 'phone', header: 'Phone' },
      { key: 'website', header: 'Website' },
      { key: 'segment', header: 'Segment' },
      { key: 'catalogue_size', header: 'Catalogue size' },
      { key: 'monthly_volume', header: 'Monthly volume' },
      { key: 'status', header: 'Status' },
      { key: 'message', header: 'Message' },
      { key: 'created_at', header: 'Received at (UTC)' },
    ],
  },
];

for (const dataset of datasets) {
  const target = path.join(outDir, dataset.file);
  fs.writeFileSync(target, toCsv(dataset.rows, dataset.columns), 'utf8');
  console.log(`${String(dataset.rows.length).padStart(5)} rows -> ${target}`);
}

await closeDatabase();
