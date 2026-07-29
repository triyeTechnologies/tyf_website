/**
 * Deletes the SQLite database so the next boot starts from empty migrations.
 * Requires --force, because this throws away real signups.
 *
 *   npm run db:reset -- --force
 */
import fs from 'node:fs';
import process from 'node:process';
import { env } from '../server/config/env.js';

const force = process.argv.includes('--force');

if (!force) {
  console.error('Refusing to delete the database without --force.');
  console.error(`  target: ${env.DATABASE_PATH}`);
  console.error('  run:    npm run db:reset -- --force');
  process.exit(1);
}

let removed = 0;
for (const suffix of ['', '-wal', '-shm']) {
  const file = `${env.DATABASE_PATH}${suffix}`;
  if (!fs.existsSync(file)) continue;

  try {
    fs.rmSync(file);
    removed += 1;
    console.log(`removed ${file}`);
  } catch (error) {
    // On Windows the file cannot be deleted while the server holds it open.
    if (error.code === 'EBUSY' || error.code === 'EPERM') {
      console.error(`Cannot delete ${file} — the server still has it open.`);
      console.error('Stop the server (Ctrl+C) and run this again.');
      process.exit(1);
    }
    throw error;
  }
}

console.log(removed ? 'Database reset. It will be recreated on next start.' : 'Nothing to remove.');
