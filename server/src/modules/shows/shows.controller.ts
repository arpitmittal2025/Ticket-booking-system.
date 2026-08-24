import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/db';

export async function getSeatMap(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const show = await prisma.show.findUnique({
      where: { id },
      include: {
        venue: {
          include: {
            categories: true
          }
        },
        prices: true,
      }
    });

    if (!show) {
      return res.status(404).json({ error: { message: 'Show not found' } });
    }

    // Get all seats for this show
    const seats = await prisma.showSeat.findMany({
      where: { showId: id },
      include: {
        seat: true
      }
    });

    // We want to transform the seats into a grid structure or just return the flat array 
    // and let the frontend CSS grid handle it (which is usually easier if we pass row/col indices).
    // The frontend uses row_index and col_index for grid-row and grid-column.

    res.json({
      show: {
        id: show.id,
        startsAt: show.startsAt,
        status: show.status,
      },
      venue: {
        id: show.venue.id,
        name: show.venue.name,
        rows: show.venue.rows,
        cols: show.venue.cols,
      },
      categories: show.venue.categories.map(c => {
        const priceObj = show.prices.find(p => p.categoryId === c.id);
        return {
          id: c.id,
          name: c.name,
          color: c.color,
          price: priceObj ? priceObj.price : null
        };
      }),
      seats: seats.map(ss => ({
        showSeatId: ss.id,
        seatId: ss.seat.id,
        categoryId: ss.categoryId,
        rowLabel: ss.seat.rowLabel,
        seatNumber: ss.seat.seatNumber,
        rowIndex: ss.seat.rowIndex,
        colIndex: ss.seat.colIndex,
        isAisle: ss.seat.isAisle,
        status: ss.status, // AVAILABLE | HELD | BOOKED | OFFERED
        // For lazy expiry evaluation on frontend (optional, though frontend shouldn't trust it fully)
        holdExpiresAt: ss.holdExpiresAt
      }))
    });

  } catch (error) {
    next(error);
  }
}
