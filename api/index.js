/**
 * Vercel entry point.
 *
 * A Vercel Function is just a request handler, and an Express app already is
 * one — so the same `createApp()` that runs locally is exported straight to
 * the platform. There is no second copy of the routing to keep in sync.
 *
 * What is deliberately NOT here:
 *   · `listen()` — the platform owns the socket
 *   · migrations — several instances boot at once and would race;
 *     run `npm run db:migrate` as a deploy step instead
 *
 * Locally, `server/index.js` is the entry point instead and does both.
 */
import { createApp } from '../server/app.js';

export default createApp();
