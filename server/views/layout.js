/**
 * Shared chrome for the server-rendered pages (admin console, error pages).
 *
 * Same palette and type as the public site, dialled down to a working surface —
 * dense, dark, and quiet, because this is a tool rather than a pitch.
 */
import { html, raw } from './html.js';

export const THEME = raw(`
  /* Self-hosted, same two files the public page uses — so the admin console
     costs no extra download, and the CSP can refuse external fonts outright.
     Absolute paths: a relative one would resolve against /admin/. */
  @font-face{
    font-family:'Bricolage Grotesque';font-style:normal;font-weight:400 800;
    font-stretch:100%;font-display:swap;
    src:url('/fonts/bricolage-grotesque-latin.woff2') format('woff2');
  }
  @font-face{
    font-family:'Inter';font-style:normal;font-weight:400 600;font-display:swap;
    src:url('/fonts/inter-latin.woff2') format('woff2');
  }

  :root{
    /* the same three colours as the public site */
    --black:#0A0A0C; --white:#FFFFFF; --neon:#443199;
    /* Everything drawn ON the page rather than filled WITH it: #443199 is
       2.02:1 here, which is invisible rather than merely dim. This is the
       same hue mixed 35% with white, at 5.15:1. */
    --neon-deep:#8579BD;
    --neon-glow:rgba(133,121,189,.34);
    --line:rgba(255,255,255,.14); --muted:rgba(255,255,255,.6);
    --glass:rgba(255,255,255,.05); --glass-hi:rgba(255,255,255,.16);
    --disp:'Bricolage Grotesque',system-ui,sans-serif;
    --body:'Inter',system-ui,-apple-system,'Segoe UI',sans-serif;
    --e:cubic-bezier(.2,1,.3,1);
  }
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:var(--black);color:var(--white);font-family:var(--body);font-size:15px;line-height:1.55;
    -webkit-font-smoothing:antialiased;min-height:100vh}
  /* a faint neon haze, so the frosted panels have something to blur */
  body::before{content:"";position:fixed;inset:0;z-index:0;pointer-events:none;
    background:
      radial-gradient(60% 40% at 8% 0%,rgba(133,121,189,.11),transparent 70%),
      radial-gradient(50% 40% at 96% 100%,rgba(133,121,189,.07),transparent 70%)}
  body > *{position:relative;z-index:1}
  a{color:inherit;text-decoration:none}
  h1,h2,h3,.disp{font-family:var(--disp);font-weight:800;letter-spacing:-.04em;line-height:1.02}
  .wrap{max-width:1240px;margin:0 auto;padding:0 clamp(18px,4vw,40px)}

  .topbar{position:sticky;top:0;z-index:10;background:rgba(10,10,12,.7);
    backdrop-filter:blur(20px) saturate(1.6);-webkit-backdrop-filter:blur(20px) saturate(1.6);
    border-bottom:1px solid var(--line)}
  .topbar .wrap{display:flex;align-items:center;gap:18px;height:66px}
  .logo{font-family:var(--disp);font-weight:800;font-size:21px;letter-spacing:-.06em;display:flex;align-items:center;gap:8px}
  .logo i{width:10px;height:10px;border-radius:50%;background:var(--neon);box-shadow:0 0 14px var(--neon-glow)}
  .logo small{font-family:var(--body);font-weight:500;font-size:11px;letter-spacing:.18em;
    text-transform:uppercase;color:var(--muted);margin-left:4px}
  .spacer{margin-left:auto}

  .btn{display:inline-flex;align-items:center;gap:7px;padding:9px 16px;border-radius:100px;
    border:1px solid var(--line);background:var(--glass);
    backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
    font-family:var(--disp);font-weight:600;font-size:13.5px;cursor:pointer;color:var(--white);
    transition:background .2s var(--e),color .2s var(--e),border-color .2s var(--e),
      transform .2s var(--e),box-shadow .2s var(--e)}
  .btn:hover{border-color:var(--neon-deep);transform:translateY(-1px);box-shadow:0 8px 24px -10px var(--neon-glow)}
  .btn.primary{background:var(--neon);color:var(--white);border-color:var(--neon)}
  .btn.primary:hover{box-shadow:0 10px 28px -8px var(--neon-glow)}
  .btn.ghost{background:transparent}
  .btn.ghost:hover{background:rgba(255,255,255,.08)}

  input,select,textarea{font:inherit;color:var(--white);background:var(--glass);
    backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);
    border:1px solid var(--line);border-radius:10px;padding:9px 13px;outline:none;
    transition:border-color .2s,box-shadow .2s}
  input:focus,select:focus,textarea:focus{border-color:var(--neon-deep);box-shadow:0 0 0 3px rgba(133,121,189,.18)}
  select{cursor:pointer}
  select option{background:#141418;color:var(--white)}

  .muted{color:var(--muted)}
  .mono{font-family:ui-monospace,'SF Mono',Menlo,Consolas,monospace;font-size:12.6px}
`);

/**
 * @param {{ title: string, body: string, head?: string, bodyClass?: string }} options
 */
export function layout({ title, body, head = '', bodyClass = '' }) {
  return `<!DOCTYPE html>
${html`<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>${title}</title>
<link rel="preload" href="/fonts/bricolage-grotesque-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/inter-latin.woff2" as="font" type="font/woff2" crossorigin>
<style>${THEME}${raw(head)}</style>
</head>
<body class="${bodyClass}">
${raw(body)}
</body>
</html>`}`;
}

export default layout;
