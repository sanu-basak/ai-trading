import pino, { type Logger as PinoLogger } from 'pino';
import type { AppConfig } from '../config';

export type Logger = PinoLogger;

/**
 * Structured logger (pino). In development it pretty-prints; in production it
 * emits newline-delimited JSON suitable for log shippers. Sensitive fields are
 * redacted at the logger level as a defense-in-depth measure.
 */
export function createLogger(config: AppConfig): Logger {
  const redactPaths = [
    'req.headers.authorization',
    'req.headers.cookie',
    'password',
    'passwordHash',
    '*.password',
    '*.passwordHash',
    'accessToken',
    'refreshToken',
    'token',
    'secret',
    '*.secret',
    'ENCRYPTION_KEY',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
  ];

  return pino({
    level: config.env.LOG_LEVEL,
    base: { service: 'devquantic-api', env: config.env.NODE_ENV },
    redact: { paths: redactPaths, censor: '[REDACTED]' },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => ({ level: label }),
    },
    transport: config.isProduction
      ? undefined
      : {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:HH:MM:ss.l', ignore: 'pid,hostname' },
        },
  });
}
