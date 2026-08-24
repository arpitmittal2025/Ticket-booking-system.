import { Router } from 'express';
import { listEvents, getEvent, createEvent, createShowForEvent, getDashboard } from './events.controller';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';

const router = Router();

router.get('/dashboard', requireAuth, getDashboard);
router.get('/', listEvents);
router.get('/:id', getEvent);
router.post('/', requireAuth, requireRole(['ORGANISER', 'ADMIN']), createEvent);
router.post('/:id/shows', requireAuth, requireRole(['ORGANISER', 'ADMIN']), createShowForEvent);

export default router;
