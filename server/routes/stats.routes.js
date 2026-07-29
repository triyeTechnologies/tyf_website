import { Router } from 'express';
import { env } from '../config/env.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { asyncHandler } from '../utils/async-handler.js';
import { publicStats } from '../controllers/stats.controller.js';

export const statsRouter = Router();

statsRouter.get('/', rateLimit({ name: 'stats', max: env.RATE_LIMIT.READ_MAX }), asyncHandler(publicStats));

export default statsRouter;
