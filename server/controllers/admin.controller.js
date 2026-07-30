/** The admin console: sign in, browse, update, export. */
import { env } from '../config/env.js';
import { safeEqual } from '../utils/crypto.js';
import { toCsv } from '../utils/csv.js';
import { logger } from '../utils/logger.js';
import { badRequest, notFound } from '../utils/http-error.js';
import { ADMIN_COOKIE, isAuthorised } from '../middleware/admin-auth.js';
import * as waitlist from '../services/waitlist.service.js';
import * as pilots from '../services/pilot.service.js';
import * as stats from '../services/stats.service.js';
import { renderAdminPage, renderLoginPage } from '../views/admin.view.js';

const PAGE_SIZE = 50;

/** Only ever redirect to a path on this site. */
const safeNext = (value) =>
  typeof value === 'string' && /^\/(?!\/)/.test(value) ? value : '/admin';

export function loginPage(req, res) {
  if (isAuthorised(req)) {
    res.redirect(302, '/admin');
    return;
  }
  res.type('html').send(renderLoginPage({ next: safeNext(req.query.next) }));
}

export function login(req, res) {
  const token = String(req.body?.token ?? '').trim();
  const next = safeNext(req.body?.next);

  if (!token || !safeEqual(token, env.ADMIN_TOKEN)) {
    logger.warn(`failed admin sign-in from ${req.ip}`);
    res.status(401).type('html').send(
      renderLoginPage({ error: 'That token is not right. Check ADMIN_TOKEN in your .env.', next }),
    );
    return;
  }

  res.setCookie(ADMIN_COOKIE, env.ADMIN_TOKEN, { maxAge: env.ADMIN_SESSION_HOURS * 3600 });
  res.redirect(302, next);
}

export function logout(req, res) {
  res.clearCookie(ADMIN_COOKIE);
  res.redirect(302, '/admin/login');
}

export async function dashboard(req, res) {
  const tab = req.query.tab === 'pilots' ? 'pilots' : 'waitlist';
  const search = String(req.query.q ?? '').trim().slice(0, 80);
  const page = Math.max(1, Number.parseInt(String(req.query.page ?? '1'), 10) || 1);

  const source = tab === 'pilots' ? pilots : waitlist;

  const [{ rows, total }, summary] = await Promise.all([
    source.list({ search, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    stats.adminStats(),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  res.type('html').send(
    renderAdminPage({ tab, rows, total, page, pages, search, stats: summary }),
  );
}

const EXPORTS = {
  waitlist: {
    load: waitlist.listAllForExport,
    columns: [
      { key: 'id', header: 'ID' },
      { key: 'email', header: 'Email' },
      { key: 'source', header: 'Source' },
      { key: 'referrer', header: 'Referrer' },
      { key: 'created_at', header: 'Joined at (UTC)' },
    ],
  },
  pilots: {
    load: pilots.listAllForExport,
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
};

export async function exportCsv(req, res) {
  const name = String(req.params.dataset ?? '').replace(/\.csv$/i, '');
  const dataset = EXPORTS[name];
  if (!dataset) throw notFound('No such export.');

  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `tyf-${name}-${stamp}.csv`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(toCsv(await dataset.load(), dataset.columns));
}

/**
 * Where to send the browser after a write. Deleting the last row of page 4
 * should not silently drop you back on page 1 with your search cleared, so the
 * forms post back the view you were looking at and it is rebuilt here.
 */
function backToList(body, tab) {
  const params = new URLSearchParams({ tab });

  const search = String(body?.q ?? '').trim().slice(0, 80);
  if (search) params.set('q', search);

  const page = Number.parseInt(String(body?.page ?? ''), 10);
  if (Number.isFinite(page) && page > 1) params.set('page', String(page));

  return `/admin?${params}`;
}

const DATASETS = { waitlist, pilots };

/**
 * Deletes one row from either table. There is no undo, so the button that
 * reaches this confirms first, and the deletion is logged with the id.
 */
export async function deleteRow(req, res) {
  const name = String(req.params.dataset ?? '');
  const source = Object.hasOwn(DATASETS, name) ? DATASETS[name] : null;
  if (!source) throw notFound('No such list.');

  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) throw badRequest('Bad request id.');

  const deleted = await source.remove(id);
  if (!deleted) throw notFound('That row no longer exists.');

  logger.warn(`admin deleted ${name} #${id}`);
  res.redirect(303, backToList(req.body, name));
}

export async function updatePilotStatus(req, res) {
  const id = Number.parseInt(req.params.id, 10);
  const status = String(req.body?.status ?? '');

  if (!Number.isFinite(id)) throw badRequest('Bad request id.');
  if (!pilots.STATUSES.includes(status)) {
    throw badRequest(`Status must be one of: ${pilots.STATUSES.join(', ')}.`);
  }

  const updated = await pilots.updateStatus(id, status);
  if (!updated) throw notFound('That pilot request no longer exists.');

  res.redirect(303, backToList(req.body, 'pilots'));
}

export default { loginPage, login, logout, dashboard, exportCsv, updatePilotStatus, deleteRow };
