/**
 * The admin console. Everything past /admin/login requires the shared token.
 */
import { Router } from 'express';
import { env } from '../config/env.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { requireAdmin } from '../middleware/admin-auth.js';
import { sameOriginOnly } from '../middleware/same-origin.js';
import { asyncHandler } from '../utils/async-handler.js';
import * as admin from '../controllers/admin.controller.js';

export const adminRouter = Router();

adminRouter.use(sameOriginOnly);

/* public: the gate itself */
adminRouter.get('/login', asyncHandler(admin.loginPage));
adminRouter.post(
  '/login',
  rateLimit({
    name: 'admin-login',
    max: env.RATE_LIMIT.LOGIN_MAX,
    message: 'Too many attempts. Wait a few minutes before trying again.',
  }),
  asyncHandler(admin.login),
);
adminRouter.post('/logout', asyncHandler(admin.logout));

/* everything below needs the token */
adminRouter.use(requireAdmin);
adminRouter.get('/', asyncHandler(admin.dashboard));
// `:dataset` carries the ".csv" suffix; the controller strips it. Keeping the
// dot out of the pattern avoids relying on path-to-regexp v8 parsing rules.
adminRouter.get('/export/:dataset', asyncHandler(admin.exportCsv));
adminRouter.post('/pilots/:id/status', asyncHandler(admin.updatePilotStatus));

export default adminRouter;
