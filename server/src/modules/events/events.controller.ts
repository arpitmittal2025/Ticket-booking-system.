import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/db';
import { AuthenticatedRequest } from '../../middleware/auth';

export async function listEvents(req: Request, res: Response, next: NextFunction) {
  try {
    const { type, q, from, to } = req.query;

    const where: any = {};
    if (type) where.type = type;
    if (q) where.title = { contains: String(q), mode: 'insensitive' };
    
    if (from || to) {
      where.shows = {
        some: {
          startsAt: {
            ...(from && { gte: new Date(String(from)) }),
            ...(to && { lte: new Date(String(to)) })
          }
        }
      };
    }

    const events = await prisma.event.findMany({
      where,
      include: {
        shows: {
          orderBy: { startsAt: 'asc' },
          where: { status: 'SCHEDULED' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(events);
  } catch (error) {
    next(error);
  }
}

export async function getEvent(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        shows: {
          include: {
            venue: true,
            prices: {
              include: { category: true }
            }
          },
          orderBy: { startsAt: 'asc' }
        },
        organiser: { select: { id: true, name: true } }
      }
    });

    if (!event) {
      return res.status(404).json({ error: { message: 'Event not found' } });
    }

    res.json(event);
  } catch (error) {
    next(error);
  }
}

export async function createEvent(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { title, description, type, language, durationMin, posterUrl } = req.body;
    
    if (!title || !type) {
      return res.status(400).json({ error: { message: 'Missing required fields' } });
    }

    const event = await prisma.event.create({
      data: {
        title,
        description,
        type,
        language,
        durationMin,
        posterUrl,
        organiserId: req.user!.id
      }
    });

    res.status(201).json(event);
  } catch (error) {
    next(error);
  }
}

export async function createShowForEvent(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params; // eventId
    const { venueId, startsAt, prices, holdTtlSec } = req.body;
    
    // prices: [{ categoryId, price }]

    const event = await prisma.event.findUnique({ where: { id } });
    if (!event || event.organiserId !== req.user!.id) {
       return res.status(403).json({ error: { message: 'Forbidden' } });
    }

    const show = await prisma.$transaction(async (tx) => {
      const newShow = await tx.show.create({
        data: {
          eventId: id,
          venueId,
          startsAt: new Date(startsAt),
          holdTtlSec: holdTtlSec || 600,
          prices: {
            create: prices.map((p: any) => ({
              categoryId: p.categoryId,
              price: p.price
            }))
          }
        }
      });

      // Bulk create show_seats
      const seats = await tx.seat.findMany({ where: { venueId } });
      const showSeatsData = seats.map(seat => ({
        showId: newShow.id,
        seatId: seat.id,
        categoryId: seat.categoryId,
        status: 'AVAILABLE' as const
      }));
      
      // Batch insert is faster
      await tx.showSeat.createMany({ data: showSeatsData });

      return newShow;
    });

    res.status(201).json(show);
  } catch (error) {
    next(error);
  }
}

export async function getDashboard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (req.user!.role !== 'ORGANISER' && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: { message: 'Forbidden' } });
    }

    const events = await prisma.event.findMany({
      where: { organiserId: req.user!.id },
      include: {
        shows: {
          include: {
            showSeats: {
              where: { status: 'BOOKED' },
              include: { booking: true }
            }
          }
        }
      }
    });

    let totalRevenue = 0;
    let totalTicketsSold = 0;
    const showStats = [];

    for (const event of events) {
      for (const show of event.shows) {
        const ticketsSold = show.showSeats.length;
        
        const showRevenue = show.showSeats.reduce((acc, ss) => {
          return acc + (ss.booking?.totalAmount ? Number(ss.booking.totalAmount) / show.showSeats.length : 0);
        }, 0);

        totalRevenue += showRevenue;
        totalTicketsSold += ticketsSold;

        showStats.push({
          eventId: event.id,
          eventTitle: event.title,
          showId: show.id,
          startsAt: show.startsAt,
          ticketsSold,
          revenue: showRevenue
        });
      }
    }

    res.json({
      totalRevenue,
      totalTicketsSold,
      showStats,
      events
    });
  } catch (error) {
    next(error);
  }
}
