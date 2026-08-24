import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import authRoutes from './modules/auth/auth.routes';
import venuesRoutes from './modules/venues/venues.routes';
import eventsRoutes from './modules/events/events.routes';
import showsRoutes from './modules/shows/shows.routes';
import holdsRoutes from './modules/holds/holds.routes';
import bookingsRoutes from './modules/bookings/bookings.routes';
import waitlistRoutes from './modules/waitlist/waitlist.routes';
import { errorHandler } from './middleware/errorHandler';

import { startSweeper } from './jobs/sweeper';
import { createServer } from 'http';
import { socketService } from './lib/socket';

const app = express();
const port = process.env.PORT || 4000;

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/venues', venuesRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/shows', showsRoutes);
app.use('/api/holds', holdsRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/offers', waitlistRoutes);

// Error handling
app.use(errorHandler);

// Start jobs
startSweeper();

const server = createServer(app);
socketService.init(server);

server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
