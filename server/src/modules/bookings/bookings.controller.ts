import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/db';
import { AuthenticatedRequest } from '../../middleware/auth';
import { generateTicketQR } from '../../lib/qr';
import { sendBookingConfirmation } from '../../lib/mailer';
import jwt from 'jsonwebtoken';
import { offerNextInLine } from '../waitlist/waitlist.service';

function generateReference() {
  return 'BK-' + Math.random().toString(36).substring(2, 10).toUpperCase();
}

export async function createBooking(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { holdId } = req.body;
    if (!holdId) {
      return res.status(400).json({ error: { message: 'holdId is required' } });
    }

    // Wrap in transaction
    const transactionResult = await prisma.$transaction(async (tx) => {
      // Find held seats
      const heldSeats = await tx.showSeat.findMany({
        where: { holdId, status: 'HELD' },
        include: { show: true, category: { include: { showPrices: true } } }
      });

      if (heldSeats.length === 0) {
        throw new Error('HOLD_EXPIRED');
      }

      // Check if expired
      if (heldSeats[0].holdExpiresAt && heldSeats[0].holdExpiresAt < new Date()) {
        throw new Error('HOLD_EXPIRED');
      }

      const showId = heldSeats[0].showId;
      const reference = generateReference();
      let totalAmount = 0;

      // Calculate price and create bookingSeats payload
      const bookingSeatsData = heldSeats.map(seat => {
        const priceRecord = seat.category.showPrices.find(p => p.showId === showId);
        const price = priceRecord ? Number(priceRecord.price) : 0;
        totalAmount += price;
        return { showSeatId: seat.id, pricePaid: price };
      });

      // Generate QR payload token
      const qrPayload = jwt.sign({ ref: reference, showId, seats: heldSeats.map(s => s.seatId) }, process.env.QR_SECRET || 'qrsecret', { noTimestamp: true });

      // Create Booking
      const newBooking = await tx.booking.create({
        data: {
          reference,
          userId: req.user!.id,
          showId,
          totalAmount,
          status: 'CONFIRMED',
          qrPayload,
          bookingSeats: {
            create: bookingSeatsData
          }
        },
        include: { user: true, bookingSeats: true }
      });

      // Update ShowSeats to BOOKED
      await tx.showSeat.updateMany({
        where: { holdId, status: 'HELD' },
        data: {
          status: 'BOOKED',
          holdId: null,
          holdExpiresAt: null,
          bookingId: newBooking.id
        }
      });

      return { newBooking, seatIds: heldSeats.map(s => s.seatId) };
    });

    const booking = transactionResult.newBooking;

    // Fire email outside of transaction
    const qrPng = await generateTicketQR(booking.reference, booking.showId, booking.bookingSeats.map(b => b.showSeatId));
    sendBookingConfirmation(booking.user.email, booking.reference, qrPng).catch(console.error);

    // Emit socket event
    import('../../lib/socket').then(({ socketService }) => {
      socketService.emitSeatUpdate(booking.showId, transactionResult.seatIds.map(id => ({
        seatId: id,
        status: 'BOOKED'
      })));
    });

    res.status(201).json(booking);
  } catch (error: any) {
    if (error.message === 'HOLD_EXPIRED') {
      return res.status(410).json({ error: { code: 'HOLD_EXPIRED', message: 'Hold session expired or invalid' } });
    }
    next(error);
  }
}

export async function listBookings(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const bookings = await prisma.booking.findMany({
      where: { userId: req.user!.id },
      include: {
        show: { include: { event: true, venue: true } },
        bookingSeats: { include: { showSeat: { include: { seat: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(bookings);
  } catch (error) {
    next(error);
  }
}

export async function getBooking(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { ref } = req.params;
    const booking = await prisma.booking.findUnique({
      where: { reference: ref },
      include: {
        show: { include: { event: true, venue: true } },
        bookingSeats: { include: { showSeat: { include: { seat: true } } } }
      }
    });

    if (!booking) return res.status(404).json({ error: { message: 'Booking not found' } });
    if (booking.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: { message: 'Forbidden' } });
    }

    res.json(booking);
  } catch (error) {
    next(error);
  }
}

export async function cancelBooking(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { showSeats: true }
    });

    if (!booking) return res.status(404).json({ error: { message: 'Booking not found' } });
    if (booking.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: { message: 'Forbidden' } });
    }
    if (booking.status === 'CANCELLED') {
      return res.status(400).json({ error: { message: 'Already cancelled' } });
    }

    await prisma.$transaction(async (tx) => {
      // Cancel booking
      await tx.booking.update({
        where: { id },
        data: { status: 'CANCELLED', cancelledAt: new Date() }
      });

      // Release seats
      await tx.showSeat.updateMany({
        where: { bookingId: id },
        data: { status: 'AVAILABLE', bookingId: null }
      });
    });

    // Enqueue waitlist logic for released seats
    const showId = booking.showSeats.length > 0 ? booking.showSeats[0].showId : null;
    
    if (showId) {
      import('../../lib/socket').then(({ socketService }) => {
        socketService.emitSeatUpdate(showId, booking.showSeats.map(s => ({
          seatId: s.seatId,
          status: 'AVAILABLE'
        })));
      });
    }

    for (const showSeat of booking.showSeats) {
      offerNextInLine(showSeat.showId, showSeat.categoryId, showSeat.id).catch(console.error);
    }

    res.json({ message: 'Booking cancelled successfully' });
  } catch (error) {
    next(error);
  }
}
