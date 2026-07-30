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
cp .env.example .env       # works as-is for local development
npm run db:up              # Postgres in Docker
npm run db:migrate         # creates the tables
npm start                  # http://localhost:3000
```

Or with reload on save:

```bash
npm run dev
```

Requires **Node 20.9+** and Docker. Runtime dependencies: Express, `pg`, and
the two Upstash clients.

`npm run token` prints a fresh `ADMIN_TOKEN=` line to paste into `.env`;
without one the server generates a throwaway token on every restart, which is
exactly as annoying as it sounds.

### The local database

`docker-compose.yml` runs the **same Postgres major version as Supabase**, so a
migration that passes locally passes in production. It is only ever a
development database — no deployment reads that file.

```bash
npm run db:up        # start; returns once it really accepts connections
npm run db:migrate   # apply pending migrations
npm run db:seed      # 60 fake signups + 3 pilot requests to look at
npm run db:psql      # a psql shell inside the container
npm run db:down      # stop, keeping the data
npm run db:destroy   # stop and delete the volume — a clean slate
```

Two details that save an afternoon:

- **Host port 5433, not 5432.** A machine-wide Postgres install usually already
  owns 5432, and the collision surfaces as an authentication error against the
  *wrong* server rather than as a connection failure. Set `POSTGRES_PORT` if
  5433 is taken too.
- **Don't set `DATABASE_SSL`.** It defaults to off for `localhost` and on for
  everything else, so the same `.env` shape works in both places. The container
  speaks no TLS; a managed database always does.

Prefer to point at Supabase instead? Put its **transaction pooler** connection
string (port 6543 — see `.env.example` for why) in `DATABASE_URL` and skip
`db:up` entirely. Nothing else changes.

---

## Layout

```
api/
  index.js              Vercel entry point — exports the same Express app

public/
  index.html            the entire website — one file
  images/               drop assets here; README.txt lists every slot
  videos/               the demo film

server/
  index.js              local boot, banner, graceful shutdown
  app.js                middleware order — the shape of a request
  config/env.js         every tunable, read from the environment once
  routes/               URL → controller
  controllers/          HTTP in, HTTP out; no business logic
  services/             business logic and all SQL
  middleware/           context, security, cors, cookies, rate limit,
                        validation, admin auth, 404, errors
  db/                   connection pool + ordered migrations
  views/                server-rendered admin and error pages
  utils/                logger, errors, schema, csv, crypto

scripts/                db:migrate, db:reset, db:seed, export, token
archive/                the previous single-file version, kept for reference
docker-compose.yml      the local Postgres — development only
vercel.json             static/function split and cache headers
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

## Deploying to Vercel

`public/` is served from the CDN; `/api/v1/*` and `/admin*` are rewritten to a
single function that is the same Express app (`api/index.js`). There is no
second copy of the routing to keep in sync.

**1 — provision the two services** (both set their own environment variables):

```bash
vercel integration add supabase     # Postgres
vercel integration add upstash      # Redis, for shared rate limits
```

**2 — set the rest of the environment** in the Vercel dashboard, or:

```bash
vercel env add ADMIN_TOKEN production     # from `npm run token`
vercel env add DATABASE_URL production    # Supabase *transaction pooler*, port 6543
```

Supabase's integration may only expose the direct connection string. Take the
pooler one from the Supabase dashboard instead — the direct port exhausts its
connection slots under serverless traffic.

**3 — create the tables**, once, from your machine:

```bash
vercel env pull .env        # brings the production values down
npm run db:migrate
```

Migrations deliberately do not run on boot: Vercel starts many instances at
once and they would race each other. Re-run this whenever a migration is added.

**4 — deploy:**

```bash
vercel --prod
```

### Anywhere else

The app is a normal Express server, so any Node host works:

```bash
NODE_ENV=production TRUST_PROXY=1 npm start
```

`TRUST_PROXY` matters behind a reverse proxy — without it every request appears
to come from the proxy, and one visitor's rate limit is everyone's.

### Backups

Supabase takes its own, and `npm run export` writes both tables to CSV if you
want a copy you control.
