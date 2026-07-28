import { StatusCodes } from 'http-status-codes';
import { ErrorCode } from './error-codes';

export interface AppErrorOptions {
  code?: ErrorCode;
  statusCode?: number;
  /** Machine-readable field-level or contextual details, safe to expose. */
  details?: unknown;
  /** Whether this is an expected/operational error (vs. a programmer bug). */
  isOperational?: boolean;
  /** Underlying cause for logging (never serialized to clients). */
  cause?: unknown;
}

/**
 * Base application error. All thrown errors that reach the HTTP boundary are
 * normalized to an {@link AppError} by the error-handling middleware.
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly details?: unknown;
  readonly isOperational: boolean;
  override readonly cause?: unknown;

  constructor(message: string, options: AppErrorOptions = {}) {
    super(message);
    this.name = new.target.name;
    this.code = options.code ?? ErrorCode.INTERNAL_ERROR;
    this.statusCode = options.statusCode ?? StatusCodes.INTERNAL_SERVER_ERROR;
    this.details = options.details;
    this.isOperational = options.isOperational ?? true;
    this.cause = options.cause;
    Error.captureStackTrace?.(this, new.target);
  }

  /** Serializable, client-safe representation (no stack, no cause). */
  toJSON(): Record<string, unknown> {
    return {
      code: this.code,
      message: this.message,
      ...(this.details !== undefined ? { details: this.details } : {}),
    };
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details?: unknown) {
    super(message, {
      code: ErrorCode.VALIDATION_ERROR,
      statusCode: StatusCodes.UNPROCESSABLE_ENTITY,
      details,
    });
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', details?: unknown) {
    super(message, { code: ErrorCode.BAD_REQUEST, statusCode: StatusCodes.BAD_REQUEST, details });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required', code: ErrorCode = ErrorCode.UNAUTHENTICATED) {
    super(message, { code, statusCode: StatusCodes.UNAUTHORIZED });
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action') {
    super(message, { code: ErrorCode.FORBIDDEN, statusCode: StatusCodes.FORBIDDEN });
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource', message?: string) {
    super(message ?? `${resource} not found`, {
      code: ErrorCode.NOT_FOUND,
      statusCode: StatusCodes.NOT_FOUND,
    });
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict', details?: unknown) {
    super(message, { code: ErrorCode.CONFLICT, statusCode: StatusCodes.CONFLICT, details });
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests', retryAfterSeconds?: number) {
    super(message, {
      code: ErrorCode.RATE_LIMITED,
      statusCode: StatusCodes.TOO_MANY_REQUESTS,
      details: retryAfterSeconds !== undefined ? { retryAfterSeconds } : undefined,
    });
  }
}

/** A violated business invariant (expected, surfaced to the caller). */
export class DomainError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, {
      code: ErrorCode.DOMAIN_RULE_VIOLATION,
      statusCode: StatusCodes.UNPROCESSABLE_ENTITY,
      details,
    });
  }
}

export class QuotaExceededError extends AppError {
  constructor(message = 'Plan quota exceeded', details?: unknown) {
    super(message, {
      code: ErrorCode.QUOTA_EXCEEDED,
      statusCode: StatusCodes.FORBIDDEN,
      details,
    });
  }
}

export class SubscriptionRequiredError extends AppError {
  constructor(message = 'An active subscription is required for this feature') {
    super(message, {
      code: ErrorCode.SUBSCRIPTION_REQUIRED,
      statusCode: StatusCodes.PAYMENT_REQUIRED,
    });
  }
}

/** A failure in a downstream/external dependency. */
export class UpstreamError extends AppError {
  constructor(message = 'Upstream service error', options: AppErrorOptions = {}) {
    super(message, {
      code: ErrorCode.UPSTREAM_ERROR,
      statusCode: StatusCodes.BAD_GATEWAY,
      ...options,
    });
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = 'Service temporarily unavailable', code = ErrorCode.SERVICE_UNAVAILABLE) {
    super(message, { code, statusCode: StatusCodes.SERVICE_UNAVAILABLE });
  }
}

/** An unexpected internal error (programmer bug / unhandled condition). */
export class InternalError extends AppError {
  constructor(message = 'An unexpected error occurred', cause?: unknown) {
    super(message, {
      code: ErrorCode.INTERNAL_ERROR,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      isOperational: false,
      cause,
    });
  }
}

/** Type guard for {@link AppError}. */
export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}
