/**
 * Keeps the CSP script hashes in step with the page.
 *
 *   node scripts/csp-hashes.js          print the script-src line
 *   node scripts/csp-hashes.js --check  fail if vercel.json is out of date
 *
 * WHY THIS EXISTS
 * `script-src` names a SHA-256 of every inline <script> on the page instead of
 * allowing inline scripts wholesale. That means an injected <script> cannot
 * run — but it also means editing any inline script changes its hash, and a
 * stale hash does not warn you: the browser silently refuses to run the code.
 * Run `--check` after editing index.html, or in CI, and it will tell you.
 *
 * The hash must be taken over the bytes the browser receives. .gitattributes
 * normalises the repository to LF while the working copy on Windows is CRLF,
 * so the file on disk here is NOT what Vercel serves. Normalising first is the
 * difference between this working and every script on the page dying.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';

const ROOT = path.resolve(import.meta.dirname, '..');
const PAGE = path.join(ROOT, 'public/index.html');
const CONFIG = path.join(ROOT, 'vercel.json');

/** SHA-256 of each inline <script>, base64, as CSP spells it. */
export function hashesFor(html) {
  const lf = html.replace(/\r\n/g, '\n');
  return [...lf.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(
    (match) => `'sha256-${crypto.createHash('sha256').update(match[1], 'utf8').digest('base64')}'`,
  );
}

const hashes = hashesFor(fs.readFileSync(PAGE, 'utf8'));
const directive = `script-src 'self' ${hashes.join(' ')}`;

if (!process.argv.includes('--check')) {
  console.log(`${hashes.length} inline scripts\n\n${directive}`);
  process.exit(0);
}

const config = JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
const csp = config.headers
  .flatMap((entry) => entry.headers)
  .find((header) => header.key === 'Content-Security-Policy')?.value;

if (!csp) {
  console.error('No Content-Security-Policy found in vercel.json.');
  process.exit(1);
}

const missing = hashes.filter((hash) => !csp.includes(hash));
const stale = [...csp.matchAll(/'sha256-[A-Za-z0-9+/=]+'/g)]
  .map((match) => match[0])
  .filter((hash) => !hashes.includes(hash));

if (missing.length === 0 && stale.length === 0) {
  console.log(`CSP is in step with the page — ${hashes.length} script hashes match.`);
  process.exit(0);
}

console.error('vercel.json is out of date with public/index.html.\n');
for (const hash of missing) console.error(`  missing: ${hash}`);
for (const hash of stale) console.error(`  stale:   ${hash}`);
console.error(`\nReplace the script-src in vercel.json with:\n\n  ${directive}\n`);
process.exit(1);
