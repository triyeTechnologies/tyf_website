/**
 * A tagged template that escapes everything you interpolate.
 *
 * Server-rendered pages (admin, errors) are small enough that a template engine
 * would be overkill, but not so small that unescaped concatenation is safe.
 *
 *   html`<td>${row.email}</td>`          // escaped
 *   html`<tbody>${rows.map(renderRow)}</tbody>`  // arrays are joined
 *   html`<style>${raw(css)}</style>`     // opt out explicitly
 */

const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (character) => ENTITIES[character]);

/**
 * Marks a string as pre-rendered HTML that must not be escaped.
 * `toString` is defined so the value can also be dropped into an ordinary
 * template literal or passed to `String()`.
 */
export const raw = (value) => ({
  __html: String(value ?? ''),
  toString() { return this.__html; },
});

const isMarkup = (value) => typeof value === 'object' && value !== null && '__html' in value;

function serialise(value) {
  if (value === null || value === undefined || value === false) return '';
  if (Array.isArray(value)) return value.map(serialise).join('');
  if (isMarkup(value)) return value.__html;
  return escapeHtml(value);
}

/**
 * Returns marked-up HTML rather than a plain string, so templates nest without
 * being escaped a second time:
 *
 *   html`<tbody>${rows.map(row => html`<tr>…</tr>`)}</tbody>`
 *
 * A plain string in the same position would still be escaped — which is what
 * you want for anything that came from a user.
 */
export function html(strings, ...values) {
  let output = strings[0];
  for (let index = 0; index < values.length; index += 1) {
    output += serialise(values[index]) + strings[index + 1];
  }
  return raw(output);
}

export default html;
