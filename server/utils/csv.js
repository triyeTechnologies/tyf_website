/** RFC 4180 CSV serialisation for the admin exports. */

/** Escapes a single cell, neutralising spreadsheet formula injection. */
function cell(value) {
  if (value === null || value === undefined) return '';
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  if (/[",\n\r]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

/**
 * @param {Array<Record<string, unknown>>} rows
 * @param {Array<{ key: string, header: string }>} columns
 */
export function toCsv(rows, columns) {
  const head = columns.map((column) => cell(column.header)).join(',');
  const body = rows.map((row) => columns.map((column) => cell(row[column.key])).join(','));
  // The BOM keeps Excel honest about UTF-8 (₹ and names survive the round trip).
  return `﻿${[head, ...body].join('\r\n')}\r\n`;
}

export default toCsv;
