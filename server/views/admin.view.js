/** The admin console: signups, pilot requests, exports. */
import { html, raw } from './html.js';
import { layout } from './layout.js';
import { STATUSES } from '../services/pilot.service.js';

const STYLES = `
  main{padding:34px 0 80px}
  .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin-bottom:26px}
  .stat{background:var(--glass);border:1px solid var(--line);border-radius:16px;padding:18px 20px;
    backdrop-filter:blur(18px) saturate(1.5);-webkit-backdrop-filter:blur(18px) saturate(1.5);
    box-shadow:inset 0 1px 0 var(--glass-hi);position:relative;overflow:hidden}
  .stat b{display:block;font-family:var(--disp);font-weight:800;font-size:38px;letter-spacing:-.05em;line-height:1}
  .stat span{display:block;margin-top:8px;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--muted)}
  .stat.accent b{color:var(--neon);text-shadow:0 0 30px var(--neon-glow)}
  .spark{grid-column:span 2;display:flex;flex-direction:column;justify-content:space-between}
  .spark svg{width:100%;height:52px;margin-top:10px;overflow:visible}

  .bar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:16px}
  .tabs{display:inline-flex;gap:4px;padding:4px;border:1px solid var(--line);border-radius:100px;
    background:var(--glass);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}
  .tabs a{padding:7px 16px;border-radius:100px;font-family:var(--disp);font-weight:600;font-size:13.5px;
    transition:background .2s var(--e),color .2s var(--e)}
  .tabs a.on{background:var(--neon);color:var(--black);box-shadow:0 6px 18px -6px var(--neon-glow)}
  .tabs a:not(.on):hover{background:rgba(255,255,255,.08)}
  form.search{display:flex;gap:8px;margin-left:auto}
  form.search input{min-width:240px}

  .panel{background:var(--glass);border:1px solid var(--line);border-radius:18px;overflow:hidden;
    backdrop-filter:blur(18px) saturate(1.5);-webkit-backdrop-filter:blur(18px) saturate(1.5);
    box-shadow:inset 0 1px 0 var(--glass-hi)}
  table{width:100%;border-collapse:collapse}
  th{text-align:left;font-family:var(--disp);font-weight:600;font-size:10.5px;letter-spacing:.16em;
    text-transform:uppercase;color:var(--muted);padding:14px 18px;border-bottom:1px solid var(--line);white-space:nowrap}
  td{padding:14px 18px;border-bottom:1px solid rgba(255,255,255,.07);vertical-align:top;font-size:14px}
  tr:last-child td{border-bottom:none}
  tbody tr{transition:background .18s}
  tbody tr:hover{background:rgba(255,255,255,.04)}
  td.num{color:var(--muted);font-family:ui-monospace,Menlo,monospace;font-size:12.5px;width:1%}
  td a.mail{border-bottom:1px solid rgba(194,255,51,.42)}
  td a.mail:hover{color:var(--neon)}
  /* status reads by weight rather than by hue — there is only one accent */
  .chip{display:inline-block;padding:3px 10px;border-radius:100px;font-size:11px;letter-spacing:.1em;
    text-transform:uppercase;font-weight:600;border:1px solid var(--line);color:var(--muted)}
  .chip.new{background:var(--neon);border-color:var(--neon);color:var(--black)}
  .chip.contacted{background:rgba(194,255,51,.16);border-color:rgba(194,255,51,.5);color:var(--neon)}
  .chip.qualified{background:transparent;border-color:rgba(194,255,51,.5);color:var(--neon)}
  .chip.closed{opacity:.5}
  .note{max-width:44ch;color:var(--muted);font-size:13.2px}
  .status-form{display:flex;gap:6px;align-items:center}
  .status-form select{padding:6px 10px;font-size:12.5px;border-radius:8px}
  .empty{padding:56px 20px;text-align:center;color:var(--muted)}
  .empty b{display:block;font-family:var(--disp);font-size:19px;color:var(--white);margin-bottom:8px}
  .pager{display:flex;align-items:center;gap:12px;justify-content:space-between;padding:14px 18px;
    border-top:1px solid var(--line);font-size:13px;color:var(--muted)}
  .pager .pages{display:flex;gap:6px}
  @media(max-width:820px){
    .spark{display:none}
    form.search{margin-left:0;width:100%}
    form.search input{flex:1;min-width:0}
    .panel{overflow-x:auto}
    table{min-width:720px}
  }
`;

/** A 30-day signup sparkline, drawn straight from the daily counts. */
function sparkline(daily) {
  if (!daily.length) return html`<svg viewBox="0 0 100 30" preserveAspectRatio="none"></svg>`;

  const values = daily.map((day) => day.total);
  const peak = Math.max(...values, 1);
  const step = values.length > 1 ? 100 / (values.length - 1) : 100;
  const points = values.map((value, index) => `${(index * step).toFixed(2)},${(28 - (value / peak) * 26).toFixed(2)}`);

  return html`<svg viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">
    <polyline points="${raw(points.join(' '))}" fill="none" stroke="#C2FF33" stroke-width="1.6"
      stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
    <polyline points="${raw(`0,30 ${points.join(' ')} 100,30`)}" fill="rgba(194,255,51,.14)" stroke="none"/>
  </svg>`;
}

const dateCell = (iso) => {
  const date = new Date(`${iso}`.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

function waitlistTable(rows) {
  if (!rows.length) {
    return html`<div class="empty"><b>No signups yet.</b>The form on the site writes here the moment someone joins.</div>`;
  }
  return html`<table>
    <thead><tr><th>#</th><th>Email</th><th>Source</th><th>Referrer</th><th>Joined</th></tr></thead>
    <tbody>${rows.map(
      (row) => html`<tr>
        <td class="num">${row.id}</td>
        <td><a class="mail" href="mailto:${row.email}">${row.email}</a></td>
        <td><span class="chip">${row.source}</span></td>
        <td class="note mono">${row.referrer || '—'}</td>
        <td class="muted mono">${dateCell(row.created_at)}</td>
      </tr>`,
    )}</tbody>
  </table>`;
}

function pilotTable(rows) {
  if (!rows.length) {
    return html`<div class="empty"><b>No pilot requests yet.</b>Business enquiries from the site land here.</div>`;
  }
  return html`<table>
    <thead><tr><th>#</th><th>Company</th><th>Contact</th><th>Scale</th><th>Message</th><th>Status</th><th>Received</th></tr></thead>
    <tbody>${rows.map(
      (row) => html`<tr>
        <td class="num">${row.id}</td>
        <td>
          <strong>${row.company}</strong><br>
          <span class="muted mono">${row.segment || 'unspecified'}</span>
          ${row.website ? html`<br><a class="mail" href="${row.website}" target="_blank" rel="noopener">site ↗</a>` : ''}
        </td>
        <td>${row.name}<br><a class="mail" href="mailto:${row.email}">${row.email}</a>
          ${row.phone ? html`<br><span class="muted mono">${row.phone}</span>` : ''}</td>
        <td class="muted mono">${row.catalogue_size || '—'}<br>${row.monthly_volume || '—'}</td>
        <td class="note">${row.message || '—'}</td>
        <td>
          <form class="status-form" method="post" action="/admin/pilots/${row.id}/status">
            <select name="status" aria-label="Status for ${row.company}">
              ${STATUSES.map(
                (status) =>
                  html`<option value="${status}" ${raw(status === row.status ? 'selected' : '')}>${status}</option>`,
              )}
            </select>
            <button class="btn ghost" type="submit">Save</button>
          </form>
        </td>
        <td class="muted mono">${dateCell(row.created_at)}</td>
      </tr>`,
    )}</tbody>
  </table>`;
}

function pager({ tab, page, pages, total, search }) {
  if (pages <= 1) {
    return html`<div class="pager"><span>${total} ${total === 1 ? 'row' : 'rows'}</span></div>`;
  }
  const link = (target) =>
    `/admin?tab=${tab}&page=${target}${search ? `&q=${encodeURIComponent(search)}` : ''}`;

  return html`<div class="pager">
    <span>${total} rows · page ${page} of ${pages}</span>
    <span class="pages">
      ${page > 1 ? html`<a class="btn ghost" href="${raw(link(page - 1))}">← Previous</a>` : ''}
      ${page < pages ? html`<a class="btn ghost" href="${raw(link(page + 1))}">Next →</a>` : ''}
    </span>
  </div>`;
}

/**
 * @param {{ tab:'waitlist'|'pilots', rows:object[], total:number, page:number, pages:number,
 *           search:string, stats:object }} model
 */
export function renderAdminPage({ tab, rows, total, page, pages, search, stats }) {
  const tabLink = (name) => `/admin?tab=${name}${search ? `&q=${encodeURIComponent(search)}` : ''}`;

  return layout({
    title: 'TyF admin · signups & pilots',
    head: STYLES,
    body: html`
      <div class="topbar"><div class="wrap">
        <a class="logo" href="/"><i></i>TyF <small>admin</small></a>
        <span class="spacer"></span>
        <a class="btn ghost" href="/" target="_blank" rel="noopener">View site ↗</a>
        <a class="btn" href="/admin/export/${tab === 'pilots' ? 'pilots' : 'waitlist'}.csv">Export CSV</a>
        <form method="post" action="/admin/logout"><button class="btn ghost" type="submit">Sign out</button></form>
      </div></div>

      <main class="wrap">
        <div class="stats">
          <div class="stat accent"><b>${stats.members}</b><span>on the waitlist</span></div>
          <div class="stat"><b>${stats.joinedToday}</b><span>joined today</span></div>
          <div class="stat violet"><b>${stats.joinedThisWeek}</b><span>joined this week</span></div>
          <div class="stat pink"><b>${stats.pilotsNew}</b><span>new pilot requests</span></div>
          <div class="stat spark">
            <span>signups · last 30 days</span>
            ${sparkline(stats.daily)}
          </div>
        </div>

        <div class="bar">
          <nav class="tabs">
            <a class="${tab === 'waitlist' ? 'on' : ''}" href="${raw(tabLink('waitlist'))}">Waitlist · ${stats.members}</a>
            <a class="${tab === 'pilots' ? 'on' : ''}" href="${raw(tabLink('pilots'))}">Pilots · ${stats.pilots}</a>
          </nav>
          <form class="search" method="get" action="/admin">
            <input type="hidden" name="tab" value="${tab}">
            <input type="search" name="q" value="${search}" placeholder="${tab === 'pilots' ? 'Search company, name, email…' : 'Search email or source…'}" aria-label="Search">
            <button class="btn" type="submit">Search</button>
            ${search ? html`<a class="btn ghost" href="${raw(tabLink(tab))}">Clear</a>` : ''}
          </form>
        </div>

        <div class="panel">
          ${raw(tab === 'pilots' ? pilotTable(rows) : waitlistTable(rows))}
          ${raw(pager({ tab, page, pages, total, search }))}
        </div>
      </main>
    `,
  });
}

/** The token gate. */
export function renderLoginPage({ error = null, next = '/admin' } = {}) {
  return layout({
    title: 'TyF admin · sign in',
    head: `
      .gate{min-height:100vh;display:grid;place-items:center;padding:30px}
      .card{width:100%;max-width:400px;background:var(--glass);border:1px solid var(--line);
        backdrop-filter:blur(24px) saturate(1.6);-webkit-backdrop-filter:blur(24px) saturate(1.6);
        box-shadow:inset 0 1px 0 var(--glass-hi),0 40px 80px -40px rgba(0,0,0,.9);
        border-radius:22px;padding:34px 30px}
      .card h1{font-size:28px;margin:16px 0 8px}
      .card p{color:var(--muted);font-size:14px;margin-bottom:22px}
      .card input{width:100%;margin-bottom:12px}
      .card .btn{width:100%;justify-content:center}
      .err{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.34);color:var(--white);
        border-radius:10px;padding:10px 13px;font-size:13.4px;margin-bottom:16px}
    `,
    body: html`
      <div class="gate"><div class="card">
        <span class="logo"><i></i>TyF</span>
        <h1>Admin access</h1>
        <p>Paste the token from your <span class="mono">.env</span> file.</p>
        ${error ? html`<div class="err">${error}</div>` : ''}
        <form method="post" action="/admin/login">
          <input type="hidden" name="next" value="${next}">
          <input type="password" name="token" placeholder="Admin token" autocomplete="current-password"
            autofocus required aria-label="Admin token">
          <button class="btn primary" type="submit">Sign in</button>
        </form>
      </div></div>
    `,
  });
}

export default { renderAdminPage, renderLoginPage };
