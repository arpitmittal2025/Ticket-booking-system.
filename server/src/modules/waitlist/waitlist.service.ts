import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/db';
import { sendWaitlistOffer } from '../../lib/mailer';
import crypto from 'crypto';
import { socketService } from '../../lib/socket';

export async function offerNextInLine(showId: string, categoryId: string, showSeatId: string) {
  try {
    const offerTtlSec = parseInt(process.env.WAITLIST_OFFER_TTL_SECONDS || '1800', 10);
    
    // We use a transaction because we need to lock the waitlist entry
    const result = await prisma.$transaction(async (tx) => {
      // Find the next in line
      const entry = await tx.waitlistEntry.findFirst({
        where: {
          showId,
          categoryId,
          status: 'WAITING'
        },
        orderBy: { createdAt: 'asc' }
      });

      if (!entry) {
        return null; // no one waiting
      }

      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + offerTtlSec * 1000);

      // Create offer
      const offer = await tx.waitlistOffer.create({
        data: {
          waitlistId: entry.id,
          showSeatId,
          token,
          expiresAt,
          status: 'PENDING'
        }
      });

      // Update waitlist entry to OFFERED
      await tx.waitlistEntry.update({
        where: { id: entry.id },
        data: { status: 'OFFERED' }
      });

      // Update seat to OFFERED
      await tx.showSeat.update({
        where: { id: showSeatId },
        data: { status: 'OFFERED', offerId: offer.id }
      });

      return { offer, userId: entry.userId };
    });

    if (result) {
      // Fetch user email to send offer
      const user = await prisma.user.findUnique({ where: { id: result.userId } });
      if (user) {
        sendWaitlistOffer(user.email, result.offer.token).catch(console.error);
      }
      
      // Emit socket event
      socketService.emitSeatUpdate(showId, [{ seatId: showSeatId, status: 'OFFERED' }]);
    }

    return result;
  } catch (error) {
    console.error('[offerNextInLine] Error:', error);
    return null;
  }
}
