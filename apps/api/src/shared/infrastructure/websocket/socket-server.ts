import type { Server as HttpServer } from 'node:http';
import { Server as IOServer, type Socket } from 'socket.io';
import type { AppConfig } from '../config';
import type { Logger } from '../logger';
import type { TokenService } from '../security';
import { rooms, WS_EVENTS, type WsEvent } from './events';

interface AuthedSocketData {
  userId: string;
  roles: string[];
}

/**
 * Socket.io gateway. Authenticates each connection with the same access token
 * used for REST, joins the socket to its per-user room, and exposes typed
 * broadcast helpers used by workers/services to push real-time updates.
 */
export class SocketServer {
  private io?: IOServer;

  constructor(
    private readonly config: AppConfig,
    private readonly logger: Logger,
    private readonly tokenService: TokenService,
  ) {}

  attach(httpServer: HttpServer): IOServer {
    const io = new IOServer(httpServer, {
      cors: { origin: this.config.corsOrigins, credentials: true },
      path: '/ws',
    });

    io.use((socket, next) => {
      try {
        const token =
          (socket.handshake.auth?.token as string | undefined) ??
          this.extractBearer(socket.handshake.headers.authorization);
        if (!token) {
          return next(new Error('Unauthorized: missing token'));
        }
        const claims = this.tokenService.verifyAccessToken(token);
        (socket.data as AuthedSocketData) = { userId: claims.sub, roles: claims.roles };
        return next();
      } catch {
        return next(new Error('Unauthorized: invalid token'));
      }
    });

    io.on('connection', (socket) => this.onConnection(socket));
    this.io = io;
    this.logger.info('Socket.io gateway attached at /ws');
    return io;
  }

  private onConnection(socket: Socket): void {
    const { userId } = socket.data as AuthedSocketData;
    void socket.join(rooms.user(userId));
    this.logger.debug({ socketId: socket.id, userId }, 'Socket connected');

    socket.on('subscribe:instrument', (instrumentId: string) => {
      if (typeof instrumentId === 'string' && instrumentId.length > 0) {
        void socket.join(rooms.instrument(instrumentId));
      }
    });
    socket.on('unsubscribe:instrument', (instrumentId: string) => {
      void socket.leave(rooms.instrument(instrumentId));
    });
    socket.on('disconnect', () =>
      this.logger.debug({ socketId: socket.id, userId }, 'Socket disconnected'),
    );
  }

  private extractBearer(header?: string): string | undefined {
    if (!header?.startsWith('Bearer ')) return undefined;
    return header.slice(7);
  }

  emitToUser(userId: string, event: WsEvent, payload: unknown): void {
    this.io?.to(rooms.user(userId)).emit(event, payload);
  }

  emitToInstrument(instrumentId: string, event: WsEvent, payload: unknown): void {
    this.io?.to(rooms.instrument(instrumentId)).emit(event, payload);
  }

  broadcast(event: WsEvent, payload: unknown): void {
    this.io?.emit(event, payload);
  }

  async close(): Promise<void> {
    await this.io?.close();
  }
}

export { WS_EVENTS };
