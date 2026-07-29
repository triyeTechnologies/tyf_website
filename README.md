# Try your Fit — website

The TyF marketing site, the API behind its two forms, and a small admin console
for reading what comes in.

The **front end is deliberately one file** (`public/index.html`) — markup,
styles and behaviour together, organised internally like a codebase. The **back
end is an ordinary layered Express app**. Nothing is bundled, transpiled or
generated: what you edit is what ships.

---

## Running it

```bash
npm install
npm start           # http://localhost:3000
```

Or with reload on save:

```bash
npm run dev
```

First boot creates `data/tyf.db` and applies the schema. If `ADMIN_TOKEN` is not
set, the server prints a temporary one — copy it into `.env` to keep it across
restarts.

```bash
cp .env.example .env
npm run token       # prints a fresh ADMIN_TOKEN= line to paste in
```

Requires **Node 22.5+** (for the built-in `node:sqlite`). Only one runtime
dependency: Express.

---

## Layout

```
public/
  index.html            the entire website — one file
  images/               drop assets here; README.txt lists every slot

server/
  index.js              boot, banner, graceful shutdown
  app.js                middleware order — the shape of a request
  config/env.js         every tunable, read from the environment once
  routes/               URL → controller
  controllers/          HTTP in, HTTP out; no business logic
  services/             business logic and all SQL
  middleware/           context, security, cors, cookies, rate limit,
                        validation, admin auth, 404, errors
  db/                   connection + ordered migrations
  views/                server-rendered admin and error pages
  utils/                logger, errors, schema, csv, crypto

scripts/                db:reset, db:seed, export, token
archive/                the previous single-file version, kept for reference
```

The layering rule: **controllers never write SQL, services never touch `req` or
`res`.** That is what makes the admin console and the CSV export script able to
share `waitlist.service.js` without duplication.

---

## API

Base path `/api/v1`. Responses are always `{ ok, data?, message?, error? }`.

| Method | Path        | Purpose                                          |
|--------|-------------|--------------------------------------------------|
| `GET`  | `/health`   | Liveness — status, uptime, database reachability |
| `GET`  | `/stats`    | Public waitlist count for the hero badge          |
| `POST` | `/waitlist` | Email capture — `{ email, source? }`              |
| `POST` | `/pilot`    | Business enquiry — name, company, email, …        |

```bash
curl -X POST http://localhost:3000/api/v1/waitlist \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com","source":"hero"}'
```

Validation failures return `422` with a field → message map, which the page
renders inline against the offending input:

```json
{ "ok": false,
  "error": { "code": "validation_failed",
             "details": { "email": "That email address does not look right." } } }
```

Behaviour worth knowing:

- **Signing up twice succeeds.** Answering "that address is already registered"
  would tell any stranger who is on the list. The response reports
  `created: false` instead, and no duplicate row is written.
- **Both forms carry a honeypot** (`company_website`). A filled one gets a
  cheerful `202` and is discarded — the spammer learns nothing.
- **IPs are stored as salted hashes**, never in the clear. Enough to spot abuse,
  not enough to identify anyone.
- **Writes are rate limited** to 8 per IP per 15 minutes by default, with
  `RateLimit-*` and `Retry-After` headers on the way out.

---

## Admin

`http://localhost:3000/admin` — sign in with `ADMIN_TOKEN`.

Waitlist and pilot tables with search and paging, a 30-day signup sparkline,
per-request status (`new → contacted → qualified → closed`), and CSV export.
Scripts can skip the login and send `Authorization: Bearer $ADMIN_TOKEN`.

Or export without the browser:

```bash
npm run export              # -> ./exports/*.csv
```

The session cookie is `HttpOnly`, `SameSite=Strict`, `Secure` in production, and
every state-changing admin request is checked against its `Origin`.

---

## The front end

`public/index.html` opens with a contents block listing both indexes: the CSS
`@layer` order and the JavaScript modules.

**Styles** use real cascade layers — `tokens, base, layout, components,
sections, motion, utilities, responsive` — so a component rule can never be
accidentally outweighed by a utility, and the whole animation system lives in
one layer you can read top to bottom.

**Behaviour** is a list of `{ name, init }` modules booted in a loop that
catches per module. A module that throws logs a warning and the rest of the page
carries on.

Animation is declarative — you add behaviour by adding an attribute, not by
writing JavaScript:

| Attribute            | Effect                                              |
|----------------------|-----------------------------------------------------|
| `data-reveal="up"`   | enters on scroll — also `mask`, `scale`, `left`, `right` |
| `--d: 120ms`         | stagger delay for any reveal                        |
| `data-split`         | heading splits into words that rise out of masks    |
| `data-count="21.6"`  | number rolls up; `data-prefix`, `data-suffix`, `data-decimals` |
| `data-tilt`          | 3D tilt toward the pointer                          |
| `data-magnetic`      | button drifts toward the cursor                     |
| `data-parallax="0.2"`| moves at a fraction of scroll speed                 |
| `data-marquee="26"`  | ticker, seconds per loop; `data-reverse` to flip     |

Three details that keep it from being merely decorative:

- **One scroll loop.** Everything scroll-driven subscribes to a single
  `requestAnimationFrame` reader instead of adding its own scroll listener.
- **`prefers-reduced-motion` is honoured in both directions** — CSS stops the
  animation, and the script skips the work, leaves headings as plain text, and
  parks the compare slider in the middle.
- **Nothing depends on JavaScript to be readable.** Initial hidden states are
  scoped to a `.js` class set before first paint, and the preloader dismisses
  itself after six seconds even if its own script never runs.

### Images

Drop files into `public/images/` using the names in that folder's `README.txt`.
Each empty slot paints a vivid placeholder printing the filename and the shot
required, so an unfinished site still looks deliberate. A real file takes over
automatically; a missing one keeps its label.

---

## Deploying

Any host that runs Node. Behind a reverse proxy:

```bash
NODE_ENV=production ADMIN_TOKEN=<long-random> TRUST_PROXY=1 npm start
```

`TRUST_PROXY` matters — without it every request appears to come from the proxy
and rate limiting applies to all visitors as one.

The database is a single file. Back it up by copying `data/tyf.db` (with its
`-wal` sibling), or run `npm run export` on a schedule.

If you would rather not rely on Node's still-experimental `node:sqlite`,
`server/db/index.js` is the only file that touches it — swapping in
`better-sqlite3` is a change to that one module.
