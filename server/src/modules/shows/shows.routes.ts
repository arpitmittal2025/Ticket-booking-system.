import { Router } from 'express';
import { getSeatMap } from './shows.controller';
import { createHold } from '../holds/holds.controller';
import { joinWaitlist } from '../waitlist/waitlist.controller';
import { requireAuth } from '../../middleware/auth';

const router = Router();

router.get('/:id/seatmap', getSeatMap);
router.post('/:id/holds', requireAuth, createHold);
router.post('/:id/waitlist', requireAuth, joinWaitlist);

export default router;
