import { Router } from 'express';
import { releaseHold } from './holds.controller';
import { requireAuth } from '../../middleware/auth';

const router = Router();

router.delete('/:holdId', requireAuth, releaseHold);

export default router;
