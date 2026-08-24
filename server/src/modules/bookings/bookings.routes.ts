import { Router } from 'express';
import { createBooking, listBookings, getBooking, cancelBooking } from './bookings.controller';
import { requireAuth } from '../../middleware/auth';

const router = Router();

router.use(requireAuth);

router.post('/', createBooking);
router.get('/', listBookings);
router.get('/:ref', getBooking);
router.post('/:id/cancel', cancelBooking);

export default router;
