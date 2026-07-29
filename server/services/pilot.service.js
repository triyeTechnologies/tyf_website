/** Business / retail pilot enquiries. */
import { one, many } from '../db/index.js';

export const SEGMENTS = ['brand', 'marketplace', 'retail-store', 'other'];
export const STATUSES = ['new', 'contacted', 'qualified', 'closed'];

export const create = (input) =>
  one(
    `INSERT INTO pilot_requests
       (name, company, email, phone, website, segment,
        catalogue_size, monthly_volume, message, user_agent, ip_hash)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
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
    ],
  );

export async function countRequests() {
  const row = await one('SELECT COUNT(*)::int AS total FROM pilot_requests');
  return row.total;
}

export async function countNew() {
  const row = await one("SELECT COUNT(*)::int AS total FROM pilot_requests WHERE status = 'new'");
  return row.total;
}

export async function list({ search = '', limit = 50, offset = 0 } = {}) {
  const like = `%${search}%`;

  const rows = await many(
    `SELECT * FROM pilot_requests
     WHERE $1 = '' OR company ILIKE $2 OR email ILIKE $2 OR name ILIKE $2
     ORDER BY created_at DESC, id DESC
     LIMIT $3 OFFSET $4`,
    [search, like, limit, offset],
  );

  const total = await one(
    `SELECT COUNT(*)::int AS total FROM pilot_requests
     WHERE $1 = '' OR company ILIKE $2 OR email ILIKE $2 OR name ILIKE $2`,
    [search, like],
  );

  return { rows, total: total.total };
}

export const listAllForExport = () =>
  many(`SELECT id, name, company, email, phone, website, segment,
               catalogue_size, monthly_volume, status, message, created_at
        FROM pilot_requests
        ORDER BY created_at DESC, id DESC`);

/** Returns the updated row, or null if the status is unknown or the id is gone. */
export async function updateStatus(id, status) {
  if (!STATUSES.includes(status)) return null;
  return one('UPDATE pilot_requests SET status = $1 WHERE id = $2 RETURNING *', [status, id]);
}

export default {
  create,
  countRequests,
  countNew,
  list,
  listAllForExport,
  updateStatus,
  SEGMENTS,
  STATUSES,
};
