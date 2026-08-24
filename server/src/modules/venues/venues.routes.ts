import { Router } from 'express';
import { createVenue, bulkCreateSeats, listVenues } from './venues.controller';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';

const router = Router();

router.get('/', listVenues);
router.post('/', requireAuth, requireRole(['ADMIN']), createVenue);
router.post('/:id/seats/bulk', requireAuth, requireRole(['ADMIN']), bulkCreateSeats);

export default router;
