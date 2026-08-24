# Ticket Booking System - System Design

## Architecture Overview
The system is built as a monolithic Node.js/Express backend communicating with a React/Vite frontend. It uses PostgreSQL as the primary datastore, leveraging its transactional guarantees for concurrency control.

## Database Schema Highlights
- **Venue & Seats:** Venues define grids (`rows` x `cols`). The `Seat` table maps physical coordinates.
- **Shows & ShowSeats:** When a Show is scheduled at a Venue, `ShowSeat` records are generated for every physical seat. `ShowSeat` is the atomic unit of booking.
- **Holds & Bookings:** `ShowSeat` transitions through statuses: `AVAILABLE` -> `HELD` -> `BOOKED`.

## Concurrency Strategy
The most critical part of a ticketing system is preventing double-booking. We handle this exclusively in Postgres without needing Redis locks:
1. **Atomic Holds:** The `POST /holds` endpoint uses a single `UPDATE ... RETURNING` query inside a transaction.
2. **Lock Avoidance:** We don't lock rows for read. We use optimistic/conditional updates (`WHERE status = 'AVAILABLE'`).
3. **Deadlock Prevention:** Before issuing the conditional update on multiple seats, we lexically sort the `seatIds` so all concurrent transactions lock the rows in the exact same order.
4. **Lazy Expiry:** We allow holds to specify a TTL. If a hold expires, the `UPDATE` query treats it as `AVAILABLE` (`holdExpiresAt < NOW()`).

## Background Workers
A standard `node-cron` job (the "Sweeper") runs every 30 seconds to:
1. Sweep expired holds and release them back to the pool.
2. Expire pending waitlist offers.

## Waitlist Auto-Assignment
For sold-out shows, users can join a category waitlist.
When a booking is cancelled or a hold expires, we use Postgres's `SELECT ... FOR UPDATE SKIP LOCKED` to find the exact next person in line. This skips any rows currently being locked by other concurrent cancellations, preventing queue processing deadlocks, and emails them a secure, time-limited token to claim the seat.

## Realtime Updates
Socket.IO is used to push `seatUpdate` events to all connected clients in a specific `show:<id>` room whenever a seat's status changes in the database.
