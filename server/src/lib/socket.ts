import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';

export class SocketService {
  private static instance: SocketService;
  private io: Server | null = null;

  private constructor() {}

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  public init(server: HttpServer) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:5173',
        methods: ['GET', 'POST']
      }
    });

    this.io.on('connection', (socket: Socket) => {
      // Clients will join a room named 'show:<showId>'
      socket.on('joinShow', (showId: string) => {
        socket.join(`show:${showId}`);
      });

      socket.on('leaveShow', (showId: string) => {
        socket.leave(`show:${showId}`);
      });
    });
  }

  public emitSeatUpdate(showId: string, updates: { seatId: string, status: string }[]) {
    if (this.io) {
      this.io.to(`show:${showId}`).emit('seatUpdate', updates);
    }
  }
}

export const socketService = SocketService.getInstance();
