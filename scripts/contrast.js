/**
 * Checks the palette against WCAG, from the tokens as they actually are.
 *
 *   npm run contrast
 *
 * WHY THIS EXISTS
 * The accent has changed five times. Every change moved it somewhere new on
 * the luminance scale, and each time two things had to move with it: which of
 * black or white sits on a fill, and whether --neon-deep is a lighter or a
 * darker cut. Getting either wrong is not a subtle bug — it is a button label
 * you cannot read, or an error code that renders invisible — and neither is
 * caught by any test that only asks whether the page still loads.
 *
 * So this reads the tokens out of the stylesheet and does the arithmetic,
 * rather than trusting a comment written during the previous colour.
 *
 * Thresholds are WCAG 2.1 AA: 4.5:1 for body text, 3:1 for large text and for
 * UI components such as borders and focus rings.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = path.resolve(import.meta.dirname, '..');

/* ── colour maths ──────────────────────────────────────────────────────── */

const channel = (c) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};

const luminance = (hex) => {
  const n = Number.parseInt(hex.slice(1), 16);
  return (
    0.2126 * channel((n >> 16) & 255) +
    0.7152 * channel((n >> 8) & 255) +
    0.0722 * channel(n & 255)
  );
};

const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

/* ── read the palette as it stands ─────────────────────────────────────── */

const page = fs.readFileSync(path.join(ROOT, 'public/index.html'), 'utf8');

const token = (name) => {
  const found = page.match(new RegExp(`--${name}\\s*:\\s*(#[0-9a-f]{6})`, 'i'));
  if (!found) throw new Error(`--${name} not found in public/index.html`);
  return found[1].toUpperCase();
};

const BLACK = token('black');
const WHITE = token('white');
const ACCENT = token('neon');
const MARK = token('neon-deep');

/* ── the checks ────────────────────────────────────────────────────────── */

const results = [];
const check = (label, ratio, need, note = '') =>
  results.push({ label, ratio, need, pass: ratio >= need, note });

check('--neon-deep as text on the page', contrast(MARK, BLACK), 4.5,
  'small accent text: headings, chips, links, strokes');
check('--neon as a border or fill edge', contrast(ACCENT, BLACK), 3,
  'UI components need 3:1, not 4.5:1');

// Which text colour belongs on a fill is not a preference — usually only one
// of the two clears the bar, and this says which.
const onBlack = contrast(BLACK, ACCENT);
const onWhite = contrast(WHITE, ACCENT);
const better = onBlack >= onWhite ? 'black' : 'white';
check(`text on an --neon fill (best is ${better})`, Math.max(onBlack, onWhite), 4.5,
  `black ${onBlack.toFixed(2)}:1 · white ${onWhite.toFixed(2)}:1`);

/* ── does the stylesheet agree with the arithmetic? ────────────────────── */

const fillBlocks = page
  .split('}')
  .filter((block) => block.includes('background:var(--neon)'))
  .map((block) => block.replace(/border-color:var\([^)]*\)/g, ''));

const usesBlack = fillBlocks.filter((b) => b.includes('color:var(--black)')).length;
const usesWhite = fillBlocks.filter((b) => b.includes('color:var(--white)')).length;
const wrong = better === 'black' ? usesWhite : usesBlack;

check(`fills use ${better} text as the maths requires`, wrong === 0 ? 1 : 0, 1,
  `${usesBlack} block(s) black, ${usesWhite} white — ${wrong} on the wrong one`);

/* ── report ────────────────────────────────────────────────────────────── */

console.log(`\n  accent      ${ACCENT}`);
console.log(`  mark cut    ${MARK}   (${luminance(MARK) > luminance(ACCENT) ? 'lighter' : 'darker'} than the accent)`);
console.log(`  page        ${BLACK}\n`);

for (const r of results) {
  const ratio = r.need === 1 ? '' : `${r.ratio.toFixed(2)}:1 / ${r.need}:1`.padEnd(16);
  console.log(`  ${r.pass ? 'PASS' : 'FAIL'}  ${r.label.padEnd(44)} ${ratio}`);
  if (!r.pass || r.note) console.log(`        ${r.note}`);
}

const failed = results.filter((r) => !r.pass);
console.log(failed.length ? `\n  ${failed.length} problem(s) with this palette.\n` : '\n  Palette is sound.\n');
process.exit(failed.length ? 1 : 0);
