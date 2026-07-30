/**
 * Renders the social share card to public/images/og.png.
 *
 *   npm i --no-save satori @resvg/resvg-js
 *   node scripts/make-og.js
 *
 * Not part of the install: the two packages are heavy, native in one case, and
 * needed about once a year. The card is committed as a PNG — this script only
 * exists so the next edit is a text change rather than a design job.
 *
 * PNG rather than WebP deliberately. WhatsApp, LinkedIn and Slack fetch this
 * with their own scrapers, and their WebP support is uneven in a way you only
 * discover from a blank preview after the link is already out.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'public/images/og.png');

/**
 * Static TrueType, fetched by asking Google Fonts as a browser too old to know
 * about woff2 or variable fonts. The obvious sources both fail: the .woff2
 * files in public/fonts are a format satori cannot read, and the variable .ttf
 * in the google/fonts repository has a multi-axis fvar table that its font
 * parser crashes on. An ancient Android user agent gets a plain static cut,
 * which is the one thing that works.
 */
const FONT_CSS = 'https://fonts.googleapis.com/css?family=';
const ANCIENT_UA =
  'Mozilla/5.0 (Linux; U; Android 2.3.5; en-us) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1';

const FAMILIES = { display: 'Bricolage+Grotesque:800', body: 'Inter:400' };

const BLACK = '#0A0A0C';
const NEON = '#8140DC';
// The accent adjusted to read as a mark on the near-black field — lighter
// or darker depending on the accent. Kept in step with the site palette by
// npm run contrast; the fill colour proper stays in the haze behind.
const NEON_SOFT = '#9A66E3';
const WHITE = '#FFFFFF';
const MUTED = 'rgba(255,255,255,0.62)';

/**
 * satori takes a React-shaped tree; these are the same objects without React.
 *
 * `display: flex` is applied unless the caller says otherwise, because satori
 * refuses any element with more than one child that has not declared one —
 * a browser would simply default to block, so this is the one place the tree
 * cannot be written the way it would be for a page.
 */
const el = (type, props = {}, ...children) => ({
  type,
  props: {
    ...props,
    style: { display: 'flex', ...props.style },
    children: children.length === 1 ? children[0] : children,
  },
});

async function loadFont(family) {
  const css = await (await fetch(FONT_CSS + family, { headers: { 'User-Agent': ANCIENT_UA } })).text();
  const url = css.match(/https:\/\/fonts\.gstatic\.com\/[^)]+/)?.[0];
  if (!url) throw new Error(`no font url came back for ${family}`);

  const bytes = Buffer.from(await (await fetch(url)).arrayBuffer());
  // 0x00010000 is TrueType. Anything else here means Google decided this user
  // agent wanted EOT or woff, and satori will fail further down with a much
  // less obvious message than this one.
  if (bytes.readUInt32BE(0) !== 0x00010000) {
    throw new Error(`${family} came back as ${bytes.subarray(0, 4).toString('hex')}, not TrueType`);
  }
  return bytes;
}

const [display, body] = await Promise.all([loadFont(FAMILIES.display), loadFont(FAMILIES.body)]);

const card = el('div', {
  style: {
    width: '1200px', height: '630px', display: 'flex', flexDirection: 'column',
    justifyContent: 'space-between', backgroundColor: BLACK, padding: '72px 80px',
    fontFamily: 'Inter', position: 'relative',
  },
},
  // the neon haze the site opens with
  el('div', {
    style: {
      position: 'absolute', top: '-260px', left: '-160px', width: '760px', height: '760px',
      borderRadius: '9999px', background: 'radial-gradient(circle closest-side, rgba(129,64,220,0.20), rgba(129,64,220,0))',
      display: 'flex',
    },
  }),
  el('div', {
    style: {
      position: 'absolute', bottom: '-320px', right: '-180px', width: '720px', height: '720px',
      borderRadius: '9999px', background: 'radial-gradient(circle closest-side, rgba(129,64,220,0.13), rgba(129,64,220,0))',
      display: 'flex',
    },
  }),

  // wordmark
  el('div', { style: { display: 'flex', alignItems: 'center', gap: '16px' } },
    el('div', { style: { width: '22px', height: '22px', borderRadius: '9999px', backgroundColor: NEON_SOFT, display: 'flex' } }),
    el('div', { style: { fontFamily: 'Bricolage Grotesque', fontSize: '38px', fontWeight: 800, color: WHITE, letterSpacing: '-0.04em' } }, 'TyF'),
    el('div', { style: { fontSize: '19px', color: MUTED, letterSpacing: '0.22em', marginLeft: '6px' } }, 'TRY YOUR FIT'),
  ),

  el('div', { style: { display: 'flex', flexDirection: 'column' } },
    el('div', {
      style: {
        fontFamily: 'Bricolage Grotesque', fontSize: '92px', fontWeight: 800, color: WHITE,
        letterSpacing: '-0.05em', lineHeight: 1.02, display: 'flex', flexDirection: 'column',
      },
    },
      el('div', {}, 'Wear it before'),
      el('div', {}, el('span', { style: { color: NEON_SOFT } }, 'you buy it.')),
    ),
    el('div', { style: { fontSize: '31px', color: MUTED, marginTop: '26px', display: 'flex' } },
      'Two photos in. You, wearing it, out — in about ten seconds.'),
  ),

  el('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
    el('div', { style: { display: 'flex', alignItems: 'center', gap: '14px' } },
      el('div', {
        style: {
          border: `1px solid ${NEON_SOFT}`, borderRadius: '9999px', padding: '11px 24px',
          fontSize: '21px', color: NEON_SOFT, display: 'flex',
        },
      }, 'Virtual try-on'),
      el('div', { style: { fontSize: '21px', color: MUTED, display: 'flex' } }, 'Built in India'),
    ),
    el('div', { style: { fontSize: '21px', color: MUTED, display: 'flex' } }, 'triyefit.vercel.app'),
  ),
);

const svg = await satori(card, {
  width: 1200,
  height: 630,
  fonts: [
    { name: 'Bricolage Grotesque', data: display, weight: 800, style: 'normal' },
    { name: 'Inter', data: body, weight: 400, style: 'normal' },
  ],
});

const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, png);

console.log(`wrote ${path.relative(ROOT, OUT)} — 1200x630, ${(png.length / 1024).toFixed(0)} KB`);
if (png.length > 300 * 1024) {
  console.warn('warning: over 300 KB. Some scrapers give up before that.');
  process.exitCode = 0;
}
