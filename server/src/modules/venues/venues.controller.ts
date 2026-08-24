import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/db';

export async function createVenue(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, address, rows, cols, categories } = req.body;
    
    if (!name || !rows || !cols || !categories || !Array.isArray(categories)) {
      return res.status(400).json({ error: { message: 'Missing required fields' } });
    }

    const venue = await prisma.venue.create({
      data: {
        name,
        address,
        rows,
        cols,
        categories: {
          create: categories.map((c: any) => ({
            name: c.name,
            color: c.color
          }))
        }
      },
      include: {
        categories: true
      }
    });

    res.status(201).json(venue);
  } catch (error) {
    next(error);
  }
}

export async function bulkCreateSeats(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { seats } = req.body; // array of { rowLabel, seatNumber, rowIndex, colIndex, isAisle, categoryId }

    if (!seats || !Array.isArray(seats)) {
      return res.status(400).json({ error: { message: 'Invalid seats payload' } });
    }

    const venue = await prisma.venue.findUnique({ where: { id } });
    if (!venue) {
      return res.status(404).json({ error: { message: 'Venue not found' } });
    }

    // Add venueId to all seats
    const data = seats.map((s: any) => ({
      venueId: id,
      categoryId: s.categoryId,
      rowLabel: s.rowLabel,
      seatNumber: s.seatNumber,
      rowIndex: s.rowIndex,
      colIndex: s.colIndex,
      isAisle: s.isAisle || false
    }));

    await prisma.seat.createMany({ data });

    res.status(201).json({ message: 'Seats generated successfully', count: data.length });
  } catch (error) {
    next(error);
  }
}

export async function listVenues(req: Request, res: Response, next: NextFunction) {
  try {
    const venues = await prisma.venue.findMany({
      include: {
        categories: true,
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(venues);
  } catch (error) {
    next(error);
  }
}
