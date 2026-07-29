import { Router } from 'express';
import { env } from '../config/env.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { validateBody } from '../middleware/validate.js';
import { asyncHandler } from '../utils/async-handler.js';
import { join, waitlistSchema } from '../controllers/waitlist.controller.js';

export const waitlistRouter = Router();

waitlistRouter.post(
  '/',
  rateLimit({
    name: 'waitlist',
    max: env.RATE_LIMIT.WRITE_MAX,
    message: 'That is a lot of signups from one place. Try again in a few minutes.',
  }),
  validateBody(waitlistSchema),
  asyncHandler(join),
);

export default waitlistRouter;
