/** Server → client event names emitted over Socket.io. */
export const WS_EVENTS = {
  QUOTE_UPDATE: 'quote:update',
  SIGNAL_CREATED: 'signal:created',
  ALERT_TRIGGERED: 'alert:triggered',
  SCAN_COMPLETED: 'scan:completed',
  BACKTEST_PROGRESS: 'backtest:progress',
  NOTIFICATION: 'notification',
  PAPER_ORDER_UPDATE: 'paper:order:update',
} as const;

export type WsEvent = (typeof WS_EVENTS)[keyof typeof WS_EVENTS];

/** Room helpers — rooms scope broadcasts to a user or an instrument feed. */
export const rooms = {
  user: (userId: string): string => `user:${userId}`,
  instrument: (instrumentId: string): string => `instrument:${instrumentId}`,
};
