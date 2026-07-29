/** Business / retail pilot enquiries. */
import { db, plain, plainAll } from '../db/index.js';

export const SEGMENTS = ['brand', 'marketplace', 'retail-store', 'other'];
export const STATUSES = ['new', 'contacted', 'qualified', 'closed'];

const INSERT = db.prepare(`
  INSERT INTO pilot_requests
    (name, company, email, phone, website, segment, catalogue_size, monthly_volume, message, user_agent, ip_hash)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const FIND = db.prepare('SELECT * FROM pilot_requests WHERE id = ?');
const COUNT = db.prepare('SELECT COUNT(*) AS total FROM pilot_requests');
const COUNT_NEW = db.prepare("SELECT COUNT(*) AS total FROM pilot_requests WHERE status = 'new'");
const COUNT_SEARCH = db.prepare(`
  SELECT COUNT(*) AS total FROM pilot_requests
  WHERE (? = '' OR company LIKE ? COLLATE NOCASE OR email LIKE ? COLLATE NOCASE OR name LIKE ? COLLATE NOCASE)
`);
const PAGE = db.prepare(`
  SELECT * FROM pilot_requests
  WHERE (? = '' OR company LIKE ? COLLATE NOCASE OR email LIKE ? COLLATE NOCASE OR name LIKE ? COLLATE NOCASE)
  ORDER BY created_at DESC, id DESC
  LIMIT ? OFFSET ?
`);
const ALL_FOR_EXPORT = db.prepare(`
  SELECT id, name, company, email, phone, website, segment, catalogue_size, monthly_volume, status, message, created_at
  FROM pilot_requests
  ORDER BY created_at DESC, id DESC
`);
const SET_STATUS = db.prepare('UPDATE pilot_requests SET status = ? WHERE id = ?');

export function create(input) {
  const result = INSERT.run(
    input.name,
    input.company,
    input.email,
    input.phone ?? null,
    input.website ?? null,
    input.segment ?? null,
    input.catalogueSize ?? null,
    input.monthlyVolume ?? null,
    input.message ?? null,
    input.userAgent ?? null,
    input.ipHash ?? null,
  );
  return plain(FIND.get(result.lastInsertRowid));
}

export const countRequests = () => COUNT.get().total;
export const countNew = () => COUNT_NEW.get().total;

export function list({ search = '', limit = 50, offset = 0 } = {}) {
  const like = `%${search}%`;
  return {
    rows: plainAll(PAGE.all(search, like, like, like, limit, offset)),
    total: COUNT_SEARCH.get(search, like, like, like).total,
  };
}

export const listAllForExport = () => plainAll(ALL_FOR_EXPORT.all());

export function updateStatus(id, status) {
  if (!STATUSES.includes(status)) return null;
  SET_STATUS.run(status, id);
  return plain(FIND.get(id));
}

export default { create, countRequests, countNew, list, listAllForExport, updateStatus, SEGMENTS, STATUSES };
