import { AppError, ErrorCode } from '../../shared/errors';
import { StatusCodes } from 'http-status-codes';

/** Raised when no provider can satisfy a market-data request. */
export class MarketDataUnavailableError extends AppError {
  constructor(message = 'Market data is temporarily unavailable') {
    super(message, {
      code: ErrorCode.MARKET_DATA_UNAVAILABLE,
      statusCode: StatusCodes.SERVICE_UNAVAILABLE,
    });
  }
}
