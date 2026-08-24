import cron from 'node-cron';
import { prisma } from '../lib/db';
import { offerNextInLine } from '../modules/waitlist/waitlist.service';
import { socketService } from '../lib/socket';

export function startSweeper() {
  const interval = process.env.SWEEPER_INTERVAL_SECONDS || '30';
  
  cron.schedule(`*/${interval} * * * * *`, async () => {
    try {
      // 1. Find expired holds
      const expiredHolds = await prisma.showSeat.findMany({
        where: {
          status: 'HELD',
          holdExpiresAt: { lt: new Date() }
        }
      });

      if (expiredHolds.length > 0) {
        // Release them
        await prisma.showSeat.updateMany({
          where: { id: { in: expiredHolds.map(s => s.id) } },
          data: { status: 'AVAILABLE', holdId: null, holdExpiresAt: null }
        });
        console.log(`[Sweeper] Released ${expiredHolds.length} expired holds`);

        // Group by showId to emit correctly
        const byShow = expiredHolds.reduce((acc, seat) => {
          if (!acc[seat.showId]) acc[seat.showId] = [];
          acc[seat.showId].push(seat.seatId);
          return acc;
        }, {} as Record<string, string[]>);

        for (const [showId, seatIds] of Object.entries(byShow)) {
          socketService.emitSeatUpdate(showId, seatIds.map(id => ({ seatId: id, status: 'AVAILABLE' })));
        }

        // Trigger waitlist offers for the released seats
        for (const seat of expiredHolds) {
          offerNextInLine(seat.showId, seat.categoryId, seat.id).catch(console.error);
        }
      }

      // 2. Find expired waitlist offers
      const expiredOffers = await prisma.waitlistOffer.findMany({
        where: {
          status: 'PENDING',
          expiresAt: { lt: new Date() }
        },
        include: { showSeat: true, waitlistEntry: true }
      });

      if (expiredOffers.length > 0) {
        // Mark offers as expired
        await prisma.waitlistOffer.updateMany({
          where: { id: { in: expiredOffers.map(o => o.id) } },
          data: { status: 'EXPIRED' }
        });
        // Mark waitlist entries as expired (they missed their chance)
        await prisma.waitlistEntry.updateMany({
          where: { id: { in: expiredOffers.map(o => o.waitlistId) } },
          data: { status: 'EXPIRED' }
        });
        // Mark seats as AVAILABLE temporarily
        await prisma.showSeat.updateMany({
          where: { id: { in: expiredOffers.map(o => o.showSeatId) } },
          data: { status: 'AVAILABLE', offerId: null }
        });

        console.log(`[Sweeper] Expired ${expiredOffers.length} waitlist offers`);

        // Emit AVAILABLE for expired offers (before offerNextInLine re-assigns them)
        const byShowOffers = expiredOffers.reduce((acc, offer) => {
          const showId = offer.waitlistEntry.showId;
          if (!acc[showId]) acc[showId] = [];
          acc[showId].push(offer.showSeat.seatId);
          return acc;
        }, {} as Record<string, string[]>);
        
        for (const [showId, seatIds] of Object.entries(byShowOffers)) {
          socketService.emitSeatUpdate(showId, seatIds.map(id => ({ seatId: id, status: 'AVAILABLE' })));
        }

        // Trigger next person in line
        for (const offer of expiredOffers) {
          offerNextInLine(offer.waitlistEntry.showId, offer.showSeat.categoryId, offer.showSeat.id).catch(console.error);
        }
      }
      
    } catch (error) {
      console.error('[Sweeper Error]', error);
    }
  });

  console.log(`[Sweeper] Started with interval ${interval}s`);
}
