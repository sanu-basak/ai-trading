import { z } from 'zod';

/**
 * Environment schema. Parsed once at startup; the process fails fast with a
 * readable message if required variables are missing or malformed.
 */
const booleanFromString = z
  .string()
  .transform((v) => v === 'true' || v === '1')
  .pipe(z.boolean());

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  API_BASE_URL: z.string().url().default('http://localhost:4000'),
  WEB_BASE_URL: z.string().url().default('http://localhost:5173'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Redis
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),

  // Auth
  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET must be at least 16 chars'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 chars'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),
  ENCRYPTION_KEY: z
    .string()
    .min(32, 'ENCRYPTION_KEY must be a 32-byte key (base64 or hex encoded)'),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),

  // CORS
  CORS_ORIGINS: z.string().default('http://localhost:5173'),

  // AI service
  AI_ENGINE_URL: z.string().url().default('http://localhost:8000'),

  // LLM providers (optional at boot; validated at feature use)
  ANTHROPIC_API_KEY: z.string().optional().default(''),
  OPENAI_API_KEY: z.string().optional().default(''),
  LLM_MODEL: z.string().optional().default('claude-sonnet-5'),
  LLM_MAX_TOKENS: z.coerce.number().int().positive().default(1024),

  // Payments
  RAZORPAY_KEY_ID: z.string().optional().default(''),
  RAZORPAY_KEY_SECRET: z.string().optional().default(''),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional().default(''),

  // Notifications
  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: z.coerce.number().int().optional().default(587),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASSWORD: z.string().optional().default(''),
  SMTP_FROM: z.string().optional().default('DEVQUANTIC <no-reply@devquantic.ai>'),
  TELEGRAM_BOT_TOKEN: z.string().optional().default(''),

  // Web push
  VAPID_PUBLIC_KEY: z.string().optional().default(''),
  VAPID_PRIVATE_KEY: z.string().optional().default(''),
  VAPID_SUBJECT: z.string().optional().default('mailto:ops@devquantic.ai'),

  // Observability
  METRICS_ENABLED: booleanFromString.default('true'),
  SWAGGER_ENABLED: booleanFromString.default('true'),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    // Thrown before the logger exists — surfaced directly to stderr by the bootstrap.
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}
