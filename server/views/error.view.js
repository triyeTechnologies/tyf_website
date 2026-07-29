/** The page a browser gets for a 404 or an unhandled failure. */
import { html, raw } from './html.js';
import { layout } from './layout.js';

const STYLES = `
  .err{min-height:100vh;display:grid;place-items:center;text-align:center;padding:40px 20px}
  .err .code{font-family:var(--disp);font-weight:800;font-size:clamp(88px,20vw,180px);line-height:.86;
    letter-spacing:-.06em;color:var(--neon);text-shadow:0 0 60px var(--neon-glow)}
  .err h1{font-size:clamp(26px,4vw,40px);margin:18px 0 12px}
  .err p{color:var(--muted);max-width:46ch;margin:0 auto}
  .err .actions{display:flex;gap:10px;justify-content:center;margin-top:28px;flex-wrap:wrap}
  .err pre{margin:30px auto 0;max-width:800px;text-align:left;background:var(--glass);
    backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
    border:1px solid var(--line);border-radius:12px;padding:16px;overflow:auto;font-size:12px;color:var(--muted)}
  .err .rid{margin-top:22px;font-size:11.5px;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.35)}
`;

export function renderErrorPage({ status, message, requestId, stack = null }) {
  return layout({
    title: `${status} · Try your Fit`,
    head: STYLES,
    body: html`
      <main class="err">
        <div class="wrap">
          <div class="code">${status}</div>
          <h1>${status === 404 ? 'That page does not exist.' : 'Something broke.'}</h1>
          <p>${message}</p>
          <div class="actions">
            <a class="btn primary" href="/">Back to the site</a>
            <a class="btn ghost" href="mailto:hello@triyetech.com">Tell us about it</a>
          </div>
          ${stack ? html`<pre>${stack}</pre>` : ''}
          <div class="rid">Request ${requestId}</div>
        </div>
      </main>
    `,
  });
}

export default renderErrorPage;
