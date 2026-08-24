import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/db';
import { AuthenticatedRequest } from '../../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

export async function joinWaitlist(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params; // showId
    const { categoryId, seatsWanted } = req.body;
    
    if (!categoryId) return res.status(400).json({ error: { message: 'categoryId required' } });

    // Check if already in waitlist or offered
    const existing = await prisma.waitlistEntry.findFirst({
      where: {
        showId: id,
        categoryId,
        userId: req.user!.id,
        status: { in: ['WAITING', 'OFFERED'] }
      }
    });

    if (existing) {
      return res.status(409).json({ error: { message: 'You are already on the waitlist for this category' } });
    }

    const entry = await prisma.waitlistEntry.create({
      data: {
        showId: id,
        categoryId,
        userId: req.user!.id,
        seatsWanted: seatsWanted || 1,
        status: 'WAITING'
      }
    });

    res.status(201).json(entry);
  } catch (error) {
    next(error);
  }
}

export async function getOffer(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { token } = req.params;
    const offer = await prisma.waitlistOffer.findUnique({
      where: { token },
      include: {
        showSeat: { include: { seat: true, category: true } },
        waitlistEntry: { include: { show: true } }
      }
    });

    if (!offer || offer.waitlistEntry.userId !== req.user!.id) {
      return res.status(404).json({ error: { message: 'Offer not found' } });
    }

    if (offer.status !== 'PENDING' || offer.expiresAt < new Date()) {
      return res.status(410).json({ error: { message: 'Offer expired or invalid' } });
    }

    res.json({ offer, showSeat: offer.showSeat });
  } catch (error) {
    next(error);
  }
}

export async function acceptOffer(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { token } = req.params;
    
    const result = await prisma.$transaction(async (tx) => {
      const offer = await tx.waitlistOffer.findUnique({
        where: { token }
      });

      if (!offer) throw new Error('OFFER_NOT_FOUND');
      
      const entry = await tx.waitlistEntry.findUnique({ where: { id: offer.waitlistId } });
      if (entry?.userId !== req.user!.id) throw new Error('FORBIDDEN');

      if (offer.status !== 'PENDING' || offer.expiresAt < new Date()) {
         throw new Error('OFFER_EXPIRED');
      }

      // Convert offer to a hold
      const holdId = uuidv4();
      const show = await tx.show.findUnique({ where: { id: entry.showId } });
      const ttlSec = show?.holdTtlSec || 600;

      await tx.showSeat.update({
        where: { id: offer.showSeatId },
        data: {
          status: 'HELD',
          holdId,
          holdExpiresAt: new Date(Date.now() + ttlSec * 1000),
          offerId: null
        }
      });

      await tx.waitlistOffer.update({
        where: { id: offer.id },
        data: { status: 'ACCEPTED' }
      });

      await tx.waitlistEntry.update({
        where: { id: entry.id },
        data: { status: 'CONVERTED' }
      });

      return { holdId, expiresAt: new Date(Date.now() + ttlSec * 1000) };
    });

    res.json(result);
  } catch (error: any) {
    if (error.message === 'OFFER_EXPIRED') return res.status(410).json({ error: { message: 'Offer expired' } });
    if (error.message === 'OFFER_NOT_FOUND') return res.status(404).json({ error: { message: 'Offer not found' } });
    if (error.message === 'FORBIDDEN') return res.status(403).json({ error: { message: 'Forbidden' } });
    next(error);
  }
}
