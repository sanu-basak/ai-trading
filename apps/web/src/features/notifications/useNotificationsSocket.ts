import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { config } from '@/lib/config';
import { useAuthStore } from '@/stores/auth.store';

/**
 * Opens the authenticated Socket.io connection while signed in and refreshes
 * the notification queries in real time when the server pushes an event.
 * Mounted once in the app shell.
 */
export function useNotificationsSocket(): void {
  const token = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();

  useEffect(() => {
    if (!token) return;

    const socket = io(config.wsUrl, {
      path: '/ws',
      auth: { token },
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });

    const refresh = (): void => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-unread'] });
    };
    socket.on('notification', refresh);
    socket.on('alert:triggered', refresh);
    socket.on('signal:created', () => qc.invalidateQueries({ queryKey: ['signals'] }));

    return () => {
      socket.off('notification', refresh);
      socket.off('alert:triggered', refresh);
      socket.disconnect();
    };
  }, [token, qc]);
}
