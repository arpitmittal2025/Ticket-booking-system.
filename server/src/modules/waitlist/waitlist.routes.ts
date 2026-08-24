import { Router } from 'express';
import { getOffer, acceptOffer } from './waitlist.controller';
import { requireAuth } from '../../middleware/auth';

const router = Router();

router.get('/:token', requireAuth, getOffer);
router.post('/:token/accept', requireAuth, acceptOffer);

export default router;
