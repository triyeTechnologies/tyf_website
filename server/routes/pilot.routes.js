import { Router } from 'express';
import { env } from '../config/env.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { validateBody } from '../middleware/validate.js';
import { asyncHandler } from '../utils/async-handler.js';
import { request, pilotSchema } from '../controllers/pilot.controller.js';

export const pilotRouter = Router();

pilotRouter.post(
  '/',
  rateLimit({
    name: 'pilot',
    max: env.RATE_LIMIT.WRITE_MAX,
    message: 'We already have your request. Give us a moment to read it.',
  }),
  validateBody(pilotSchema),
  asyncHandler(request),
);

export default pilotRouter;
