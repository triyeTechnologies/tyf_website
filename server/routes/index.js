/**
 * The public API surface, versioned so the widget and any future SDK can pin.
 *
 *   GET  /api/v1/health    liveness
 *   GET  /api/v1/stats     live waitlist counter for the hero
 *   POST /api/v1/waitlist  email capture
 *   POST /api/v1/pilot     business / retail enquiry
 */
import { Router } from 'express';
import { healthRouter } from './health.routes.js';
import { statsRouter } from './stats.routes.js';
import { waitlistRouter } from './waitlist.routes.js';
import { pilotRouter } from './pilot.routes.js';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/stats', statsRouter);
apiRouter.use('/waitlist', waitlistRouter);
apiRouter.use('/pilot', pilotRouter);

export default apiRouter;
