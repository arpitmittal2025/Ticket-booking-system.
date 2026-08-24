import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/db';
import { AuthenticatedRequest } from '../../middleware/auth';
import { v4 as uuidv4 } from 'uuid';
import { socketService } from '../../lib/socket';

export async function createHold(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { id: showId } = req.params;
    let { seatIds } = req.body;

    if (!seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
      return res.status(400).json({ error: { message: 'Must provide an array of seatIds' } });
    }

    // Sort seatIds to avoid deadlocks
    seatIds = seatIds.sort();

    const show = await prisma.show.findUnique({ where: { id: showId } });
    if (!show) {
      return res.status(404).json({ error: { message: 'Show not found' } });
    }

    const holdId = uuidv4();
    const ttlSec = show.holdTtlSec;

    try {
      await prisma.$transaction(async (tx) => {
        const seatsToUpdate = await tx.showSeat.findMany({
          where: {
            showId,
            seatId: { in: seatIds },
            OR: [
              { status: 'AVAILABLE' },
              { status: 'HELD', holdExpiresAt: { lt: new Date() } }
            ]
          }
        });

        if (seatsToUpdate.length !== seatIds.length) {
          const updatedSeatIds = seatsToUpdate.map(u => u.seatId);
          const taken = seatIds.filter(s => !updatedSeatIds.includes(s));
          const err = new Error('SEATS_UNAVAILABLE');
          (err as any).code = 'SEATS_UNAVAILABLE';
          (err as any).taken = taken;
          throw err;
        }

        await tx.showSeat.updateMany({
          where: { id: { in: seatsToUpdate.map(s => s.id) } },
          data: {
            status: 'HELD',
            holdId,
            holdExpiresAt: new Date(Date.now() + ttlSec * 1000)
          }
        });

        const updated = seatsToUpdate;
      });
      
      // Calculate expiresAt for frontend
      const expiresAt = new Date(Date.now() + ttlSec * 1000);
      
      // Emit socket event
      socketService.emitSeatUpdate(showId, seatIds.map(seatId => ({
        seatId,
        status: 'HELD'
      })));

      res.status(201).json({ holdId, expiresAt });
    } catch (err: any) {
      if (err.code === 'SEATS_UNAVAILABLE') {
        return res.status(409).json({
          error: {
            code: 'SEATS_UNAVAILABLE',
            message: 'Some of the requested seats are not available.',
            details: { taken: err.taken }
          }
        });
      }
      throw err;
    }
  } catch (error) {
    next(error);
  }
}

export async function releaseHold(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { holdId } = req.params;

    // Find the seats first so we know which ones to update and the showId
    const seats = await prisma.showSeat.findMany({ where: { holdId, status: 'HELD' } });
    if (seats.length === 0) {
      return res.json({ message: 'No active holds to release', releasedCount: 0 });
    }

    const showId = seats[0].showId;

    // Only release if they are currently held by this holdId (and implicitly not booked)
    const result = await prisma.showSeat.updateMany({
      where: {
        holdId,
        status: 'HELD'
      },
      data: {
        status: 'AVAILABLE',
        holdId: null,
        holdExpiresAt: null
      }
    });

    socketService.emitSeatUpdate(showId, seats.map(s => ({
      seatId: s.seatId,
      status: 'AVAILABLE'
    })));

    res.json({ message: 'Hold released', releasedCount: result.count });
  } catch (error) {
    next(error);
  }
}
